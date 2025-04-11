from collections import defaultdict
from datetime import timedelta

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

from calendars.models import Schedule
from common.serializers import CreationDataUserSerializer
from common.utils import (
    format_duration,
    time_str_to_timedelta,
)
from organizations.constants import CategoryColors
from organizations.models import OrganizationsStatisticCategories
from stat_data.constants import NONE_CATEGORY, FilterTime
from stat_data.serializers import (
    BaseStatisticTaskSerializer,
    BaseStatisticEventSerializer,
)
from tags.models import Tag
from tasks.constants import TaskCategoryTypes
from tasks.models import Task, TaskDuration


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
        filter_tasks &= Q(
            task__categories__large_statistic_category__id=large_id
        )
        filter_events &= Q(
            schedule__categories__large_statistic_category__id=large_id
        )
    if medium_id:
        filter_tasks &= Q(
            task__categories__medium_statistic_category__id=medium_id
        )
        filter_events &= Q(
            schedule__categories__medium_statistic_category__id=medium_id
        )
    if small_id:
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
        base_filter = Q(
            started_at__gte=start_of_day,
            paused_at__lte=end_of_day,
        )
        if not start_of_day and not end_of_day:
            return TaskDuration.objects.none()
        durations = TaskDuration.objects.filter(base_filter)
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


def get_category_durations(
    queryset,
    large_category_id=None,
    medium_category_id=None,
):
    """
    Splits the queryset into two parts:
    - One with a large statistic category
    - One without a large statistic category
    """
    with_large = queryset.filter(
        Q(categories__large_statistic_category__isnull=False)
    ).values(
        "categories__large_statistic_category__id",
        "categories__large_statistic_category__name",
        "organization__id",
    )
    if large_category_id:
        with_large = with_large.filter(
            Q(categories__medium_statistic_category__isnull=False)
            & Q(categories__large_statistic_category__id=large_category_id)
        ).values(
            "categories__medium_statistic_category__id",
            "categories__medium_statistic_category__name",
            "organization__id",
        )
        if medium_category_id:
            with_large = with_large.filter(
                Q(categories__medium_statistic_category__id=medium_category_id)
                & Q(categories__small_statistic_category__isnull=False)
            ).values(
                "categories__small_statistic_category__id",
                "categories__small_statistic_category__name",
                "organization__id",
            )

    return with_large.distinct()


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
    tasks,
    events,
    large_category_id=None,
    medium_category_id=None,
    durations=None,
    start_of_day=None,
    end_of_day=None,
):
    """Aggregates durations from tasks or events into a single dictionary."""
    category_dict = {}
    combine_cards = list(
        get_category_durations(tasks, large_category_id, medium_category_id)
    ) + list(
        get_category_durations(events, large_category_id, medium_category_id)
    )
    category_fields = [
        (
            "categories__large_statistic_category__name",
            "categories__large_statistic_category__id",
        ),
        (
            "categories__medium_statistic_category__name",
            "categories__medium_statistic_category__id",
        ),
        (
            "categories__small_statistic_category__name",
            "categories__small_statistic_category__id",
        ),
    ]
    for card in combine_cards:
        category_name, category_id, category_color = None, None, None
        organization_id = card["organization__id"]
        for name_key, id_key in category_fields:
            if card.get(name_key):
                category_name = card[name_key]
                category_id = card[id_key]
                break
        organization_statistic_cats = (
            OrganizationsStatisticCategories.objects.filter(
                organization_id=organization_id,
            )
        )
        filter_durations = None
        if not large_category_id and not medium_category_id:
            category_color = (
                organization_statistic_cats.filter(
                    large_statistic_category__id=category_id,
                )
                .values_list("color", flat=True)
                .first()
            )
            filter_durations = get_list_durations_by_users(
                durations=durations,
                large_id=category_id,
            )
        if large_category_id:
            filter_durations = get_list_durations_by_users(
                durations=durations,
                large_id=large_category_id,
                medium_id=category_id,
            )
            if medium_category_id:
                filter_durations = get_list_durations_by_users(
                    durations=durations,
                    large_id=large_category_id,
                    medium_id=medium_category_id,
                    small_id=category_id,
                )
        duration = (
            annotate_duration(filter_durations, start_of_day, end_of_day)[
                "total_duration"
            ]
            if filter_durations
            else timedelta(0)
        )
        if not large_category_id and not medium_category_id:
            key = category_name if category_color else "empty_category"
        else:
            key = category_name

        if (
            key not in category_dict
            and not large_category_id
            and not medium_category_id
        ):
            category_dict[key] = {
                "category_id": category_id if category_color else None,
                "category_name": category_name
                if category_color
                else NONE_CATEGORY,
                "category_color": category_color
                if category_color
                else CategoryColors.GRAY.value,
                "duration": duration,
            }
        else:
            check_medium_category_exists = (
                large_category_id
                and not medium_category_id
                and not organization_statistic_cats.filter(
                    large_statistic_category__id=large_category_id,
                    medium_statistic_category__id=category_id,
                ).exists()
            )
            check_small_category_exists = (
                large_category_id
                and medium_category_id
                and not organization_statistic_cats.filter(
                    large_statistic_category__id=large_category_id,
                    medium_statistic_category__id=medium_category_id,
                    small_statistic_category__id=category_id,
                ).exists()
            )
            check_not_have_color = (
                not large_category_id
                and not medium_category_id
                and not category_color
            )
            if (
                check_medium_category_exists
                or check_small_category_exists
                or (
                    large_category_id and medium_category_id and not category_id
                )
                or check_not_have_color
            ):
                if category_dict.get("empty_category") is None:
                    category_dict["empty_category"] = {
                        "category_id": None,
                        "category_name": NONE_CATEGORY,
                        "category_color": CategoryColors.GRAY.value,
                        "duration": duration,
                    }
                else:
                    category_dict["empty_category"]["duration"] += duration
            else:
                category_dict[key] = {
                    "category_id": category_id,
                    "category_name": category_name,
                    "category_color": category_color,
                    "duration": duration,
                }

    filter_durations = get_duration_of_none_category(
        durations, large_category_id, medium_category_id
    )
    if filter_durations.exists():
        if category_dict.get("empty_category") is None:
            category_dict["empty_category"] = {
                "category_id": None,
                "category_name": NONE_CATEGORY,
                "category_color": CategoryColors.GRAY.value,
                "duration": annotate_duration(
                    filter_durations, start_of_day, end_of_day
                )["total_duration"],
            }
        else:
            category_dict["empty_category"]["duration"] += annotate_duration(
                filter_durations, start_of_day, end_of_day
            )["total_duration"]

    return list(category_dict.values())


def process_categories(
    category_list,
    total_duration,
    tasks=None,
    events=None,
    start_of_day=None,
    end_of_day=None,
    category_type=None,
    is_with_tasks=False,
    users=None,
    durations=None,
):
    """Processes category durations, calculates percentages, and returns structured data."""
    percent = 100
    categories_data = []
    category_id_map = {
        TaskCategoryTypes.LARGE.value: "categories__large_statistic_category__id",
        TaskCategoryTypes.MEDIUM.value: "categories__medium_statistic_category__id",
        TaskCategoryTypes.SMALL.value: "categories__small_statistic_category__id",
    }
    category_in_map = {
        TaskCategoryTypes.LARGE.value: "categories__large_statistic_category__in",
        TaskCategoryTypes.MEDIUM.value: "categories__medium_statistic_category__in",
        TaskCategoryTypes.SMALL.value: "categories__small_statistic_category__in",
    }
    category_id_null_map = {
        TaskCategoryTypes.LARGE.value: "categories__large_statistic_category__isnull",
        TaskCategoryTypes.MEDIUM.value: "categories__medium_statistic_category__isnull",
        TaskCategoryTypes.SMALL.value: "categories__small_statistic_category__isnull",
    }
    filter_duration_by_type_category = {
        TaskCategoryTypes.LARGE.value: "large_id",
        TaskCategoryTypes.MEDIUM.value: "medium_id",
        TaskCategoryTypes.SMALL.value: "small_id",
    }
    if durations and not durations.exists() or category_list is None:
        return []
    category_ids = []
    for item in category_list:
        if item.get("category_id") is not None:
            category_ids.append(item["category_id"])
    for cat in category_list:
        data = {
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
        if tasks or events:
            filter_key = category_id_map[category_type]
            if category_id:
                task_filter = tasks.filter(Q(**{filter_key: category_id}))
                event_filter = events.filter(Q(**{filter_key: category_id}))
            else:
                task_filter = tasks.filter(
                    Q(**{category_id_null_map[category_type]: True})
                    | ~Q(**{category_in_map[category_type]: category_ids})
                )
                event_filter = events.filter(
                    Q(**{category_id_null_map[category_type]: True})
                    | ~Q(**{category_in_map[category_type]: category_ids})
                )
            if is_with_tasks:
                data["tasks"] = (
                    BaseStatisticTaskSerializer(
                        task_filter.all()[:3],
                        many=True,
                        context={
                            "start_of_day": start_of_day,
                            "end_of_day": end_of_day,
                            "total_duration": category_duration,
                        },
                    ).data
                    + BaseStatisticEventSerializer(
                        event_filter.all()[:3],
                        many=True,
                        context={
                            "start_of_day": start_of_day,
                            "end_of_day": end_of_day,
                            "total_duration": category_duration,
                        },
                    ).data
                )
            elif users:
                filter_key = filter_duration_by_type_category[category_type]
                if category_id:
                    filter_durations = get_list_durations_by_users(
                        durations=durations,
                        **{filter_key: category_id},
                    )
                else:
                    filter_duration = Q()
                    if category_type == TaskCategoryTypes.LARGE.value:
                        filter_duration &= Q(
                            Q(
                                task__categories__large_statistic_category__isnull=True
                            )
                            & Q(
                                schedule__categories__large_statistic_category__isnull=True
                            )
                        )
                    elif category_type == TaskCategoryTypes.MEDIUM.value:
                        filter_duration &= Q(
                            Q(
                                task__categories__medium_statistic_category__isnull=True
                            )
                            & Q(
                                schedule__categories__medium_statistic_category__isnull=True
                            )
                        )
                    elif category_type == TaskCategoryTypes.SMALL.value:
                        filter_duration &= Q(
                            Q(
                                task__categories__small_statistic_category__isnull=True
                            )
                            & Q(
                                schedule__categories__small_statistic_category__isnull=True
                            )
                        )
                    filter_durations = durations.filter(filter_duration)

                data["users"] = process_users(
                    time_str_to_timedelta(category_duration),
                    filter_durations,
                    users,
                )

        # Calculate the percentage of the total duration
        if total_duration.total_seconds() > 0:
            percent_per_total_duration = (
                time_str_to_timedelta(category_duration).total_seconds()
                / total_duration.total_seconds()
                * 100
            )
        else:
            percent_per_total_duration = 0

        # Ensure percentage does not exceed remaining percent
        if round(percent_per_total_duration) <= percent:
            percent -= round(percent_per_total_duration)
        else:
            percent_per_total_duration = percent

        data.update(
            {
                "category_id": category_id if category_id else NONE_CATEGORY,
                "category_name": category_name,
                "category_color": category_color,
                "duration": category_duration,
                "percent": min(round(percent_per_total_duration), 100),
            }
        )

        # Append category data
        categories_data.append(data)

    return categories_data


def process_users(
    total_duration,
    durations=None,
    users=None,
):
    """Processes users durations, calculates percentages, and returns structured data."""
    user_data = []
    percent = 100
    for user in users:
        if not durations.exists():
            continue
        filter_durations = get_list_durations_by_users(
            durations=durations, users=[user]
        )
        if filter_durations:
            duration = get_total_durations(filter_durations)
            # Calculate the percentage of the total duration
            if total_duration.total_seconds() > 0:
                percent_per_total_duration = (
                    duration.total_seconds()
                    / total_duration.total_seconds()
                    * 100
                )
            else:
                percent_per_total_duration = 0

            # Ensure percentage does not exceed remaining percent
            if round(percent_per_total_duration) <= percent:
                percent -= round(percent_per_total_duration)
            else:
                percent_per_total_duration = percent
            # Append category data
            user_serializer = CreationDataUserSerializer(user).data
            user_data.append(
                {
                    "user": user_serializer,
                    "duration": format_duration(duration),
                    "percent": min(round(percent_per_total_duration), 100),
                }
            )

    return user_data


def process_tags(
    tag_list,
    total_duration,
    tasks=None,
    events=None,
    start_of_day=None,
    end_of_day=None,
    is_with_tasks=False,
    users=None,
    durations=None,
):
    """Processes category durations, calculates percentages, and returns structured data."""
    percent = 100
    tags_data = []
    if durations and not durations.exists() or tag_list is None:
        return []
    for tag in tag_list:
        tag_duration = format_duration(tag["duration"]) or timedelta(0)
        if percent == 0:
            continue
        data = {
            "tag_id": tag["tag_id"],
            "tag_name": tag["tag_name"],
            "duration": tag_duration,
            "percent": None,
        }

        if tasks or events:
            if tag["tag_id"]:
                task_filter = tasks.filter(tags__id=tag["tag_id"]).all()
                event_filter = events.filter(tags__id=tag["tag_id"]).all()
                filter_durations = get_list_durations_by_users(
                    durations=durations, tags=[tag["tag_id"]]
                )
                if is_with_tasks:
                    data["tasks"] = (
                        BaseStatisticTaskSerializer(
                            task_filter.all()[:3],
                            many=True,
                            context={
                                "start_of_day": start_of_day,
                                "end_of_day": end_of_day,
                            },
                        ).data
                        + BaseStatisticEventSerializer(
                            event_filter.all()[:3],
                            many=True,
                            context={
                                "start_of_day": start_of_day,
                                "end_of_day": end_of_day,
                            },
                        ).data
                    )
                elif users:
                    data["users"] = process_users(
                        time_str_to_timedelta(tag_duration),
                        filter_durations,
                        users,
                    )

        # Calculate the percentage of the total duration
        if total_duration.total_seconds() > 0:
            percent_per_total_duration = (
                time_str_to_timedelta(tag_duration).total_seconds()
                / total_duration.total_seconds()
                * 100
            )
        else:
            percent_per_total_duration = 0

        # Ensure percentage does not exceed remaining percent
        if round(percent_per_total_duration) <= percent:
            percent -= round(percent_per_total_duration)
        else:
            percent_per_total_duration = percent

        data["percent"] = min(round(percent_per_total_duration), 100)

        # Append category data
        tags_data.append(data)

    return tags_data


def process_per_user(
    users,
    tasks,
    events,
    start_of_day,
    end_of_day,
    large_category_id=None,
    medium_category_id=None,
    is_tag=False,
    tag_ids=None,
    durations=None,
):
    """
    Handle process category per user.
    """
    total_duration = timedelta()
    aggregate_total = []
    tags = []
    if not durations.exists():
        return None, None
    if tag_ids:
        tags = Tag.objects.filter(id__in=tag_ids).all()
    for user in users:
        filter_durations = get_list_durations_by_users(
            durations=durations, users=[user]
        )
        if not filter_durations:
            continue
        if is_tag and tags:
            tag_totals = []
            for tag in tags:
                args = {
                    "durations": filter_durations,
                    "tags": [tag],
                }

                if large_category_id:
                    args["large_id"] = large_category_id
                    args["medium_id"] = medium_category_id

                filter_duration_by_tag = get_list_durations_by_users(**args)
                if not filter_duration_by_tag.exists():
                    continue
                duration = get_total_durations(filter_duration_by_tag)
                total_duration += duration

                tag_totals.append(
                    {
                        "tag_id": tag.id,
                        "tag_name": tag.name,
                        "duration": duration,
                    }
                )
            aggregate_total.append(tag_totals)
        else:
            if large_category_id:
                filter_durations = get_list_durations_by_users(
                    durations=filter_durations,
                    large_id=large_category_id,
                    medium_id=medium_category_id,
                )

            duration = get_total_durations(filter_durations)
            total_duration += duration
            # Get list large category per user
            aggregate_total.append(
                aggregate_durations(
                    tasks,
                    events,
                    durations=filter_durations,
                    start_of_day=start_of_day,
                    end_of_day=end_of_day,
                    large_category_id=large_category_id,
                    medium_category_id=medium_category_id,
                )
            )
    if is_tag:
        key_id = "tag_id"
        name_key = "tag_name"
        extra_keys = {}  # Dont need color while is_tag
    else:
        key_id = "category_id"
        name_key = "category_name"
        extra_keys = {"category_color": None}

    # Handle sum duration and merge same id
    result_dict = defaultdict(
        lambda: {name_key: None, "duration": timedelta(), **extra_keys}
    )
    for sublist in aggregate_total:
        for item in sublist:
            item_id = item[key_id]
            result_dict[item_id][name_key] = item[name_key]
            result_dict[item_id]["duration"] += (
                item["duration"] if item.get("duration") else timedelta()
            )
            if not is_tag and "category_color" in item:
                result_dict[item_id]["category_color"] = item["category_color"]

    result_list = [{key_id: k, **v} for k, v in result_dict.items()]
    return total_duration, result_list


def process_merge_card_per_tag(
    tag_ids,
    durations=None,
):
    """
    Handle process category per user.
    """
    total_duration = timedelta(0)
    tag_totals = []
    tags = Tag.objects.filter(id__in=tag_ids).all()
    if durations is None or not durations.exists():
        return total_duration, []
    for tag in tags:
        filter_durations = get_list_durations_by_users(
            durations=durations, tags=[tag.id]
        )
        if not filter_durations:
            continue
        duration = get_total_durations(filter_durations)
        total_duration += duration

        tag_totals.append(
            {
                "tag_id": tag.id,
                "tag_name": tag.name,
                "duration": duration,
            }
        )

    return total_duration, tag_totals


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
    large_category_ids=None,
    medium_category_ids=None,
    small_category_ids=None,
    created_at=None,
    NONE_CATEGORY=None,
):
    """
    Handle build category filter
    """
    filters = Q()

    # Large Category Filtering
    if large_category_id and large_category_id != NONE_CATEGORY:
        filters &= Q(categories__large_statistic_category__id=large_category_id)
    elif large_category_id == NONE_CATEGORY:
        filters &= Q(categories__large_statistic_category__isnull=True) | ~Q(
            categories__large_statistic_category__in=large_category_ids
        )

    # Medium Category Filtering
    if medium_category_id and medium_category_id != NONE_CATEGORY:
        filters &= Q(
            categories__medium_statistic_category__id=medium_category_id
        )
    elif medium_category_id == NONE_CATEGORY:
        filters &= Q(categories__medium_statistic_category__isnull=True) | ~Q(
            categories__medium_statistic_category__in=medium_category_ids
        )

    # Small Category Filtering
    if small_category_id and small_category_id != NONE_CATEGORY:
        filters &= Q(categories__small_statistic_category__id=small_category_id)
    elif small_category_id == NONE_CATEGORY:
        filters &= Q(categories__small_statistic_category__isnull=True) | ~Q(
            categories__small_statistic_category__in=small_category_ids
        )

    # Created At Filter
    if created_at:
        filters &= Q(created_at__lt=created_at)

    return filters


def get_total_durations(durations):
    """
    Handle get total durations
    """
    total_duration = timedelta()
    for duration in durations:
        paused_at = duration.paused_at if duration.paused_at else timezone.now()
        total_duration += paused_at - duration.started_at
    return total_duration


def get_duration_of_none_category(durations, large_id=None, medium_id=None):
    """
    Handle get total durations of none category
    """
    filter_durations = durations.filter(
        Q(task__categories__large_statistic_category__isnull=True)
        & Q(schedule__categories__large_statistic_category__isnull=True)
    )

    if large_id:
        filter_durations = get_list_durations_by_users(
            durations=durations,
            large_id=large_id,
        ).filter(
            Q(task__categories__medium_statistic_category__isnull=True)
            & Q(schedule__categories__medium_statistic_category__isnull=True)
        )

        if medium_id:
            filter_durations = get_list_durations_by_users(
                durations=durations,
                large_id=large_id,
                medium_id=medium_id,
            ).filter(
                Q(task__categories__small_statistic_category__isnull=True)
                & Q(schedule__categories__small_statistic_category__isnull=True)
            )

    return filter_durations
