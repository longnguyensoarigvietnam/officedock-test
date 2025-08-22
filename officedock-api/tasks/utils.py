from datetime import datetime, timedelta, time

from django.db import transaction
from django.db.models import Q, OuterRef, F, Subquery
from django.utils.timezone import now
from rest_framework.exceptions import ValidationError

from chat.constants import WebSocketEventType
from common.utils import (
    send_web_socket_event,
    split_id_from_string,
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
from tasks.models import (
    Task,
    TaskIndex,
    TaskSchedule,
    TeamTaskIndex,
    TodoList,
    TaskDuration,
)
from calendars.models import Schedule
from users.models import Setting, User


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
    from tasks.serializers import TaskScheduleSerializer

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
    from tasks.serializers import TodoListSerializer

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
    from tasks.serializers import TodoListSerializer

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
    old_task_updated=None,
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
            current_skill_level = skill_map.skill_map_skill_levels.filter(
                is_complete=False
            ).first()
            if (
                (
                    duration_created_at
                    and duration_created_at < current_skill_level.created_at
                )
                or old_task_updated
                and old_task_updated < current_skill_level.created_at
            ):
                continue

            actual_measure_count = current_skill_level.actual_measure_count
            actual_measure_time = current_skill_level.actual_measure_time
            if is_minus and (
                current_skill_level.measure_task_ids is None
                or task.id not in current_skill_level.measure_task_ids
            ):
                continue
            duration = duration_time or get_total_hours_of_task(
                task, skill_map_level_created_at=current_skill_level.created_at
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
                updated_at=now(),
            )
    # Update old level up contain task
    skill_map_levels = SkillMapSkillLevel.objects.filter(
        measure_task_ids__contains=[task.id], is_complete=True
    ).all()
    for skill_map_level in skill_map_levels:
        if (
            duration_created_at
            and duration_created_at > skill_map_level.updated_at
        ):
            continue
        actual_measure_count = skill_map_level.actual_measure_count
        if not duration_time:
            durations = TaskDuration.objects.filter(
                task=task,
                created_at__gte=skill_map_level.created_at,
                created_at__lte=skill_map_level.updated_at,
            ).all()
            total_duration = timedelta()
            for duration in durations:
                if duration.paused_at:
                    total_duration += duration.paused_at - duration.started_at

            # Check task status for minus or plus count and duration
            if task.status.name == TaskStatus.COMPLETED.value and not is_minus:
                count = 1
                duration_time = total_duration
            else:
                count = -1
                duration_time = -total_duration

            # Calculate actual measure count
            actual_measure_count = skill_map_level.actual_measure_count + count
        # Calculate actual measure time
        try:
            new_actual_measure_time = (
                time_str_to_timedelta(skill_map_level.actual_measure_time)
                + duration_time
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
            updated_at=now(),
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


def get_total_hours_of_task(task, skill_map_level_created_at=None):
    """
    Return total hours of task
    """
    filter_duration = Q(task=task, paused_at__isnull=False)
    if skill_map_level_created_at:
        filter_duration &= Q(created_at__gte=skill_map_level_created_at)
    durations = TaskDuration.objects.filter(filter_duration).all()
    total_duration = timedelta()
    for duration in durations:
        total_duration += duration.paused_at - duration.started_at

    return total_duration


"""
Block code for my task and team task list
"""


def annotate_and_order_tasks_by_pin_and_index(
    queryset, user, is_team_task=False, organization_id=None, user_id=None
):
    """
    Annotate a Task queryset with `index` and `pin_at` values,
    then order tasks by the following priority:

    1. Pinned tasks first (latest `pin_at` on top, nulls last).
    2. Higher `index` value first (custom ordering).
    3. More recently updated tasks (`updated_at`) first.
    """
    if is_team_task:
        task_index = TeamTaskIndex.objects.filter(
            task=OuterRef("pk"), team_id=organization_id, user_id=user.id
        ).values("index")[:1]

        task_pin = TeamTaskIndex.objects.filter(
            task=OuterRef("pk"), team_id=organization_id, user_id=user.id
        ).values("pin_at")[:1]
    else:
        uid = user_id or user.id
        task_index = TaskIndex.objects.filter(
            task=OuterRef("pk"), user_id=uid
        ).values("index")[:1]

        task_pin = TaskIndex.objects.filter(
            task=OuterRef("pk"), user_id=uid
        ).values("pin_at")[:1]

    return queryset.annotate(
        index=Subquery(task_index),
        pin_at=Subquery(task_pin),
    ).order_by(
        F("pin_at").desc(nulls_last=True),
        F("index").desc(),
        F("updated_at").desc(),
    )


def update_sorting_setting(user, ordering):
    """
    Update user sorting preference
    """
    if "deadline" in ordering:
        Setting.objects.update_or_create(
            user=user,
            company_id=user.company_id,
            defaults={
                "is_sorting_task_by_deadline": True,
                "is_sorting_task_by_important": False,
            },
        )
    if "is_important" in ordering:
        Setting.objects.update_or_create(
            user=user,
            company_id=user.company_id,
            defaults={
                "is_sorting_task_by_deadline": False,
                "is_sorting_task_by_important": True,
            },
        )


def apply_ordering_to_tasks(tasks_queryset, ordering):
    """
    Ordering by deadline, important for tasks queryset
    """
    if "deadline" in ordering:
        return tasks_queryset.order_by(
            F("deadline").asc(nulls_last=True),
            F("is_important").desc(),
            F("updated_at").desc(),
        )
    if "is_important" in ordering:
        return tasks_queryset.order_by(
            F("is_important").desc(),
            F("deadline").asc(nulls_last=True),
            F("updated_at").desc(),
        )
    return tasks_queryset


def apply_filters_to_tasks(tasks_queryset, query_params):
    """
    Apply filter to tasks queryset
    """
    if ids := query_params.get("ids"):
        if exclude_ids := split_id_from_string(ids):
            tasks_queryset = tasks_queryset.exclude(id__in=exclude_ids)

    if tag_ids := query_params.get("tag_ids"):
        if ids := split_id_from_string(tag_ids):
            tasks_queryset = tasks_queryset.filter(tags__id__in=ids)

    if category_ids := query_params.get("category_ids"):
        if ids := split_id_from_string(category_ids):
            tasks_queryset = tasks_queryset.filter(
                categories__large_statistic_category__in=ids
            )

    if organization_ids := query_params.get("organization_ids"):
        if ids := split_id_from_string(organization_ids):
            tasks_queryset = tasks_queryset.filter(organization__in=ids)

    if search := query_params.get("search"):
        tasks_queryset = tasks_queryset.filter(title__icontains=search)

    return tasks_queryset
