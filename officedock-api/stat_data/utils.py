from collections import defaultdict
from datetime import timedelta, datetime
import re
from itertools import chain

from django.db.models import (
    Sum,
    Q,
    ExpressionWrapper,
    Case,
    When,
    F,
    DurationField,
)
from django.db.models.functions import Now, Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from calendars.constants import CalendarTypes
from calendars.models import Schedule
from common.constants import DATE_REGEX, BASE_DATE_FORMAT
from common.serializers import CreationDataUserSerializer
from common.utils import (
    format_duration,
    time_str_to_timedelta,
)
from organizations.constants import CategoryColors
from organizations.models import OrganizationsStatisticCategories, Organization
from stat_data.constants import NONE_CATEGORY, FilterTime, ALL_TEAM
from tags.models import Tag
from tasks.constants import TaskCategoryTypes
from tasks.models import Task, TaskDuration
from users.models import User


def get_list_durations_by_users(
    start_of_day=None,
    end_of_day=None,
    users=None,
    organizations=None,
    tags=None,
    large_id=None,
    medium_id=None,
    small_id=None,
    durations=None,
):
    """
    Return list duration by users
    """
    filter_tasks = Q()
    filter_events = Q()
    if large_id:
        if large_id == NONE_CATEGORY and durations:
            return get_duration_of_none_category(durations)
        else:
            filter_tasks &= Q(
                task__categories__large_statistic_category__id=large_id
            )
            filter_events &= Q(
                schedule__categories__large_statistic_category__id=large_id
            )
    if medium_id:
        if medium_id == NONE_CATEGORY and durations:
            return get_duration_of_none_category(durations, large_id)
        else:
            filter_tasks &= Q(
                task__categories__medium_statistic_category__id=medium_id
            )
            filter_events &= Q(
                schedule__categories__medium_statistic_category__id=medium_id
            )
    if small_id:
        if (medium_id == NONE_CATEGORY and durations) or (
            small_id == NONE_CATEGORY
        ):
            return get_duration_of_none_category(durations, large_id, medium_id)
        else:
            filter_tasks &= Q(
                task__categories__small_statistic_category__id=small_id
            )
            filter_events &= Q(
                schedule__categories__small_statistic_category__id=small_id
            )
    if tags:
        filter_tasks &= Q(task__tags__in=tags)
        filter_events &= Q(schedule__tags__in=tags)
    if organizations:
        filter_tasks &= Q(task__organization__in=organizations)
        filter_events &= Q(schedule__organization__in=organizations)
    if users:
        filter_tasks &= Q(user__in=users)
        filter_events &= Q(user__in=users)
    if durations:
        task_durations = durations.filter(filter_tasks)
        event_durations = durations.filter(filter_events)
    else:
        if not start_of_day and not end_of_day:
            return TaskDuration.objects.none()
        base_filter = Q(
            Q(Q(started_at__gte=start_of_day) & Q(paused_at__lte=end_of_day))
            | Q(
                Q(started_at__lte=end_of_day)
                & Q(started_at__gte=start_of_day)
                & Q(paused_at__isnull=True)
            )
        )
        durations = TaskDuration.objects.filter(base_filter).select_related(
            "task", "schedule"
        )
        task_durations = durations.filter(filter_tasks)
        event_durations = durations.filter(filter_events)

    return (task_durations | event_durations).distinct()


def get_list_models(durations=None):
    """
    Return list models by organizations, users and tags
    """

    tasks = Task.objects.filter(id__in=durations.values_list("task", flat=True))
    events = Schedule.objects.filter(
        id__in=durations.values_list("schedule", flat=True)
    )

    return tasks, events


def annotate_duration(queryset, start_of_day, end_of_day):
    """
    Handle return duration of queryset
    """
    return queryset.annotate(
        duration=ExpressionWrapper(
            Case(
                When(
                    paused_at__isnull=True,
                    then=end_of_day if end_of_day < timezone.now() else Now(),
                ),
                default=F("paused_at"),
                output_field=DurationField(),
            )
            - Coalesce(F("started_at"), start_of_day),
            output_field=DurationField(),
        )
    ).aggregate(total_duration=Sum("duration"))


def aggregate_durations(
    large_category_id=None,
    medium_category_id=None,
    durations=None,
    organization_ids_param=None,
):
    """Aggregates durations from tasks or events into a single dictionary."""
    category_dict = {}
    filter_durations = (
        get_list_durations_by_users(
            durations=durations,
            large_id=large_category_id,
            medium_id=medium_category_id,
        )
        if not organization_ids_param == ALL_TEAM
        else durations
    )
    # Annotate duration
    annotated = filter_durations.annotate(
        duration=ExpressionWrapper(
            Case(
                When(paused_at__isnull=True, then=Now()),
                default=F("paused_at"),
                output_field=DurationField(),
            )
            - F("started_at"),
            output_field=DurationField(),
        )
    )
    # Split 2 group: task and schedule
    grouped_by_task = (
        annotated.filter(task__isnull=False)
        .values("task")  # Group by task ID
        .annotate(total_duration=Sum("duration"))
    )

    grouped_by_schedule = (
        annotated.filter(schedule__isnull=False)
        .values("schedule")  # Group by schedule ID
        .annotate(total_duration=Sum("duration"))
    )
    # Combine 2 group
    combined = list(chain(grouped_by_task, grouped_by_schedule))
    for card in combined:
        if card.get("task"):
            model_object = get_object_or_404(Task, id=card.get("task"))
        else:
            model_object = get_object_or_404(Schedule, id=card.get("schedule"))
        organization = model_object.organization
        category_color = (
            CategoryColors.GRAY.value
        )  # Set default color for unsetting category
        categories = model_object.categories.first()
        large_category = (
            categories.large_statistic_category if categories else None
        )
        medium_category = (
            categories.medium_statistic_category if categories else None
        )
        small_category = (
            categories.small_statistic_category if categories else None
        )

        category_name = large_category.name if large_category else NONE_CATEGORY
        category_id = large_category.id if large_category else None
        org_category = OrganizationsStatisticCategories.objects.filter(
            organization=organization,
            large_statistic_category=large_category,
        )
        # Case: No category IDs provided
        if not large_category_id and not medium_category_id:
            category_color = org_category.values_list(
                "color", flat=True
            ).first()
        # Case: Large category ID is provided, no medium category ID
        elif large_category_id and not medium_category_id:
            category_name = (
                medium_category.name if medium_category else NONE_CATEGORY
            )
            category_id = medium_category.id if medium_category else None
        # Case: Both large and medium category IDs are provided
        elif large_category_id and medium_category_id:
            category_name = (
                small_category.name if small_category else NONE_CATEGORY
            )
            category_id = small_category.id if small_category else None

        if organization_ids_param == ALL_TEAM:
            category_name = organization.name + " " + category_name

        key = category_name + "_" + str(organization.id)
        if key in category_dict:
            category_dict[key]["duration"] += card["total_duration"]
        else:
            category_dict[key] = {
                "category_id": category_id,
                "organization_id": organization.id,
                "category_name": category_name,
                "category_color": category_color,
                "duration": card["total_duration"],
                "index": org_category.first().id
                if org_category.exists()
                else 0,
            }
    if not category_dict:
        return []
    # Set max index for unsetting category
    max_index = max(entry["index"] for entry in category_dict.values())
    for entry in category_dict.values():
        if entry["index"] == 0:
            entry["index"] = max_index + 1
    category_list = sorted(
        list(category_dict.values()), key=lambda x: x["index"]
    )
    return category_list


def process_categories(
    category_list,
    total_duration,
    category_type=None,
    is_with_tasks=False,
    is_with_users=False,
    durations=None,
):
    """Processes category durations, calculates percentages, and returns structured data."""
    percent = 0
    categories_data = []
    filter_duration_by_type_category = {
        TaskCategoryTypes.LARGE.value: "large_id",
        TaskCategoryTypes.MEDIUM.value: "medium_id",
        TaskCategoryTypes.SMALL.value: "small_id",
    }
    if not durations.exists() or category_list is None:
        return []
    for index, cat in enumerate(category_list):
        is_last_element = index == len(category_list) - 1
        org_id = cat["organization_id"]
        data = {
            "organization_id": cat["organization_id"],
            "category_id": None,
            "category_name": None,
            "category_color": None,
            "duration": None,
            "percent": None,
        }
        category_duration = format_duration(cat["duration"]) or timedelta(0)
        category_name = cat["category_name"]
        category_id = cat["category_id"]
        category_color = cat["category_color"]
        if is_with_tasks or is_with_users:
            filter_key = filter_duration_by_type_category[category_type]
            if category_id:
                filter_durations = get_list_durations_by_users(
                    durations=durations,
                    **{filter_key: category_id},
                    organizations=[org_id],
                )
            else:
                filters = Q(task__organization__id=org_id) | Q(
                    schedule__organization__id=org_id
                )
                if filter_key == "large_id":
                    filter_durations = durations.filter(
                        filters
                        & Q(
                            task__categories__large_statistic_category__isnull=True
                        )
                        & Q(
                            schedule__categories__large_statistic_category__isnull=True
                        )
                    )
                elif filter_key == "medium_id":
                    filter_durations = durations.filter(
                        filters
                        & Q(
                            task__categories__medium_statistic_category__isnull=True
                        )
                        & Q(
                            schedule__categories__medium_statistic_category__isnull=True
                        )
                    )
                else:
                    filter_durations = durations.filter(
                        filters
                        & Q(
                            task__categories__small_statistic_category__isnull=True
                        )
                        & Q(
                            schedule__categories__small_statistic_category__isnull=True
                        )
                    )
            if is_with_tasks:
                data["tasks"] = get_list_basic_task_or_event_of_durations(
                    filter_durations
                )
            elif is_with_users:
                data["users"] = process_users(
                    time_str_to_timedelta(category_duration),
                    filter_durations,
                )

        # Calculate the percentage of the total duration
        (
            percent_per_total_duration,
            percent,
        ) = percentage_calculation_of_duration(
            total_duration.total_seconds(),
            time_str_to_timedelta(category_duration).total_seconds(),
            percent,
            is_last_element,
        )
        data.update(
            {
                "category_id": category_id if category_id else NONE_CATEGORY,
                "category_name": category_name,
                "category_color": category_color,
                "duration": category_duration,
                "percent": percent_per_total_duration,
            }
        )

        # Append category data
        categories_data.append(data)

    return categories_data


def get_list_basic_task_or_event_of_durations(durations):
    """
    Handle get task or event of duration and return list of it
    """
    tasks = {}
    for filter_duration in durations:
        # Limit just 4 cards return
        if len(tasks) >= 4:
            break
        model_object = filter_duration.task or filter_duration.schedule
        if model_object.id not in tasks:
            tasks[model_object.id] = {
                "id": model_object.id,
                "title": model_object.title,
                "type": CalendarTypes.SCHEDULE.value
                if filter_duration.schedule
                else CalendarTypes.TASK.value,
            }
    return list(tasks.values())


def process_users(total_duration, durations=None):
    """Processes users durations, calculates percentages, and returns structured data."""
    user_data = []
    percent = 0
    filter_durations = durations.annotate(
        duration=ExpressionWrapper(
            Case(
                When(
                    paused_at__isnull=True,
                    then=Now(),
                ),
                default=F("paused_at"),
                output_field=DurationField(),
            )
            - F("started_at"),
            output_field=DurationField(),
        )
    )
    grouped_by_user = defaultdict(
        lambda: {
            "total_duration": timedelta(0),
            "task_ids": set(),
            "schedule_ids": set(),
        }
    )

    for record in filter_durations:
        user_id = record.user_id
        data = grouped_by_user[user_id]

        data["total_duration"] += record.duration or timedelta(0)

        if record.task_id and len(data["task_ids"]) < 5:  # limit 5 task
            data["task_ids"].add(record.task_id)

        if (
            record.schedule_id and len(data["schedule_ids"]) < 5
        ):  # limit 5 schedule
            data["schedule_ids"].add(record.schedule_id)

    # Change to list type
    grouped_by_user = [
        {
            "user": user_id,
            "total_duration": data["total_duration"],
            "task_ids": list(data["task_ids"]),
            "schedule_ids": list(data["schedule_ids"]),
        }
        for user_id, data in grouped_by_user.items()
    ]
    for index, data in enumerate(grouped_by_user):
        is_last_element = index == len(grouped_by_user) - 1
        user = get_object_or_404(User, id=data["user"])
        user_serializer = CreationDataUserSerializer(user).data
        if data["task_ids"]:
            tasks = Task.objects.filter(id__in=data["task_ids"][:4]).values(
                "id", "title"
            )
        else:
            tasks = Schedule.objects.filter(
                id__in=data["schedule_ids"][:4]
            ).values("id", "title")
        # Calculate the percentage of the total duration
        (
            percent_per_total_duration,
            percent,
        ) = percentage_calculation_of_duration(
            total_duration.total_seconds(),
            data["total_duration"].total_seconds(),
            percent,
            is_last_element,
        )
        user_data.append(
            {
                "user": user_serializer,
                "duration": format_duration(data["total_duration"]),
                "percent": percent_per_total_duration,
                "tasks": tasks,
            }
        )

    return user_data


def process_tags(
    tag_list,
    total_duration,
    is_with_tasks=False,
    is_with_users=None,
    durations=None,
):
    """Processes category durations, calculates percentages, and returns structured data."""
    percent = 0
    tags_data = []
    if durations and not durations.exists() or tag_list is None:
        return []
    for index, tag in enumerate(tag_list):
        is_last_element = index == len(tag_list) - 1
        tag_duration = format_duration(tag["duration"]) or timedelta(0)
        data = {
            "organization_id": tag["organization_id"],
            "tag_id": tag["tag_id"],
            "tag_name": tag["tag_name"],
            "duration": tag_duration,
            "percent": None,
        }

        filter_durations = get_list_durations_by_users(
            durations=durations,
            tags=[tag["tag_id"]],
            organizations=[tag["organization_id"]],
        )
        if is_with_tasks:
            data["tasks"] = get_list_basic_task_or_event_of_durations(
                filter_durations
            )
        elif is_with_users:
            data["users"] = process_users(
                time_str_to_timedelta(tag_duration),
                filter_durations,
            )

        # Calculate the percentage of the total duration
        (
            percent_per_total_duration,
            percent,
        ) = percentage_calculation_of_duration(
            total_duration.total_seconds(),
            time_str_to_timedelta(tag_duration).total_seconds(),
            percent,
            is_last_element,
        )

        data["percent"] = percent_per_total_duration

        # Append category data
        tags_data.append(data)

    return tags_data


def process_merge_card_per_tag(
    tag_ids, durations=None, organization_ids_param=None
):
    """
    Handle process category per user.
    """
    total_duration = timedelta(0)
    tag_totals = {}
    tags = Tag.objects.filter(id__in=tag_ids).all()
    if durations is None or not durations.exists():
        return total_duration, []
    for tag in tags:
        organizations = Organization.all_objects.filter(tags=tag).all()
        for organization in organizations:
            filter_durations = get_list_durations_by_users(
                durations=durations, tags=[tag.id], organizations=[organization]
            )
            if not filter_durations:
                continue
            duration = get_total_durations(filter_durations)
            key = tag.name + "_" + str(organization.id)
            name = (
                organization.name + " " + tag.name
                if organization_ids_param == ALL_TEAM
                else tag.name
            )
            total_duration += duration
            tag_totals[key] = {
                "organization_id": organization.id,
                "tag_id": tag.id,
                "tag_name": name,
                "duration": duration,
            }
    tag_list = sorted(
        list(tag_totals.values()), key=lambda x: x["tag_id"], reverse=True
    )
    return total_duration, tag_list


def split_ranges(from_date, end_date, option):
    """
    Split week by range time
    """
    ranges = []
    current_start = from_date
    if option == FilterTime.DAY.value:
        while current_start <= end_date:
            ranges.append((current_start, current_start))
            current_start += timedelta(days=1)
    elif option == FilterTime.WEEK.value:
        # If the start date is not Monday, get the first Sunday
        if current_start.weekday() != 0:  # 0 = Monday, 6 = Sunday
            first_sunday = current_start + timedelta(
                days=(6 - current_start.weekday())
            )
            ranges.append((current_start, min(first_sunday, end_date)))
            current_start = first_sunday + timedelta(
                days=1
            )  # Move to next Monday

        # Generate full Monday-Sunday weeks
        while current_start <= end_date:
            week_end = current_start + timedelta(days=6)
            ranges.append((current_start, min(week_end, end_date)))
            current_start = week_end + timedelta(days=1)  # Move to next Monday

    elif option == FilterTime.MONTH.value:
        while current_start <= end_date:
            next_month = (
                current_start.replace(day=28) + timedelta(days=4)
            ).replace(day=1)
            month_end = next_month - timedelta(days=1)
            ranges.append((current_start, min(month_end, end_date)))
            current_start = next_month

    elif option == FilterTime.YEAR.value:
        while current_start <= end_date:
            next_year = current_start.replace(
                year=current_start.year + 1, month=1, day=1
            )
            year_end = next_year - timedelta(days=1)
            ranges.append((current_start, min(year_end, end_date)))
            current_start = next_year

    return ranges


def build_category_filters(
    large_category_id=None,
    medium_category_id=None,
    small_category_id=None,
):
    """
    Handle build category filter
    """
    filters = Q()

    # Large Category Filtering
    if large_category_id and large_category_id != NONE_CATEGORY:
        filters &= Q(categories__large_statistic_category__id=large_category_id)
    elif large_category_id == NONE_CATEGORY:
        filters &= Q(categories__large_statistic_category__isnull=True)

    # Medium Category Filtering
    if medium_category_id and medium_category_id != NONE_CATEGORY:
        filters &= Q(
            categories__medium_statistic_category__id=medium_category_id
        )
    elif medium_category_id == NONE_CATEGORY:
        filters &= Q(categories__medium_statistic_category__isnull=True)

    # Small Category Filtering
    if small_category_id and small_category_id != NONE_CATEGORY:
        filters &= Q(categories__small_statistic_category__id=small_category_id)
    elif small_category_id == NONE_CATEGORY:
        filters &= Q(categories__small_statistic_category__isnull=True)

    return filters


def get_total_durations(durations):
    """
    Handle get total durations
    """
    total_duration = timedelta()
    for duration in durations:
        paused_at = duration.paused_at if duration.paused_at else timezone.now()
        total_duration += paused_at - duration.started_at
    return time_str_to_timedelta(format_duration(total_duration))


def get_duration_of_none_category(durations, large_id=None, medium_id=None):
    """
    Handle get total durations of none category
    """
    filter_durations = durations.filter(
        Q(task__categories__large_statistic_category__isnull=True)
        & Q(schedule__categories__large_statistic_category__isnull=True)
    )

    if large_id and large_id != NONE_CATEGORY:
        filter_durations = get_list_durations_by_users(
            durations=durations,
            large_id=large_id,
        ).filter(
            Q(task__categories__medium_statistic_category__isnull=True)
            & Q(schedule__categories__medium_statistic_category__isnull=True)
        )

        if medium_id and medium_id != NONE_CATEGORY:
            filter_durations = get_list_durations_by_users(
                durations=durations,
                large_id=large_id,
                medium_id=medium_id,
            ).filter(
                Q(task__categories__small_statistic_category__isnull=True)
                & Q(schedule__categories__small_statistic_category__isnull=True)
            )

    return filter_durations


def check_is_not_none_category(large_id=None, medium_id=None, small_id=None):
    """
    Return True if none of the given category levels is explicitly marked as NONE_CATEGORY.
    """

    return not (
        (large_id == NONE_CATEGORY)
        or (large_id and medium_id == NONE_CATEGORY)
        or (large_id and medium_id and small_id == NONE_CATEGORY)
    )


def validate_date_by_regex_and_reformat(date):
    """
    Validate date format using default regex YYYY-MM-DD and return date
    """
    if not date or not re.match(DATE_REGEX, date):
        raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

    return datetime.strptime(date, BASE_DATE_FORMAT).date()


def percentage_calculation_of_duration(
    total_sec, duration_sec, start_percent=0, is_last_element=False
):
    if not total_sec or not duration_sec:
        return 0, start_percent
    percent_per_total_duration = (duration_sec / total_sec) * 100
    remaining_percentage = 100 - start_percent
    # Limit the amount we can add to keep percent <= 100
    percent_per_total_duration = min(
        round(percent_per_total_duration), remaining_percentage
    )
    if (
        is_last_element and percent_per_total_duration < remaining_percentage
    ) or (percent_per_total_duration <= 0 < remaining_percentage < 2):
        percent_per_total_duration = remaining_percentage
    start_percent += percent_per_total_duration
    return percent_per_total_duration, start_percent
