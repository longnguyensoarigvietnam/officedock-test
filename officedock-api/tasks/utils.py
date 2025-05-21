from datetime import datetime, timedelta, time

from django.db.models import Q
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
from skills.models import SkillMap
from tasks.constants import DatetimeUnitTypes, TaskStatus
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


def calculate_progress_skill_map(task, user, duration_time: timedelta = None):
    """
    Handle calculate progress skill map by task
    """
    if not task:
        return
    task_categories = task.categories.first()
    if not task_categories:
        return
    # TODO: Wait QA 96
    org_cats_filter = Q(organization=task.organization)
    if task_categories.large_statistic_category:
        org_cats_filter &= Q(
            large_statistic_category=task_categories.large_statistic_category
        )
        if task_categories.medium_statistic_category:
            org_cats_filter &= Q(
                medium_statistic_category=task_categories.medium_statistic_category
            )
            if task_categories.small_statistic_category:
                org_cats_filter &= Q(
                    small_statistic_category=task_categories.small_statistic_category
                )
    # Get Organization categories
    org_categories = OrganizationsStatisticCategories.objects.filter(
        org_cats_filter
    ).values_list("id", flat=True)
    # Get Skill have categories
    org_cat_skills = (
        OrganizationsStatisticCategoriesSkills.objects.filter(
            organization_statistic_category__id__in=org_categories
        )
        .values_list("skill", flat=True)
        .distinct()
    )
    for skill in org_cat_skills:
        skill_map = SkillMap.objects.filter(
            skill__id=skill,
            organization=task.organization,
            staff=user,
            skill_map_skill_levels__is_complete=False,
            is_complete=False,
        ).first()
        if skill_map:
            current_skill_level = skill_map.skill_map_skill_levels.filter(
                is_complete=False
            ).first()
            actual_measure_count = current_skill_level.actual_measure_count
            actual_measure_time = current_skill_level.actual_measure_time
            # Get all time durations of task
            if not duration_time:
                # Update skill map skill level actual measure count
                count = (
                    1 if task.status.name == TaskStatus.COMPLETED.value else -1
                )
                actual_measure_count = actual_measure_count + count
                if (
                    current_skill_level.measure_count
                    and current_skill_level.measure_count
                    <= actual_measure_count
                ):
                    send_web_socket_event(
                        {
                            "skill": {
                                "id": skill_map.skill.id,
                                "name": skill_map.skill.name,
                            },
                            "measure_count": current_skill_level.measure_count,
                            "measure_time": None,
                            "look_back_interval": None,
                            "look_back_type": None,
                            "action": WebSocketEventType.SKILL_LEVEL_UP_COMPLETED.value,
                        },
                        user=user,
                    )
            if duration_time:
                # Update skill map skill level actual measure time
                # Get new actual measure time
                try:
                    new_actual_measure_time = (
                        time_str_to_timedelta(actual_measure_time)
                        + duration_time
                    )
                except:
                    raise ValidationError()
                # Formatted timedelta to string
                actual_measure_time = format_duration(new_actual_measure_time)
                # Compare with current measure time and send socket to show pop-up
                hours, minutes, seconds = map(
                    int, actual_measure_time.split(":")
                )
                if (
                    current_skill_level.measure_time
                    and current_skill_level.measure_time <= hours
                ):
                    send_web_socket_event(
                        {
                            "skill": {
                                "id": skill_map.skill.id,
                                "name": skill_map.skill.name,
                            },
                            "measure_count": None,
                            "measure_time": current_skill_level.measure_time,
                            "look_back_interval": None,
                            "look_back_type": None,
                            "action": WebSocketEventType.SKILL_LEVEL_UP_COMPLETED.value,
                        },
                        user=user,
                    )
            # Update skill map level
            skill_map.skill_map_skill_levels.filter(
                id=current_skill_level.id
            ).update(
                actual_measure_count=actual_measure_count,
                actual_measure_time=actual_measure_time,
            )


def get_total_hours_of_task(task):
    """
    Return total hours of task
    """
    durations = TaskDuration.objects.filter(task=task).all()
    total_duration = timedelta()
    for duration in durations:
        if duration.paused_at:
            total_duration += duration.paused_at - duration.started_at

    return total_duration
