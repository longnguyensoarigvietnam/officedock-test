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
from django.utils import timezone
from django.utils.timezone import now
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from calendars.constants import CalendarTypes
from calendars.models import Schedule
from common.constants import (
    DATE_REGEX,
    BASE_DATE_FORMAT,
    AVATAR_GCS_EXPIRATION_SECONDS,
)
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    get_signed_url,
)
from organizations.constants import CategoryColors
from organizations.models import OrganizationsStatisticCategories, Organization
from stat_data.constants import (
    NONE_CATEGORY,
    FilterTime,
    ALL_TEAM,
    SUB_TEAM,
    CALENDAR,
    CALENDAR_COLOR,
    SUB_TEAM_COLOR,
    MAIN_TEAM_COLOR,
)
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
                task__categories__large_statistic_category_id=large_id
            )
            filter_events &= Q(
                schedule__categories__large_statistic_category_id=large_id
            )
    if medium_id:
        if medium_id == NONE_CATEGORY and durations:
            return get_duration_of_none_category(durations, large_id)
        else:
            filter_tasks &= Q(
                task__categories__medium_statistic_category_id=medium_id
            )
            filter_events &= Q(
                schedule__categories__medium_statistic_category_id=medium_id
            )
    if small_id:
        if (medium_id == NONE_CATEGORY and durations) or (
            small_id == NONE_CATEGORY
        ):
            return get_duration_of_none_category(durations, large_id, medium_id)
        else:
            filter_tasks &= Q(
                task__categories__small_statistic_category_id=small_id
            )
            filter_events &= Q(
                schedule__categories__small_statistic_category_id=small_id
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
        combined_filter = filter_tasks | filter_events
        result = durations.filter(combined_filter).distinct()
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
        durations = TaskDuration.objects.filter(base_filter)
        combined_filter = filter_tasks | filter_events
        result = durations.filter(combined_filter).distinct()

    return result


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
    is_daily_report=False,
):
    """
    Optimized version: aggregate durations by task/schedule and group by category
    """
    category_dict = {}

    # 1. Get durations
    filter_durations = (
        get_list_durations_by_users(
            durations=durations,
            large_id=large_category_id,
            medium_id=medium_category_id,
        )
        if organization_ids_param != ALL_TEAM
        else durations
    )

    # 2. Fetch related fields in one go
    durations_list = list(
        filter_durations.select_related(
            "task__organization", "schedule__organization"
        ).prefetch_related(
            "task__categories__large_statistic_category",
            "task__categories__medium_statistic_category",
            "task__categories__small_statistic_category",
            "schedule__categories__large_statistic_category",
            "schedule__categories__medium_statistic_category",
            "schedule__categories__small_statistic_category",
        )
    )

    # 3. Group duration totals
    task_duration_map = defaultdict(timedelta)
    schedule_duration_map = defaultdict(timedelta)

    for d in durations_list:
        started = d.started_at
        paused = d.paused_at or now()
        duration = paused - started if started else timedelta()

        if d.task:
            task_duration_map[d.task.id] += duration
        elif d.schedule:
            schedule_duration_map[d.schedule.id] += duration

    # 4. Fetch tasks and schedules
    task_ids = list(task_duration_map.keys())
    schedule_ids = list(schedule_duration_map.keys())

    tasks = (
        Task.objects.filter(id__in=task_ids)
        .select_related("organization")
        .prefetch_related(
            "categories__large_statistic_category",
            "categories__medium_statistic_category",
            "categories__small_statistic_category",
        )
    )
    schedules = (
        Schedule.objects.filter(id__in=schedule_ids)
        .select_related("organization")
        .prefetch_related(
            "categories__large_statistic_category",
            "categories__medium_statistic_category",
            "categories__small_statistic_category",
        )
    )

    tasks_map = {}
    schedules_map = {}
    all_org_ids = set()

    # Populate task map and collect related organization IDs
    for t in tasks:
        tasks_map[t.id] = t
        all_org_ids.add(t.organization_id)

    # Populate schedule map and collect related organization IDs
    for s in schedules:
        schedules_map[s.id] = s
        all_org_ids.add(s.organization_id)

    # Collect all large category IDs from the first category of each task/schedule
    all_category_ids = set()
    for t in chain(tasks, schedules):
        if t.categories.exists():
            all_category_ids.add(
                t.categories.first().large_statistic_category_id
            )

    # Fetch organization-category metadata (e.g. color) in a single query
    org_cats = OrganizationsStatisticCategories.objects.filter(
        organization_id__in=all_org_ids,
        large_statistic_category_id__in=all_category_ids,
    ).values("organization_id", "large_statistic_category_id", "color", "id")
    # Map organization-category pairs to their metadata for fast lookup
    org_cat_map = {
        (oc["organization_id"], oc["large_statistic_category_id"]): oc
        for oc in org_cats
    }

    # 6. Merge task/schedule durations and preload the first category of each object (task or schedule) for later use
    combined = []
    first_categories = {}
    for task_id, duration in task_duration_map.items():
        task = tasks_map[task_id]
        combined.append((task, duration))
        first_categories[task.id] = (
            task.categories.all()[0] if task.categories.exists() else None
        )
    for schedule_id, duration in schedule_duration_map.items():
        schedule = schedules_map[schedule_id]
        combined.append((schedule, duration))
        first_categories[schedule.id] = (
            schedule.categories.all()[0]
            if schedule.categories.exists()
            else None
        )

    # 7. Build final response
    for obj, duration in combined:
        organization = obj.organization

        # Safe fallback for categories
        categories = first_categories.get(obj.id)
        large_category = getattr(categories, "large_statistic_category", None)
        medium_category = getattr(categories, "medium_statistic_category", None)
        small_category = getattr(categories, "small_statistic_category", None)

        # Determine which category level to use
        if large_category_id and medium_category_id:
            category = small_category
        elif large_category_id:
            category = medium_category
        else:
            category = large_category

        category_name = category.name if category else NONE_CATEGORY
        category_id = category.id if category else NONE_CATEGORY
        category_color = None
        index = 0

        org_cat_key = (
            organization.id,
            large_category.id if large_category else None,
        )
        if (
            not large_category_id
            and not medium_category_id
            and org_cat_key in org_cat_map
        ):
            category_color = org_cat_map[org_cat_key]["color"]
            index = org_cat_map[org_cat_key]["id"]
        if category_id == NONE_CATEGORY:
            category_color = CategoryColors.GRAY.value

        key = (
            (category_name, organization.id)
            if not is_daily_report
            else category_id
        )

        if key in category_dict:
            category_dict[key]["duration"] += duration
        else:
            category_dict[key] = {
                "category_id": category_id,
                "organization_id": organization.id,
                "organization_name": organization.name,
                "category_name": category_name,
                "category_color": category_color,
                "duration": duration,
                "index": index,
            }
    # Sort by index
    if not category_dict:
        return []

    max_index = max(entry["index"] for entry in category_dict.values())
    for entry in category_dict.values():
        if entry["index"] == 0:
            entry["index"] = max_index + 1
    return sorted(category_dict.values(), key=lambda x: x["index"])


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
        category_id = cat["category_id"]
        category_name = cat["category_name"]
        category_color = cat["category_color"]
        category_duration = format_duration(cat["duration"]) or timedelta(0)

        data = {
            "organization_id": org_id,
            "category_id": category_id,
            "category_name": category_name,
            "category_color": category_color,
            "duration": category_duration,
            "percent": None,
        }

        if is_with_tasks or is_with_users:
            filter_key = filter_duration_by_type_category[category_type]
            if category_id != NONE_CATEGORY:
                filtered_durations = get_list_durations_by_users(
                    durations=durations,
                    **{filter_key: category_id},
                    organizations=[org_id],
                )
            else:
                base_filter = Q(task__organization_id=org_id) | Q(
                    schedule__organization_id=org_id
                )
                null_filter = Q()

                if filter_key == "large_id":
                    null_filter = Q(
                        task__categories__large_statistic_category__isnull=True
                    ) & Q(
                        schedule__categories__large_statistic_category__isnull=True
                    )
                elif filter_key == "medium_id":
                    null_filter = Q(
                        task__categories__medium_statistic_category__isnull=True
                    ) & Q(
                        schedule__categories__medium_statistic_category__isnull=True
                    )
                elif filter_key == "small_id":
                    null_filter = Q(
                        task__categories__small_statistic_category__isnull=True
                    ) & Q(
                        schedule__categories__small_statistic_category__isnull=True
                    )

                filtered_durations = durations.filter(base_filter & null_filter)
            if is_with_tasks:
                data["tasks"] = get_list_basic_task_or_event_of_durations(
                    filtered_durations
                )
            elif is_with_users:
                data["users"] = process_users(
                    time_str_to_timedelta(category_duration),
                    filtered_durations,
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
        data["percent"] = percent_per_total_duration
        categories_data.append(data)
    return categories_data


def get_list_basic_task_or_event_of_durations(durations):
    """
    Handle get task or event of duration and return list of it
    """
    tasks = {}
    for filter_duration in durations:
        # Limit just 3 cards return
        if len(tasks) >= 3:
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


def process_users(total_duration, durations):
    """Processes users durations, calculates percentages, and returns structured data."""
    user_data = []
    percent = 0

    if not durations:
        return []

    # Group by user ID
    user_durations = defaultdict(timedelta)
    user_tasks = defaultdict(set)
    user_schedules = defaultdict(set)
    task_ids = set()
    schedule_ids = set()

    for d in durations:
        computed_duration = (
            (timezone.now() - d.started_at)
            if d.paused_at is None
            else (d.paused_at - d.started_at)
        )

        user_durations[d.user_id] += computed_duration
        if d.task_id:
            user_tasks[d.user_id].add(d.task_id)
            task_ids.add(d.task_id)
        elif d.schedule_id:
            user_schedules[d.user_id].add(d.schedule_id)
            schedule_ids.add(d.task_id)

    # Prefetch all users
    user_ids = list(user_durations.keys())
    user_serialized_map = {
        user["id"]: {
            "id": user["id"],
            "full_name": user["profile__full_name"],
            "avatar": get_signed_url(
                user["avatar"], AVATAR_GCS_EXPIRATION_SECONDS
            ),
            "avatar_color": user["avatar_color"],
        }
        for user in User.objects.filter(id__in=user_ids).values(
            "id", "profile__full_name", "avatar", "avatar_color"
        )
    }

    combined_task_map = {
        **{
            task["id"]: task
            for task in Task.objects.filter(id__in=task_ids).values(
                "id", "title"
            )
        },
        **{
            sch["id"]: sch
            for sch in Schedule.objects.filter(id__in=schedule_ids).values(
                "id", "title"
            )
        },
    }
    sorted_users = list(user_durations.items())
    for index, (uid, duration) in enumerate(sorted_users):
        is_last = index == len(sorted_users) - 1
        serialized_user = user_serialized_map.get(uid)
        combined_ids = list(user_tasks[uid]) + list(user_schedules[uid])
        tasks = [
            combined_task_map[tid]
            for tid in combined_ids[:3]
            if tid in combined_task_map
        ]

        (
            percent_per_total_duration,
            percent,
        ) = percentage_calculation_of_duration(
            total_duration.total_seconds(),
            duration.total_seconds(),
            percent,
            is_last,
        )

        user_data.append(
            {
                "user": serialized_user,
                "duration": format_duration(duration),
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

        if is_with_tasks or is_with_users:
            filtered = get_list_durations_by_users(
                durations=durations,
                tags=[tag["tag_id"]],
                organizations=[tag["organization_id"]],
            )
            if is_with_tasks:
                data["tasks"] = get_list_basic_task_or_event_of_durations(
                    filtered
                )
            elif is_with_users:
                data["users"] = process_users(
                    time_str_to_timedelta(tag_duration),
                    filtered,
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
    tag_ids, durations=None, organization_ids_param=None, organization_ids=None
):
    """
    Handle process category per user.
    """
    total_duration = timedelta(0)
    if durations is None or not durations.exists() or not organization_ids:
        return total_duration, []

    tags = Tag.objects.filter(id__in=tag_ids).only("id", "name")
    organizations = Organization.all_objects.filter(
        id__in=organization_ids
    ).only("id", "name")
    grouped_data = defaultdict(list)
    total_duration = timedelta(0)

    for d in durations.select_related(
        "user", "task", "schedule"
    ).prefetch_related("task__tags", "schedule__tags"):
        related_tags = set()

        if d.task_id and d.task and hasattr(d.task, "tags"):
            related_tags.update(d.task.tags.values_list("id", flat=True))
        if d.schedule_id and d.schedule and hasattr(d.schedule, "tags"):
            related_tags.update(d.schedule.tags.values_list("id", flat=True))

        # Check tag have in tag_ids
        common_tag_ids = related_tags.intersection(tag_ids)
        if not common_tag_ids:
            continue

        duration = (
            (timezone.now() - d.started_at)
            if d.paused_at is None
            else (d.paused_at - d.started_at)
        )
        org_id = (
            d.task.organization_id
            if d.task_id
            else d.schedule.organization_id
            if d.schedule_id
            else None
        )
        if org_id is None or org_id not in organization_ids:
            continue

        for tag_id in common_tag_ids:
            grouped_data[(tag_id, org_id)].append(duration)
            total_duration += duration
    tag_map = {tag.id: tag.name for tag in tags}
    org_map = {org.id: org.name for org in organizations}
    tag_totals = {}

    for (tag_id, org_id), durations_list in grouped_data.items():
        total = sum(durations_list, timedelta())
        key = f"{tag_map[tag_id]}_{org_id}"
        name = (
            f"{org_map[org_id]} {tag_map[tag_id]}"
            if organization_ids_param == ALL_TEAM
            else tag_map[tag_id]
        )
        tag_totals[key] = {
            "organization_id": org_id,
            "organization_name": org_map[org_id],
            "tag_id": tag_id,
            "tag_name": name,
            "duration": total,
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
        filters &= Q(categories__large_statistic_category_id=large_category_id)
    elif large_category_id == NONE_CATEGORY:
        filters &= Q(categories__large_statistic_category__isnull=True)

    # Medium Category Filtering
    if medium_category_id and medium_category_id != NONE_CATEGORY:
        filters &= Q(
            categories__medium_statistic_category_id=medium_category_id
        )
    elif medium_category_id == NONE_CATEGORY:
        filters &= Q(categories__medium_statistic_category__isnull=True)

    # Small Category Filtering
    if small_category_id and small_category_id != NONE_CATEGORY:
        filters &= Q(categories__small_statistic_category_id=small_category_id)
    elif small_category_id == NONE_CATEGORY:
        filters &= Q(categories__small_statistic_category__isnull=True)

    return filters


def get_total_durations(durations, is_tag_page=False, tag_ids=[]):
    """
    Handle get total durations
    """
    total_duration = timedelta()
    for duration in durations:
        paused_at = duration.paused_at if duration.paused_at else timezone.now()
        if is_tag_page:
            obj = duration.task or duration.schedule
            related_tag_count = obj.tags.filter(id__in=tag_ids).count()
            total_duration += (
                paused_at - duration.started_at
            ) * related_tag_count
        else:
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


def process_team_categories(
    category_list,
    total_duration,
    durations=None,
    main_organization=None,
    calendar_organization=None,
):
    """Processes team durations, calculates percentages, and returns structured data."""
    team_data = {}
    percent = 0
    if not durations.exists() or category_list is None:
        return []
    # Group categories by organization
    for index, cat in enumerate(category_list):
        org_id = cat["organization_id"]
        org_name = cat["organization_name"]
        category_duration = cat["duration"] or timedelta(0)
        category = {
            "category_id": cat["category_id"],
            "category_name": cat["category_name"],
            "category_color": cat["category_color"],
            "duration": format_duration(category_duration),
        }
        # Calculate the percentage of the total duration
        (
            percent_per_total_duration,
            percent,
        ) = percentage_calculation_of_duration(
            total_duration.total_seconds(),
            category_duration.total_seconds(),
            percent,
        )

        if org_id in team_data:
            team_data[org_id]["data"].append(category)
            team_data[org_id]["percent"] += percent_per_total_duration
            team_data[org_id]["duration"] += category_duration
        else:
            team_data[org_id] = {
                "organization_id": org_id,
                "organization_name": org_name,
                "data": [category],
                "duration": category_duration,
                "percent": percent_per_total_duration,
            }
    return _handle_structure_data_for_team(
        team_data.values(), main_organization, calendar_organization
    )


def process_team_tags(
    tag_list,
    total_duration,
    durations=None,
    main_organization=None,
    calendar_organization=None,
):
    """Processes team durations, calculates percentages, and returns structured data."""
    team_data = {}
    percent = 0
    if not durations.exists() or tag_list is None:
        return []
    # Group categories by organization
    for index, tag in enumerate(tag_list):
        org_id = tag["organization_id"]
        org_name = tag["organization_name"]
        duration = tag["duration"] or timedelta(0)
        tag = {
            "tag_id": tag["tag_id"],
            "tag_name": tag["tag_name"],
            "duration": format_duration(duration),
        }
        # Calculate the percentage of the total duration
        (
            percent_per_total_duration,
            percent,
        ) = percentage_calculation_of_duration(
            total_duration.total_seconds(),
            duration.total_seconds(),
            percent,
        )

        if org_id in team_data:
            team_data[org_id]["data"].append(tag)
            team_data[org_id]["percent"] += percent_per_total_duration
            team_data[org_id]["duration"] += duration
        else:
            team_data[org_id] = {
                "organization_id": org_id,
                "organization_name": org_name,
                "data": [tag],
                "duration": duration,
                "percent": percent_per_total_duration,
            }

    return _handle_structure_data_for_team(
        team_data.values(), main_organization, calendar_organization
    )


def _handle_structure_data_for_team(
    team_data, main_organization, calendar_organization
):
    """
    Formatted data and restructure
    """
    response_data = {}
    # Restructure data
    for index, data in enumerate(team_data):
        org_id = data["organization_id"]
        org_name = data["organization_name"]
        duration = data["duration"]
        key = "main_org"
        color = MAIN_TEAM_COLOR
        if (
            org_id != main_organization.id
            and org_id == calendar_organization.id
        ):
            key = "calendar_org"
            org_name = CALENDAR
            color = CALENDAR_COLOR
        elif org_id != main_organization.id:
            key = "sub_org"
            org_name = SUB_TEAM
            color = SUB_TEAM_COLOR

        team = {
            "organization_id": org_id,
            "organization_name": data["organization_name"],
            "duration": duration,
        }
        if key in response_data:
            response_data[key]["sub_teams"].append(team)
            response_data[key]["duration"] += duration
            response_data[key]["percent"] += data["percent"]
        else:
            response_data[key] = {
                "organization_id": org_id,
                "organization_name": org_name,
                "percent": data["percent"],
                "duration": duration,
                "color": color,
            }
            if key == "sub_org":
                response_data[key]["sub_teams"] = [team]
                response_data[key]["organization_id"] = org_name
            else:
                response_data[key]["data"] = sorted(
                    data["data"],
                    key=lambda x: time_str_to_timedelta(x["duration"]),
                    reverse=True,
                )

    data_list = list(response_data.values())

    # Check total percentage and sort subteams by duration
    percent = 0
    for index, data in enumerate(data_list):
        last_element = index == len(response_data) - 1
        data["duration"] = format_duration(data["duration"])
        percent += data["percent"]
        if last_element and percent < 100:
            data["percent"] += 100 - percent
        if data.get("sub_teams"):
            data["sub_teams"] = sorted(
                data["sub_teams"], key=lambda x: x["duration"], reverse=True
            )
            data["sub_teams"] = [
                {**sub, "duration": format_duration(sub["duration"])}
                for sub in data["sub_teams"]
            ]
    return list(response_data.values())
