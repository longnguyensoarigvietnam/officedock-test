from datetime import datetime, time, timedelta
import re
from itertools import chain

from django.db.models import (
    Q,
    ExpressionWrapper,
    Case,
    When,
    DurationField,
    F,
    Sum,
)
from django.db.models.functions import Now, Coalesce
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES
from base.paginations import BasePagination
from calendars.models import Schedule
from common.constants import DATE_REGEX, BASE_DATE_FORMAT
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    transform_statistic_categories,
    generate_random_color,
)
from organizations.models import Organization, OrganizationsStatisticCategories
from organizations.serializers import OrganizationDetailSerializer
from stat_data.constants import NONE_CATEGORY
from stat_data.serializers import (
    DailyEventSerializer,
    DailyTaskSerializer,
    StatisticTaskSerializer,
    StatisticEventSerializer,
)
from stat_data.utils import (
    annotate_duration,
    aggregate_durations,
    process_categories,
    get_duration_of_category,
    merge_task_and_event,
    get_list_models,
    process_tags,
    process_merge_card_per_tag,
    process_per_user,
)
from tasks.constants import TaskCategoryTypes
from tasks.models import Task, TaskDuration
from tasks.utils import split_date_range
from users.models import User
from users.serializers import DailyReportSerializer, BaseUserSerializer
from roles.constants import Screens
from base.permissions import ActionPermission


@extend_schema(tags=["System > Stat Data"])
class StatDataViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    Endpoint api stat data
    """

    permission_classes = [ActionPermission]
    screen_name = Screens.STATISTIC.value

    def _separate_duration(self, duration, end_date):
        """
        Handle update and create duration by intervals
        """
        if duration.started_at.date() < timezone.now().date():
            intervals = split_date_range(duration.started_at, end_date)
            _, first_end_time = intervals.pop(0)
            duration.paused_at = first_end_time
            duration.save()
            if len(intervals) >= 1:
                last_date_start, _ = intervals.pop(-1)
                # Create duration continue running
                TaskDuration.objects.create(
                    task_id=duration.task_id,
                    started_at=last_date_start,
                    paused_at=None,
                )
            if intervals is not []:
                for start, end in intervals:
                    TaskDuration.objects.create(
                        task_id=duration.task_id,
                        started_at=start,
                        paused_at=end,
                    )

            return True

    @extend_schema(
        parameters=[
            OpenApiParameter(name="date", type=datetime),
            OpenApiParameter(name="user_id", type=int),
            OpenApiParameter(name="organization_id", type=int),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="daily-report",
        serializer_class=None,
    )
    def daily_report(self, request, *args, **kwargs):
        """
        Return daily report data by date
        """
        if user_id := request.query_params.get("user_id"):
            user = User.objects.filter(id=user_id).first()
        else:
            user = request.user

        if not user:
            raise NotFound()

        prev_user = None
        next_user = None
        organization = None
        organization_id = request.query_params.get("organization_id")
        # Find previous and next user in organization by current user
        if organization_id:
            organization = Organization.objects.get(pk=organization_id)
            users = list(organization.users.all().order_by("created_at"))
            # Find the user's position in the list
            try:
                index = users.index(user)  # Get index of the requesting user
            except ValueError:
                raise NotFound(
                    {
                        "detail": ERROR_MESSAGES["staff_not_exists"].format(
                            id=user_id
                        )
                    }
                )
            # Get previous and next users safely
            prev_user = users[index - 1].id if index > 0 else None
            next_user = users[index + 1].id if index < len(users) - 1 else None

        date = request.query_params.get("date", None)

        # Validate date format using regex
        if not date or not re.match(DATE_REGEX, date):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        if not date:
            date = timezone.now().date()
        else:
            date = datetime.strptime(date, BASE_DATE_FORMAT).date()

        start_of_day = datetime.combine(date, time.min)
        start_of_today = datetime.combine(timezone.now().date(), time.min)
        end_of_day = datetime.combine(date, time.max)

        tasks = (
            Task.objects.filter(
                Q(
                    Q(people_in_charge_tasks__user__in=[user])
                    & Q(task_durations__paused_at__isnull=True)
                )
            )
            .all()
            .distinct()
        )

        events = (
            Schedule.objects.filter(
                Q(
                    Q(participants__in=[user])
                    & Q(task_durations__paused_at__isnull=True)
                )
            )
            .all()
            .distinct()
        )
        for task in tasks:
            durations = task.task_durations.filter(paused_at__isnull=True).all()
            for duration in durations:
                self._separate_duration(duration, timezone.now())
        for event in events:
            durations = event.task_durations.filter(
                paused_at__isnull=True
            ).all()
            for duration in durations:
                self._separate_duration(duration, timezone.now())
        if start_of_today == start_of_day:
            tasks = Task.objects.filter(
                Q(
                    Q(people_in_charge_tasks__user__in=[user])
                    & Q(task_durations__started_at__gte=start_of_day)
                    & Q(
                        Q(task_durations__paused_at__isnull=True)
                        | Q(task_durations__paused_at__lte=end_of_day)
                    )
                )
            )
            events = Schedule.objects.filter(
                Q(
                    Q(participants__in=[user])
                    & Q(task_durations__started_at__gte=start_of_day)
                    & Q(
                        Q(task_durations__paused_at__isnull=True)
                        | Q(task_durations__paused_at__lte=end_of_day)
                    )
                )
            )
        else:
            tasks = Task.objects.filter(
                Q(
                    Q(people_in_charge_tasks__user__in=[user])
                    & Q(task_durations__started_at__gte=start_of_day)
                    & Q(task_durations__paused_at__lte=end_of_day)
                )
            )
            events = Schedule.objects.filter(
                Q(
                    Q(participants__in=[user])
                    & Q(task_durations__started_at__gte=start_of_day)
                    & Q(task_durations__paused_at__lte=end_of_day)
                )
            )
        tasks = tasks.all().distinct()
        events = events.all().distinct()
        merged_duration = (
            DailyTaskSerializer(
                tasks,
                many=True,
                context={
                    "start_of_day": start_of_day,
                    "end_of_day": end_of_day,
                },
            ).data
            + DailyEventSerializer(
                events,
                many=True,
                context={
                    "start_of_day": start_of_day,
                    "end_of_day": end_of_day,
                },
            ).data
        )

        data = {
            "tasks": merged_duration,
            "organization_categories": {},
            "next_user": next_user,
            "prev_user": prev_user,
        }

        for item in list(tasks) + list(events):
            if (
                item.organization
                and item.organization.id not in data["organization_categories"]
            ):
                categories = OrganizationDetailSerializer(
                    item.organization
                ).data["statistic_categories"]
                data["organization_categories"][
                    item.organization.id
                ] = transform_statistic_categories(categories)

        def annotate_duration(queryset, start_of_day, end_of_day):
            return queryset.annotate(
                duration=ExpressionWrapper(
                    Case(
                        When(
                            task_durations__paused_at__isnull=True,
                            then=end_of_day
                            if end_of_day < timezone.now()
                            else Now(),
                        ),
                        default=F("task_durations__paused_at"),
                        output_field=DurationField(),
                    )
                    - Coalesce(F("task_durations__started_at"), start_of_day),
                    output_field=DurationField(),
                )
            )

        tasks = annotate_duration(tasks, start_of_day, end_of_day)
        events = annotate_duration(events, start_of_day, end_of_day)

        total_duration = timedelta()

        for task in data["tasks"]:
            total_duration += time_str_to_timedelta(task["total_duration"])

        def get_category_durations(queryset):
            """
            Splits the queryset into two parts:
            - One with a large statistic category
            - One without a large statistic category
            """
            with_large = (
                queryset.filter(
                    Q(categories__large_statistic_category__isnull=False)
                )
                .values(
                    "categories__large_statistic_category__name",
                    "organization__id",
                )
                .annotate(duration=Sum("duration"))
            )

            without_large = (
                queryset.filter(
                    Q(categories__large_statistic_category__isnull=True)
                )
                .annotate(duration=Sum("duration"))
                .values("duration")
            )

            return with_large, without_large

        (
            task_with_category_large_durations,
            task_without_large_durations,
        ) = get_category_durations(tasks)
        (
            event_with_category_large_durations,
            event_without_large_durations,
        ) = get_category_durations(events)

        data["total_duration"] = format_duration(total_duration)
        data["categories"] = []
        category_dict = {}

        combine_cards = list(task_with_category_large_durations) + list(
            event_with_category_large_durations
        )

        for card in combine_cards:
            category_name = card["categories__large_statistic_category__name"]
            organization_id = card["organization__id"]
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
                    "category_name": category_name,
                    "category_color": category_color,
                    "duration": duration,
                }

        if task_without_large_durations:
            category_dict["empty_category"] = {
                "category_name": None,
                "category_color": generate_random_color(),
                "duration": timedelta(0),
            }
            for task in task_without_large_durations:
                category_dict["empty_category"]["duration"] += task["duration"]
        if event_without_large_durations:
            if category_dict.get("empty_category") is None:
                category_dict["empty_category"] = {
                    "category_name": None,
                    "category_color": generate_random_color(),
                    "duration": timedelta(0),
                }
            for event in event_without_large_durations:
                category_dict["empty_category"]["duration"] += event["duration"]
        category_list = list(category_dict.values())

        percent = 100
        for cat in category_list:
            category_duration = format_duration(cat["duration"]) or timedelta(0)
            category_name = cat["category_name"]
            category_color = cat["category_color"]
            percent_per_total_duration = (
                (
                    time_str_to_timedelta(category_duration).total_seconds()
                    / total_duration.total_seconds()
                    * 100
                )
                if total_duration.total_seconds() > 0
                else 0
            )

            if round(percent_per_total_duration) <= percent:
                percent -= round(percent_per_total_duration)
            else:
                percent_per_total_duration = percent

            data["categories"].append(
                {
                    "category_name": category_name,
                    "category_color": category_color,
                    "duration": category_duration,
                    "percent": round(percent_per_total_duration)
                    if percent_per_total_duration < 100
                    else 100,
                }
            )

        date = (
            request.query_params.get("date")
            if request.query_params.get("date")
            else timezone.now().date()
        )

        data["remark"] = DailyReportSerializer(
            user.daily_reports.filter(date=date).first()
        ).data
        confirm_report = False
        if request.user != user:
            confirm_report = (
                user.reported_confirmations.filter(
                    date=date, confirm_by=request.user
                )
                .values_list("is_confirmed", flat=True)
                .first()
            ) or False

        data["remark"].update(
            {
                "user": BaseUserSerializer(user).data,
                "organization_name": organization.name
                if organization
                else None,
                "is_confirmed": confirm_report,
            }
        )

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="organization_ids", type=str),
            OpenApiParameter(name="date", type=datetime),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Return list of statistic data
        """
        organization_ids_params = request.query_params.get("organization_ids")
        organization_ids = []
        date = request.query_params.get("date", None)
        request_user = request.user

        # Validate date format using regex
        if not date or not re.match(DATE_REGEX, date):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        if not date:
            date = timezone.now().date()
        else:
            date = datetime.strptime(date, BASE_DATE_FORMAT).date()

        start_of_day = datetime.combine(date, time.min)
        datetime.combine(timezone.now().date(), time.min)
        end_of_day = datetime.combine(date, time.max)

        if organization_ids_params is None:
            organization_ids = request_user.organizations.all().values_list(
                "id", flat=True
            )
        else:
            for id in organization_ids_params.split(","):
                try:
                    organization_ids.append(int(id))
                except ValueError:
                    continue
        data = {"list": []}
        if organization_ids:
            for organization_id in organization_ids:
                organization = Organization.objects.get(id=organization_id)
                users = organization.users.all().order_by("created_at")
                user_list = []
                for user in users:
                    tasks = (
                        Task.objects.filter(
                            Q(
                                Q(people_in_charge_tasks__user=user)
                                & Q(
                                    task_durations__started_at__gte=start_of_day
                                )
                                & Q(task_durations__paused_at__lte=end_of_day)
                            )
                        )
                        .all()
                        .distinct()
                    )
                    events = (
                        Schedule.objects.filter(
                            Q(
                                Q(participants=user)
                                & Q(
                                    task_durations__started_at__gte=start_of_day
                                )
                                & Q(task_durations__paused_at__lte=end_of_day)
                            )
                        )
                        .all()
                        .distinct()
                    )

                    merged_duration = (
                        DailyTaskSerializer(
                            tasks,
                            many=True,
                            context={
                                "start_of_day": start_of_day,
                                "end_of_day": end_of_day,
                            },
                        ).data
                        + DailyEventSerializer(
                            events,
                            many=True,
                            context={
                                "start_of_day": start_of_day,
                                "end_of_day": end_of_day,
                            },
                        ).data
                    )
                    total_duration = timedelta()

                    for task in merged_duration:
                        total_duration += time_str_to_timedelta(
                            task["total_duration"]
                        )
                    confirm_report = user.reported_confirmations.filter(
                        date=date, confirm_by=request_user
                    ).first()
                    user_list.append(
                        {
                            "id": user.id,
                            "full_name": user.profile.full_name,
                            "is_confirmed": confirm_report.is_confirmed
                            if confirm_report
                            else False,
                            "total_duration": format_duration(total_duration),
                        }
                    )

                data["list"].append(
                    {
                        "organization": {
                            "id": organization.id,
                            "name": organization.name,
                        },
                        "users": user_list,
                    }
                )

        return self.response_ok(data["list"])


@extend_schema(tags=["System > Statistics"])
class StatisticViewSet(BaseAPIViewSet):
    """API endpoint for statistics"""

    @extend_schema(
        parameters=[
            OpenApiParameter(
                BasePagination.page_query_param,
                type=int,
                description=BasePagination.page_query_description,
            ),
            OpenApiParameter(
                BasePagination.page_size_query_param,
                type=int,
                description=BasePagination.page_size_query_description,
            ),
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="organization_ids", type=str),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="small_category_id", type=str),
            OpenApiParameter(name="user_id", type=int),
            OpenApiParameter(name="tag_ids", type=str),
            OpenApiParameter(name="total_duration", type=str),
            OpenApiParameter(name="ordering", type=str),
            OpenApiParameter(name="created_at", type=datetime),
            OpenApiParameter(name="is_tag_page", type=bool),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="tasks",
        serializer_class=None,
    )
    def tasks(self, request):
        """
        Return list of task and event
        """
        user = request.user
        organization_ids_param = request.query_params.get("organization_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_id = request.query_params.get("user_id")
        tag_ids_param = request.query_params.get("tag_ids")
        organization_ids = []
        tag_ids = []
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        total_duration = request.query_params.get("total_duration")
        ordering = request.query_params.get("ordering")
        created_at = request.query_params.get("created_at")
        is_tag_page = request.query_params.get("is_tag_page")
        # Validate date format using regex
        if (
            not from_date
            or not end_date
            or not re.match(DATE_REGEX, from_date)
            or not re.match(DATE_REGEX, end_date)
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        if user_id:
            user = User.objects.filter(id=user_id).first()
            if not user:
                raise NotFound()
        if organization_ids_param is None:
            organization_ids = user.organizations.all().values_list(
                "id", flat=True
            )
        else:
            for id in organization_ids_param.split(","):
                try:
                    organization_ids.append(int(id))
                except ValueError:
                    continue
        large_category_ids = []
        medium_category_ids = []
        small_category_ids = []
        if organization := Organization.objects.filter(
            id=organization_ids[0]
        ).first():
            organization_categories = OrganizationDetailSerializer(
                organization
            ).data["statistic_categories"]
            if organization_categories:
                large_category_ids = [
                    item["large_statistic_category"]["id"]
                    for item in organization_categories
                    if item["large_statistic_category"]
                ]
                medium_category_ids = {
                    item["medium_statistic_category"]["id"]
                    for item in organization_categories
                    if item["medium_statistic_category"]
                }
                small_category_ids = {
                    item["small_statistic_category"]["id"]
                    for item in organization_categories
                    if item["small_statistic_category"]
                }

        if tag_ids_param:
            for id in tag_ids_param.split(","):
                try:
                    tag_ids.append(int(id))
                except ValueError:
                    continue
        tasks, events = get_list_models(
            start_of_day,
            end_of_day,
            organizations=organization_ids,
            users=[user],
            tags=tag_ids,
        )
        filters = Q()
        if large_category_id and large_category_id != NONE_CATEGORY:
            filters &= Q(
                categories__large_statistic_category__id=large_category_id
            )
        elif large_category_id == NONE_CATEGORY:
            filters &= Q(
                categories__large_statistic_category__isnull=True
            ) | ~Q(categories__large_statistic_category__in=large_category_ids)
        if medium_category_id and medium_category_id != NONE_CATEGORY:
            filters &= Q(
                categories__medium_statistic_category__id=medium_category_id
            )
        elif medium_category_id == NONE_CATEGORY:
            filters &= Q(
                categories__medium_statistic_category__isnull=True
            ) | ~Q(
                categories__medium_statistic_category__in=medium_category_ids
            )
        if small_category_id and small_category_id != NONE_CATEGORY:
            filters &= Q(
                categories__small_statistic_category__id=small_category_id
            )
        elif small_category_id == NONE_CATEGORY:
            filters &= Q(
                Q(categories__small_statistic_category__isnull=True)
                | ~Q(
                    categories__small_statistic_category__in=small_category_ids
                )
            )
        elif created_at:
            filters &= Q(created_at__lt=created_at)

        tasks = tasks.filter(filters)
        events = events.filter(filters)

        list_task = StatisticTaskSerializer(
            tasks.order_by("-created_at"),
            many=True,
            context={
                "start_of_day": start_of_day,
                "end_of_day": end_of_day,
                "total_duration": total_duration,
                "tag_ids": tag_ids if is_tag_page else None,
            },
        ).data
        list_event = StatisticEventSerializer(
            events.order_by("-created_at"),
            many=True,
            context={
                "start_of_day": start_of_day,
                "end_of_day": end_of_day,
                "total_duration": total_duration,
                "tag_ids": tag_ids if is_tag_page else None,
            },
        ).data
        merged_duration = list(chain(list_task, list_event))

        def adjust_percentages(cards):
            """
            Adjust percentages
            """
            total_percent = sum(
                task["percent"] if task["percent"] else 0 for task in cards
            )

            if total_percent > 100:
                excess = total_percent - 100
                while excess > 0:
                    # Find card have large percent
                    max_task = max(cards, key=lambda x: x["percent"])
                    if max_task["percent"] > 0:
                        max_task["percent"] -= 1
                        excess -= 1

            return cards

        if ordering:
            merged_duration = sorted(
                merged_duration,
                key=lambda x: (x.get(ordering, "")),
                reverse=False,
            )
        else:
            merged_duration = sorted(
                merged_duration,
                key=lambda x: (x.get("total_duration", "")),
                reverse=True,
            )

        merged_duration = adjust_percentages(merged_duration)

        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(merged_duration, request)

        return paginator.get_paginated_response(paginated_data)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="organization_ids", type=str),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="categories",
        serializer_class=None,
    )
    def categories(self, request):
        """
        Returns a list of statistic all categories.
        """
        user = request.user
        organization_ids_param = request.query_params.get("organization_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        tag_ids_param = request.query_params.get("tag_ids")
        organization_ids = []
        tag_ids = []
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        # Validate date format using regex
        if (
            not from_date
            or not end_date
            or not re.match(DATE_REGEX, from_date)
            or not re.match(DATE_REGEX, end_date)
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        if organization_ids_param is None:
            return self.response_ok({})
        else:
            for id in organization_ids_param.split(","):
                try:
                    organization_ids.append(int(id))
                except ValueError:
                    continue
        if tag_ids_param:
            for id in tag_ids_param.split(","):
                try:
                    tag_ids.append(int(id))
                except ValueError:
                    continue
        data = {}
        if organization_ids:
            tasks, events = get_list_models(
                start_of_day, end_of_day, organization_ids, [user], tag_ids
            )
            total_duration = timedelta()
            merged_duration = merge_task_and_event(
                tasks, events, start_of_day, end_of_day
            )
            for task in merged_duration:
                total_duration += time_str_to_timedelta(task["total_duration"])

            category_list = aggregate_durations(
                annotate_duration(tasks, start_of_day, end_of_day),
                annotate_duration(events, start_of_day, end_of_day),
            )

            # Process large categories
            if category_list:
                data["large_total_duration"] = format_duration(total_duration)
                data["large_categories"] = process_categories(
                    category_list,
                    total_duration,
                    tasks,
                    events,
                    start_of_day,
                    end_of_day,
                    TaskCategoryTypes.LARGE.value,
                    is_with_tasks=True,
                )
                # Process medium categories if large_category_id is provided
                if large_category_id:
                    duration = get_duration_of_category(
                        data["large_categories"], large_category_id
                    )
                    tasks = tasks.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    events = events.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    category_list = aggregate_durations(
                        annotate_duration(tasks, start_of_day, end_of_day),
                        annotate_duration(events, start_of_day, end_of_day),
                        large_category_id,
                    )
                    data["medium_total_duration"] = format_duration(duration)
                    data["medium_categories"] = process_categories(
                        category_list,
                        duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        TaskCategoryTypes.MEDIUM.value,
                        is_with_tasks=True,
                    )
                    # Process small categories if medium_category_id is provided
                    if medium_category_id:
                        duration = get_duration_of_category(
                            data["medium_categories"], medium_category_id
                        )
                        tasks = tasks.filter(
                            categories__medium_statistic_category__id=medium_category_id
                        )
                        events = events.filter(
                            categories__medium_statistic_category__id=medium_category_id
                        )
                        category_list = aggregate_durations(
                            annotate_duration(tasks, start_of_day, end_of_day),
                            annotate_duration(events, start_of_day, end_of_day),
                            large_category_id=large_category_id,
                            medium_category_id=medium_category_id,
                        )
                        data["small_total_duration"] = format_duration(duration)
                        data["small_categories"] = process_categories(
                            category_list,
                            duration,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            TaskCategoryTypes.SMALL.value,
                            is_with_tasks=True,
                        )

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="organization_ids", type=str),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="small_category_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="tags",
        serializer_class=None,
    )
    def tags(self, request):
        """
        Returns a list of statistic by tags.
        """
        user = request.user
        organization_ids_param = request.query_params.get("organization_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        tag_ids_param = request.query_params.get("tag_ids")
        organization_ids = []
        tag_ids = []
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")

        # Validate date format using regex
        if (
            not from_date
            or not end_date
            or not re.match(DATE_REGEX, from_date)
            or not re.match(DATE_REGEX, end_date)
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        if organization_ids_param is None:
            return self.response_ok({})
        else:
            for id in organization_ids_param.split(","):
                try:
                    organization_ids.append(int(id))
                except ValueError:
                    continue
        if tag_ids_param:
            for id in tag_ids_param.split(","):
                try:
                    tag_ids.append(int(id))
                except ValueError:
                    continue

        data = {}
        if tag_ids:
            tasks, events = get_list_models(
                start_of_day,
                end_of_day,
                organizations=organization_ids,
                users=[user],
            )
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                tasks,
                events,
                start_of_day,
                end_of_day,
                is_get_total_duration=True,
            )
            if tag_list:
                data["large_total_duration"] = format_duration(total_duration)
                data["large_categories"] = process_tags(
                    tag_list,
                    total_duration,
                    tasks,
                    events,
                    start_of_day,
                    end_of_day,
                    is_with_tasks=True,
                )

                if large_category_id:
                    tasks = tasks.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    events = events.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    total_duration, tag_list = process_merge_card_per_tag(
                        tag_ids,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        is_get_total_duration=True,
                    )
                    data["medium_total_duration"] = format_duration(
                        total_duration
                    )
                    data["medium_categories"] = process_tags(
                        tag_list,
                        total_duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        is_with_tasks=True,
                    )
                    if medium_category_id:
                        tasks = tasks.filter(
                            categories__medium_statistic_category__id=medium_category_id
                        )
                        events = events.filter(
                            categories__medium_statistic_category__id=medium_category_id
                        )
                        total_duration, tag_list = process_merge_card_per_tag(
                            tag_ids,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            is_get_total_duration=True,
                        )
                        data["small_total_duration"] = format_duration(
                            total_duration
                        )
                        data["small_categories"] = process_tags(
                            tag_list,
                            total_duration,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            is_with_tasks=True,
                        )
                        if small_category_id:
                            tasks = tasks.filter(
                                categories__small_statistic_category__id=small_category_id
                            )
                            events = events.filter(
                                categories__small_statistic_category__id=small_category_id
                            )
                            (
                                total_duration,
                                tag_list,
                            ) = process_merge_card_per_tag(
                                tag_ids,
                                tasks,
                                events,
                                start_of_day,
                                end_of_day,
                                is_get_total_duration=True,
                            )
                            data["category_total_duration"] = format_duration(
                                total_duration
                            )
                            data["category"] = process_tags(
                                tag_list,
                                total_duration,
                                tasks,
                                events,
                                start_of_day,
                                end_of_day,
                                is_with_tasks=True,
                            )

        return self.response_ok(data)


@extend_schema(tags=["System > Organization Statistics"])
class OrganizationStatisticViewSet(BaseAPIViewSet):
    """API endpoint for organization statistics"""

    queryset = Organization.objects.all()

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
        ]
    )
    @action(
        detail=True,
        methods=["GET"],
        url_path="categories",
        serializer_class=None,
    )
    def categories(self, request, pk):
        """
        Returns a list of statistic all categories.
        """
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")

        # Validate date format using regex
        if (
            not from_date
            or not end_date
            or not re.match(DATE_REGEX, from_date)
            or not re.match(DATE_REGEX, end_date)
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        tag_ids_param = request.query_params.get("tag_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        instance = self.get_object()
        users = instance.users.all()
        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        data = {}
        tag_ids = []
        if tag_ids_param:
            for id in tag_ids_param.split(","):
                try:
                    tag_ids.append(int(id))
                except ValueError:
                    continue
        if instance:
            tasks, events = get_list_models(
                start_of_day,
                end_of_day,
                organizations=[instance],
                tags=tag_ids,
            )

            total_duration, category_list = process_per_user(
                users,
                tasks,
                events,
                start_of_day,
                end_of_day,
                is_get_total_duration=True,
            )

            # Process large categories
            if category_list:
                data["large_total_duration"] = format_duration(total_duration)
                data["large_categories"] = process_categories(
                    category_list,
                    total_duration,
                    tasks,
                    events,
                    start_of_day,
                    end_of_day,
                    TaskCategoryTypes.LARGE.value,
                    users=users,
                )
                # Process medium categories if large_category_id is provided
                if large_category_id:
                    duration = get_duration_of_category(
                        data["large_categories"], large_category_id
                    )
                    total_duration, category_list = process_per_user(
                        users,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        large_category_id,
                        is_get_total_duration=False,
                    )
                    tasks = tasks.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    events = events.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    data["medium_total_duration"] = format_duration(duration)
                    data["medium_categories"] = process_categories(
                        category_list,
                        duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        TaskCategoryTypes.MEDIUM.value,
                        users=users,
                    )
                # Process small categories if medium_category_id is provided
                if medium_category_id:
                    duration = get_duration_of_category(
                        data["medium_categories"], medium_category_id
                    )
                    total_duration, category_list = process_per_user(
                        users,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        large_category_id,
                        medium_category_id,
                        is_get_total_duration=False,
                    )
                    tasks = tasks.filter(
                        categories__large_statistic_category__id=large_category_id,
                        categories__medium_statistic_category__id=medium_category_id,
                    )
                    events = events.filter(
                        categories__large_statistic_category__id=large_category_id,
                        categories__medium_statistic_category__id=medium_category_id,
                    )
                    data["small_total_duration"] = format_duration(duration)
                    data["small_categories"] = process_categories(
                        category_list,
                        duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        TaskCategoryTypes.SMALL.value,
                        users=users,
                    )

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="small_category_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
        ]
    )
    @action(
        detail=True,
        methods=["GET"],
        url_path="tags",
        serializer_class=None,
    )
    def tags(self, request, pk):
        """
        Returns a list of statistic by tags.
        """
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        tag_ids_param = request.query_params.get("tag_ids")
        tag_ids = []
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")

        # Validate date format using regex
        if (
            not from_date
            or not end_date
            or not re.match(DATE_REGEX, from_date)
            or not re.match(DATE_REGEX, end_date)
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["date_invalid"]})

        instance = self.get_object()
        users = instance.users.all()
        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)

        if tag_ids_param:
            for id in tag_ids_param.split(","):
                try:
                    tag_ids.append(int(id))
                except ValueError:
                    continue
        data = {}
        if tag_ids:
            tasks, events = get_list_models(
                start_of_day,
                end_of_day,
                organizations=[instance.id],
                users=users,
                tags=tag_ids,
            )
            total_duration, tag_list = process_per_user(
                users,
                tasks,
                events,
                start_of_day,
                end_of_day,
                is_get_total_duration=True,
                is_tag=True,
                tag_ids=tag_ids,
            )
            if tag_list:
                data["large_total_duration"] = format_duration(total_duration)
                data["large_categories"] = process_tags(
                    tag_list,
                    total_duration,
                    tasks,
                    events,
                    start_of_day,
                    end_of_day,
                    users=users,
                )

                if large_category_id:
                    tasks = tasks.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    events = events.filter(
                        categories__large_statistic_category__id=large_category_id
                    )
                    total_duration, tag_list = process_per_user(
                        users,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        is_get_total_duration=True,
                        is_tag=True,
                        tag_ids=tag_ids,
                    )
                    data["medium_total_duration"] = format_duration(
                        total_duration
                    )
                    data["medium_categories"] = process_tags(
                        tag_list,
                        total_duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        users=users,
                    )
                    if medium_category_id:
                        tasks = tasks.filter(
                            categories__medium_statistic_category__id=medium_category_id
                        )
                        events = events.filter(
                            categories__medium_statistic_category__id=medium_category_id
                        )
                        total_duration, tag_list = process_per_user(
                            users,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            is_get_total_duration=True,
                            is_tag=True,
                            tag_ids=tag_ids,
                        )
                        data["small_total_duration"] = format_duration(
                            total_duration
                        )
                        data["small_categories"] = process_tags(
                            tag_list,
                            total_duration,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            users=users,
                        )
                        if small_category_id:
                            tasks = tasks.filter(
                                categories__small_statistic_category__id=small_category_id
                            )
                            events = events.filter(
                                categories__small_statistic_category__id=small_category_id
                            )
                            total_duration, tag_list = process_per_user(
                                users,
                                tasks,
                                events,
                                start_of_day,
                                end_of_day,
                                is_get_total_duration=True,
                                is_tag=True,
                                tag_ids=tag_ids,
                            )
                            data["category_total_duration"] = format_duration(
                                total_duration
                            )
                            data["category"] = process_tags(
                                tag_list,
                                total_duration,
                                tasks,
                                events,
                                start_of_day,
                                end_of_day,
                                users=users,
                            )

        return self.response_ok(data)
