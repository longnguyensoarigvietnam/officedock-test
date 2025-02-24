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
from common.utils import (
    generate_random_color,
    format_duration,
    time_str_to_timedelta,
)
from organizations.models import OrganizationsStatisticCategories
from stat_data.constants import NONE_CATEGORY
from stat_data.serializers import (
    StatisticTaskSerializer,
    StatisticEventSerializer,
    BaseStatisticTaskSerializer,
    BaseStatisticEventSerializer,
)
from tasks.constants import TaskCategoryTypes
from tasks.models import Task


def get_list_models(
    start_of_day,
    end_of_day,
    organizations=None,
    users=None,
    tags=None,
    large_categories=None,
):
    """
    Return list models by organizations, users and tags
    """
    tasks = Task.objects.filter(
        Q(task_durations__started_at__gte=start_of_day)
        & Q(task_durations__paused_at__lte=end_of_day)
    ).distinct()
    events = Schedule.objects.filter(
        Q(task_durations__started_at__gte=start_of_day)
        & Q(task_durations__paused_at__lte=end_of_day)
    ).distinct()
    if organizations:
        tasks = tasks.filter(organization__in=organizations)
        events = events.filter(organization__in=organizations)
    if users:
        tasks = tasks.filter(people_in_charge_tasks__user__in=users)
        events = events.filter(participants__in=users)
    if large_categories:
        tasks = tasks.filter(
            Q(categories__large_statistic_category__id__in=large_categories)
            | Q(categories__large_statistic_category__isnull=True)
        )
        events = events.filter(
            Q(categories__large_statistic_category__id__in=large_categories)
            | Q(categories__large_statistic_category__isnull=True)
        )

    if tags:
        tasks = tasks.filter(tags__in=tags)
        events = events.filter(tags__in=tags)

    return tasks, events


def get_list_users(queryset, is_task_model=False):
    """
    Handle group model by user.
    """
    if is_task_model:
        list_users = queryset.all().values("people_in_charge__id")
        users = [user["people_in_charge__id"] for user in list_users]
    else:
        list_users = queryset.all().values("participants__id")
        users = [user["participants__id"] for user in list_users]

    return users


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
            categories__large_statistic_category__id=large_category_id
        ).values(
            "categories__medium_statistic_category__id",
            "categories__medium_statistic_category__name",
            "organization__id",
        )
    if medium_category_id:
        with_large = with_large.filter(
            categories__medium_statistic_category__id=medium_category_id
        ).values(
            "categories__small_statistic_category__id",
            "categories__small_statistic_category__name",
            "organization__id",
        )
    with_large = with_large.annotate(duration=Sum("duration"))

    without_large = queryset.filter(
        Q(categories__large_statistic_category__isnull=True)
    )
    if large_category_id:
        without_large = without_large.filter(
            Q(categories__large_statistic_category__id=large_category_id)
            & Q(categories__medium_statistic_category__isnull=True)
        )
    if medium_category_id:
        without_large = without_large.filter(
            Q(categories__medium_statistic_category__id=medium_category_id)
            & Q(categories__small_statistic_category__isnull=True)
        )
    without_large = without_large.annotate(duration=Sum("duration")).values(
        "duration"
    )

    return with_large, without_large


def get_tag_durations(queryset):
    """
    Splits the queryset with a tag
    """
    queryset = queryset.values(
        "tags__name",
        "tags__id",
    ).annotate(duration=Sum("duration"))
    return queryset


def annotate_duration(queryset, start_of_day, end_of_day):
    """
    Handle return duration of queryset
    """
    return queryset.annotate(
        duration=ExpressionWrapper(
            Case(
                When(
                    task_durations__paused_at__isnull=True,
                    then=end_of_day if end_of_day < timezone.now() else Now(),
                ),
                default=F("task_durations__paused_at"),
                output_field=DurationField(),
            )
            - Coalesce(F("task_durations__started_at"), start_of_day),
            output_field=DurationField(),
        )
    )


def aggregate_durations(
    tasks, events, large_category_id=None, medium_category_id=None
):
    """Aggregates durations from tasks or events into a single dictionary."""
    (
        task_with_category_large_durations,
        task_without_large_durations,
    ) = get_category_durations(tasks, large_category_id, medium_category_id)
    (
        event_with_category_large_durations,
        event_without_large_durations,
    ) = get_category_durations(events, large_category_id, medium_category_id)
    category_dict = {}
    combine_cards = list(task_with_category_large_durations) + list(
        event_with_category_large_durations
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
        category_name, category_id = None, None
        organization_id = card["organization__id"]
        for name_key, id_key in category_fields:
            if card.get(name_key):
                category_name = card[name_key]
                category_id = card[id_key]
                break
        category_color = (
            OrganizationsStatisticCategories.objects.filter(
                organization_id=organization_id,
                large_statistic_category__name=category_name,
            )
            .values_list("color", flat=True)
            .first()
        )
        duration = card["duration"]

        if category_name in category_dict:
            category_dict[category_name]["duration"] += duration
        else:
            category_dict[category_name] = {
                "category_id": category_id,
                "category_name": category_name,
                "category_color": category_color,
                "duration": duration,
            }

    if task_without_large_durations:
        if category_dict.get("empty_category") is None:
            category_dict["empty_category"] = {
                "category_id": None,
                "category_name": None,
                "category_color": generate_random_color(),
                "duration": timedelta(0),
            }
        for task in task_without_large_durations:
            category_dict["empty_category"]["duration"] += task["duration"]
    if event_without_large_durations:
        if category_dict.get("empty_category") is None:
            category_dict["empty_category"] = {
                "category_id": None,
                "category_name": None,
                "category_color": generate_random_color(),
                "duration": timedelta(0),
            }
        for event in event_without_large_durations:
            category_dict["empty_category"]["duration"] += event["duration"]
    return list(category_dict.values())


def aggregate_durations_by_tag(tasks, events, tag_ids=None):
    """Aggregates durations from tasks or events by tag name into a single dictionary."""

    task_with_tag = get_tag_durations(tasks)
    event_with_tag = get_tag_durations(events)

    tag_dict = {}
    combine_cards = list(task_with_tag) + list(event_with_tag)
    for card in combine_cards:
        tag_id = card["tags__id"]
        tag_name = card["tags__name"]
        duration = card["duration"]
        if tag_id and tag_id in tag_ids:
            if tag_name in tag_dict:
                tag_dict[tag_name]["duration"] += duration
            else:
                tag_dict[tag_name] = {
                    "tag_id": tag_id,
                    "tag_name": tag_name,
                    "duration": duration,
                }

    return list(tag_dict.values())


def merge_task_and_event(tasks, events, start_of_day, end_of_day):
    """Merge task and event"""
    return (
        StatisticTaskSerializer(
            tasks,
            many=True,
            context={
                "start_of_day": start_of_day,
                "end_of_day": end_of_day,
            },
        ).data
        + StatisticEventSerializer(
            events,
            many=True,
            context={
                "start_of_day": start_of_day,
                "end_of_day": end_of_day,
            },
        ).data
    )


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
):
    """Processes category durations, calculates percentages, and returns structured data."""
    percent = 100
    categories_data = []
    category_id_map = {
        TaskCategoryTypes.LARGE.value: "categories__large_statistic_category__id",
        TaskCategoryTypes.MEDIUM.value: "categories__medium_statistic_category__id",
        TaskCategoryTypes.SMALL.value: "categories__small_statistic_category__id",
    }
    category_id_null_map = {
        TaskCategoryTypes.LARGE.value: "categories__large_statistic_category__isnull",
        TaskCategoryTypes.MEDIUM.value: "categories__medium_statistic_category__isnull",
        TaskCategoryTypes.SMALL.value: "categories__small_statistic_category__isnull",
    }
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
                task_filter = tasks.filter(
                    Q(**{filter_key: category_id})
                    | Q(**{category_id_null_map[category_type]: True})
                )
                event_filter = events.filter(
                    Q(**{filter_key: category_id})
                    | Q(**{category_id_null_map[category_type]: True})
                )
            else:
                task_filter = tasks.filter(
                    **{category_id_null_map[category_type]: True}
                )
                event_filter = events.filter(
                    **{category_id_null_map[category_type]: True}
                )
            if is_with_tasks:
                task_filter = tasks.filter(Q(**{filter_key: category_id}))
                event_filter = events.filter(Q(**{filter_key: category_id}))
                limit_task = 5
                limit_event = 5
                task_count = task_filter.count()
                event_count = event_filter.count()
                total_count = task_count + event_count
                if total_count <= 10:
                    limit_task = task_count
                    limit_event = event_count
                elif task_count > 5 > event_count:
                    limit_task = 10 - event_count
                    limit_event = event_count
                elif task_count < 5 < event_count:
                    limit_event = 10 - task_count
                    limit_task = task_count

                data["tasks"] = (
                    BaseStatisticTaskSerializer(
                        task_filter.all()[:limit_task],
                        many=True,
                        context={
                            "start_of_day": start_of_day,
                            "end_of_day": end_of_day,
                            "total_duration": category_duration,
                        },
                    ).data
                    + BaseStatisticEventSerializer(
                        event_filter.all()[:limit_event],
                        many=True,
                        context={
                            "start_of_day": start_of_day,
                            "end_of_day": end_of_day,
                            "total_duration": category_duration,
                        },
                    ).data
                )
            elif users:
                data["users"] = process_users(
                    time_str_to_timedelta(category_duration),
                    task_filter,
                    event_filter,
                    start_of_day,
                    end_of_day,
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


def get_duration_of_category(categories, category_id):
    """Handle get duration of category"""
    duration = timedelta()
    for cat in categories:
        if cat["category_id"] == int(category_id):
            duration = time_str_to_timedelta(cat["duration"])
            break
    return duration


def process_users(
    total_duration,
    tasks=None,
    events=None,
    start_of_day=None,
    end_of_day=None,
    users=None,
):
    """Processes users durations, calculates percentages, and returns structured data."""
    user_data = []
    percent = 100
    for user in users:
        user_tasks = tasks.filter(people_in_charge=user)
        user_events = events.filter(participants=user)
        if user_tasks or user_events:
            duration = timedelta()
            combine_tasks = merge_task_and_event(
                user_tasks, user_events, start_of_day, end_of_day
            )
            for task in combine_tasks:
                duration += time_str_to_timedelta(task["total_duration"])

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
            user_data.append(
                {
                    "user": {
                        "id": user.id,
                        "full_name": user.profile.full_name,
                    },
                    "duration": format_duration(duration),
                    "percent": min(round(percent_per_total_duration), 100),
                    # "tasks": combine_tasks,
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
    is_with_users=False,
):
    """Processes category durations, calculates percentages, and returns structured data."""
    percent = 100
    tags_data = []

    for tag in tag_list:
        tag_duration = format_duration(tag["duration"]) or timedelta(0)
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

                if is_with_tasks:
                    data["tasks"] = merge_task_and_event(
                        task_filter, event_filter, start_of_day, end_of_day
                    )
                elif is_with_users:
                    data["users"] = process_users(
                        time_str_to_timedelta(tag_duration),
                        task_filter,
                        event_filter,
                        start_of_day,
                        end_of_day,
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


def process_category_per_user(
    users,
    tasks,
    events,
    start_of_day,
    end_of_day,
    large_category_id=None,
    medium_category_id=None,
    is_get_total_duration=False,
):
    """
    Handle process category per user.
    """
    total_duration = timedelta()
    category_totals = []
    for user in users:
        filter_tasks = tasks.filter(people_in_charge_tasks__user=user)
        filter_events = events.filter(participants=user)
        if filter_tasks or filter_events:
            if is_get_total_duration:
                merged_duration = merge_task_and_event(
                    filter_tasks, filter_events, start_of_day, end_of_day
                )
                # Calculate total duration
                for task in merged_duration:
                    total_duration += time_str_to_timedelta(
                        task["total_duration"]
                    )
            # Get list large category per user
            category_totals.append(
                aggregate_durations(
                    annotate_duration(filter_tasks, start_of_day, end_of_day),
                    annotate_duration(filter_events, start_of_day, end_of_day),
                    large_category_id,
                    medium_category_id,
                )
            )
    # Handle sum duration and merge category has same id
    category_list = defaultdict(
        lambda: {
            "category_name": None,
            "category_color": None,
            "duration": timedelta(),
        }
    )
    for sublist in category_totals:
        for item in sublist:
            category_id = item["category_id"]
            category_list[category_id]["category_name"] = item["category_name"]
            category_list[category_id]["category_color"] = item[
                "category_color"
            ]
            category_list[category_id]["duration"] += item["duration"]
    category_list = [{"category_id": k, **v} for k, v in category_list.items()]

    return total_duration, category_list


def process_merge_card_per_tag(
    tag_ids,
    tasks,
    events,
    start_of_day,
    end_of_day,
    is_get_total_duration=False,
):
    """
    Handle process category per user.
    """
    total_duration = timedelta()
    category_totals = []
    for tag_id in tag_ids:
        filter_tasks = tasks.filter(tags__id=tag_id)
        filter_events = events.filter(tags__id=tag_id)
        if filter_tasks or filter_events:
            if is_get_total_duration:
                merged_duration = merge_task_and_event(
                    filter_tasks, filter_events, start_of_day, end_of_day
                )
                # Calculate total duration
                for task in merged_duration:
                    total_duration += time_str_to_timedelta(
                        task["total_duration"]
                    )

            category_totals.append(
                aggregate_durations_by_tag(
                    annotate_duration(filter_tasks, start_of_day, end_of_day),
                    annotate_duration(filter_events, start_of_day, end_of_day),
                    tag_ids=tag_ids,
                )
            )
    # Handle sum duration and merge category has same id
    tag_list = defaultdict(lambda: {"tag_name": None, "duration": timedelta()})
    for sublist in category_totals:
        for item in sublist:
            tag_id = item["tag_id"]
            tag_list[tag_id]["tag_name"] = item["tag_name"]
            tag_list[tag_id]["duration"] += item["duration"]
    tag_list = [{"tag_id": k, **v} for k, v in tag_list.items()]

    return total_duration, tag_list
