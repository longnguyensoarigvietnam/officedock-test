from datetime import datetime, timedelta, time

from django.db import transaction
from rest_framework.exceptions import ValidationError

from chat.constants import WebSocketEventType
from common.utils import (
    send_web_socket_event,
    time_str_to_timedelta,
    format_duration,
)
from organizations.models import (
    OrganizationsStatisticCategories,
    OrganizationsStatisticCategoriesSkills,
)
from skills.constants import DEFAULT_TIME
from skills.models import SkillMap, SkillMapSkillLevel
from tasks.constants import (
    DatetimeUnitTypes,
    TaskStatus,
    CalculateSkillMapProcessCases,
)
from tasks.models import Task, TaskSchedule, TodoList, TaskDuration
from tasks.serializers import TaskScheduleSerializer, TodoListSerializer
from calendars.models import Schedule
from users.models import User


def split_date_range(plan_start_date, plan_end_date):
    """
    Split a time range into multiple day segments.
    """
    time_ranges = []

    if plan_start_date.date() != plan_end_date.date():
        # Handle the first day (from plan_start_date to end of that day)
        current_end_date = datetime.combine(
            plan_start_date.date(), time.max
        )  # 23:59:59 on the same day
        time_ranges.append((plan_start_date, current_end_date))

        # Loop through the middle days
        next_day = plan_start_date.date() + timedelta(days=1)
        while next_day < plan_end_date.date():
            start_of_day = datetime.combine(
                next_day, time.min
            )  # 00:00:00 on the next day
            end_of_day = datetime.combine(
                next_day, time.max
            )  # 23:59:59 on the same day
            time_ranges.append((start_of_day, end_of_day))
            next_day += timedelta(days=1)

        # Handle the last day (from 00:00:00 to plan_end_date)
        start_of_last_day = datetime.combine(
            plan_end_date.date(), time.min
        )  # 00:00:00 on the last day
        time_ranges.append((start_of_last_day, plan_end_date))
    else:
        # If the start and end date are the same day
        time_ranges.append((plan_start_date, plan_end_date))

    return time_ranges


def create_task_schedule(task: Task, schedule_data):
    """
    Create a new task schedule.
    """
    schedule_serializer = TaskScheduleSerializer(data=schedule_data)
    schedule_serializer.is_valid(raise_exception=True)
    plan_start_date = schedule_data.get("plan_start_date")
    plan_end_date = schedule_data.get("plan_end_date")

    # Loop over the time segments and create TaskSchedule for each
    time_segments = split_date_range(plan_start_date, plan_end_date)
    for start_time, end_time in time_segments:
        TaskSchedule.objects.create(
            task=task,
            plan_start_date=start_time,
            plan_end_date=end_time,
        )


def update_task_schedule(schedule: Schedule, schedule_data):
    """
    Update an existing task schedule.
    """
    task = schedule.task
    plan_start_date = schedule_data.get("plan_start_date")
    plan_end_date = schedule_data.get("plan_end_date")

    # Split the date range into time segments
    time_segments = split_date_range(plan_start_date, plan_end_date)

    if not time_segments:
        return  # No time segments, nothing to update

    # Pop the first time segment
    first_start_time, first_end_time = time_segments.pop(0)

    # Update the existing schedule with the first time segment
    schedule.plan_start_date = first_start_time
    schedule.plan_end_date = first_end_time
    schedule.save()

    # Create new schedules for remaining time segments
    for start_time, end_time in time_segments:
        TaskSchedule.objects.create(
            task=task,
            plan_start_date=start_time,
            plan_end_date=end_time,
        )


def delete_task_schedules(schedule_ids):
    """
    Delete task schedules based on the given schedule_ids.
    """
    TaskSchedule.objects.filter(id__in=schedule_ids).delete()


def create_todo_list_for_task(current_user: User, task: Task, todo_data):
    """
    Create a new todo list for the task.
    """
    todo_serializer = TodoListSerializer(data=todo_data)
    if todo_serializer.is_valid(raise_exception=True):
        todo_serializer.save(
            task=task,
            company=task.company,
            created_by=current_user,
        )


def update_todo_list_for_task(todo_list: TodoList, todo_data):
    """
    Update an existing todo list for the task.
    """
    todo_serializer = TodoListSerializer(instance=todo_list, data=todo_data)
    if todo_serializer.is_valid(raise_exception=True):
        todo_serializer.save()


def delete_todo_list_for_task(todo_list_ids):
    """
    Delete todo lists based on the given todo_list_ids.
    """
    TodoList.objects.filter(id__in=todo_list_ids).delete()


def calculate_new_time(start_time, delta_value, delta_unit):
    """
    Calculate new datetime from duration string
    """
    delta = None
    if delta_unit == DatetimeUnitTypes.HOURS.value:
        delta = timedelta(hours=delta_value)
    elif delta_unit == DatetimeUnitTypes.DAY.value:
        delta = timedelta(days=delta_value)
    elif delta_unit == DatetimeUnitTypes.WEEK.value:
        delta = timedelta(weeks=delta_value)

    # Calculate new time
    return start_time - delta


@transaction.atomic()
def calculate_progress_skill_map(
    task,
    user,
    duration_time: timedelta = None,
    is_minus=False,
    case=None,
    duration_created_at=None,
    organization=None,
    is_plus=True,
):
    """
    Handle calculate progress skill map by task
    """
    if not task or not case:
        return
    task_categories = task.categories.first()
    if not task_categories:
        return
    organization = organization if organization else task.organization
    # Get Organization categories
    org_categories = OrganizationsStatisticCategories.objects.filter(
        large_statistic_category=task_categories.large_statistic_category,
        medium_statistic_category=task_categories.medium_statistic_category,
        small_statistic_category=task_categories.small_statistic_category,
        organization=organization,
    ).values_list("id", flat=True)
    # Get Skill have categories
    org_cat_skills = (
        OrganizationsStatisticCategoriesSkills.objects.filter(
            organization_statistic_category_id__in=org_categories
        )
        .values_list("skill", flat=True)
        .distinct()
    )
    for skill in org_cat_skills:
        skill_map = SkillMap.objects.filter(
            skill_id=skill,
            organization=organization,
            staff=user,
            skill_map_skill_levels__is_complete=False,
            is_complete=False,
            is_valid=True,
        ).first()
        if skill_map:
            if (
                duration_created_at
                and duration_created_at < skill_map.created_at
            ):
                continue
            current_skill_level = skill_map.skill_map_skill_levels.filter(
                is_complete=False
            ).first()
            actual_measure_count = current_skill_level.actual_measure_count
            actual_measure_time = current_skill_level.actual_measure_time
            if is_minus and (
                current_skill_level.measure_task_ids is None
                or task.id not in current_skill_level.measure_task_ids
            ):
                continue
            duration = duration_time or get_total_hours_of_task(
                task, skill_map_created_at=skill_map.created_at
            )
            total_duration_of_task = -duration if is_minus else duration
            if case in {
                CalculateSkillMapProcessCases.NOT_CHANGE_COMPLETED_STATUS.value,
                CalculateSkillMapProcessCases.CHANGE_COMPLETED_STATUS_TO_ANOTHER.value,
            }:
                actual_measure_count += -1 if is_minus else 1
            elif (
                case
                == CalculateSkillMapProcessCases.CHANGE_ANOTHER_TO_COMPLETED_STATUS.value
                and not is_minus
            ):
                actual_measure_count += 1
            if (
                current_skill_level.measure_count
                and current_skill_level.measure_count <= actual_measure_count
                and current_skill_level.popup
            ):
                _send_socket_show_popup_complete(
                    skill_map,
                    current_skill_level.measure_count,
                    None,
                    user,
                    skill_map_level=current_skill_level,
                )
            if total_duration_of_task and is_plus:
                # Update skill map skill level actual measure time
                # Get new actual measure time
                time_duration = total_duration_of_task or duration_time
                try:
                    new_actual_measure_time = (
                        time_str_to_timedelta(actual_measure_time)
                        + time_duration
                    )
                except:
                    raise ValidationError()
                # Formatted timedelta to string
                actual_measure_time = (
                    format_duration(new_actual_measure_time)
                    if new_actual_measure_time > timedelta(0)
                    else DEFAULT_TIME
                )
                # Compare with current measure time and send socket to show pop-up
                hours, _, _ = map(int, actual_measure_time.split(":"))
                if (
                    current_skill_level.measure_time
                    and current_skill_level.measure_time <= hours
                    and current_skill_level.popup
                ):
                    _send_socket_show_popup_complete(
                        skill_map,
                        None,
                        current_skill_level.measure_time,
                        user,
                        skill_map_level=current_skill_level,
                    )
            measure_task_ids = current_skill_level.measure_task_ids or []
            if task.id in measure_task_ids and is_minus:
                measure_task_ids.remove(task.id)
            elif task.id not in measure_task_ids:
                measure_task_ids.append(task.id)
            # Update skill map level
            skill_map.skill_map_skill_levels.filter(
                id=current_skill_level.id
            ).update(
                actual_measure_count=actual_measure_count
                if actual_measure_count > 0
                else 0,
                actual_measure_time=actual_measure_time,
                measure_task_ids=measure_task_ids,
            )
    # Update old level up contain task
    skill_map_levels = SkillMapSkillLevel.objects.filter(
        measure_task_ids__contains=[task.id], is_complete=True
    ).all()
    for skill_map_level in skill_map_levels:
        # Check task status for minus or plus count and duration
        if task.status.name == TaskStatus.COMPLETED.value:
            count = 1
            total_duration_of_task = get_total_hours_of_task(task)
        else:
            count = -1
            total_duration_of_task = -get_total_hours_of_task(task)
        # Calculate actual measure count
        actual_measure_count = skill_map_level.actual_measure_count + count
        # Calculate actual measure time
        try:
            new_actual_measure_time = (
                time_str_to_timedelta(skill_map_level.actual_measure_time)
                + total_duration_of_task
            )
        except:
            raise ValidationError()
        # Formatted timedelta to string
        actual_measure_time = (
            format_duration(new_actual_measure_time)
            if new_actual_measure_time > timedelta(0)
            else DEFAULT_TIME
        )
        # Update skill map level
        SkillMapSkillLevel.objects.filter(id=skill_map_level.id).update(
            actual_measure_count=actual_measure_count
            if actual_measure_count > 0
            else 0,
            actual_measure_time=actual_measure_time,
        )


def _send_socket_show_popup_complete(
    skill_map,
    measure_count=None,
    measure_time=None,
    user=None,
    skill_map_level=None,
    look_back_interval=None,
    look_back_type=None,
):
    """
    Handle send socket show popup complete skill map level
    """
    if not skill_map.is_valid:
        return
    send_web_socket_event(
        {
            "skill": {
                "id": skill_map.skill.id,
                "name": skill_map.skill.name,
            },
            "skill_map": skill_map.id,
            "skill_map_level": skill_map_level.id,
            "measure_count": measure_count,
            "measure_time": measure_time,
            "look_back_interval": look_back_interval,
            "look_back_type": look_back_type,
            "action": WebSocketEventType.SKILL_LEVEL_UP_COMPLETED.value,
        },
        user=user,
    )


def get_total_hours_of_task(task, skill_map_created_at=None):
    """
    Return total hours of task
    """
    durations = TaskDuration.objects.filter(task=task).all()
    total_duration = timedelta()
    for duration in durations:
        if skill_map_created_at and skill_map_created_at > duration.created_at:
            continue
        if duration.paused_at:
            total_duration += duration.paused_at - duration.started_at

    return total_duration
