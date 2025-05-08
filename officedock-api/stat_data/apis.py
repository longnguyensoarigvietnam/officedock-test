from datetime import datetime, time, timedelta
import re
from itertools import chain

from django.db.models import (
    Q,
    Sum,
    ExpressionWrapper,
    F,
    DurationField,
    Case,
    When,
)
from django.db.models.functions import Now, Coalesce
from django.utils import timezone
from django.utils.translation import trim_whitespace
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES
from base.paginations import BasePagination
from calendars.models import Schedule
from common.constants import DATE_REGEX, BASE_DATE_FORMAT
from common.serializers import CreationDataUserSerializer
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    transform_statistic_categories,
    split_id_from_string,
)
from organizations.constants import CategoryColors
from organizations.models import Organization, OrganizationsStatisticCategories
from organizations.serializers import OrganizationDetailSerializer
from stat_data.constants import NONE_CATEGORY, FilterTime
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
    get_list_models,
    process_tags,
    process_merge_card_per_tag,
    process_per_user,
    split_ranges,
    build_category_filters,
    get_list_durations_by_users,
    get_total_durations,
    get_duration_of_none_category,
    check_is_not_none_category,
    get_list_id_category_of_organization,
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
    filter_backends = [FilterByPermission]
    screen_name = Screens.DAILY_REPORT.value

    def _separate_duration(self, duration, end_date, user=None):
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
                    user=user,
                )
            if intervals is not []:
                for start, end in intervals:
                    TaskDuration.objects.create(
                        task_id=duration.task_id,
                        started_at=start,
                        paused_at=end,
                        user=user,
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

        durations = TaskDuration.objects.filter(
            Q(Q(user=user) & Q(paused_at__isnull=True))
        )

        for duration in durations:
            self._separate_duration(duration, timezone.now(), user=user)

        if start_of_today == start_of_day:
            durations = TaskDuration.objects.filter(
                Q(
                    Q(started_at__gte=start_of_day)
                    & Q(user=user)
                    & Q(
                        Q(paused_at__isnull=True) | Q(paused_at__lte=end_of_day)
                    )
                )
            )
        else:
            durations = TaskDuration.objects.filter(
                Q(
                    Q(started_at__gte=start_of_day)
                    & Q(user=user)
                    & Q(paused_at__lte=end_of_day)
                )
            )
        tasks = Task.objects.filter(
            id__in=durations.values_list("task", flat=True)
        )
        events = Schedule.objects.filter(
            id__in=durations.values_list("schedule", flat=True)
        )
        merged_duration = (
            DailyTaskSerializer(
                tasks,
                many=True,
                context={
                    "start_of_day": start_of_day,
                    "end_of_day": end_of_day,
                    "user": user,
                },
            ).data
            + DailyEventSerializer(
                events,
                many=True,
                context={
                    "start_of_day": start_of_day,
                    "end_of_day": end_of_day,
                    "user": user,
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

        total_duration = timedelta()

        for duration in durations:
            paused_at = (
                duration.paused_at if duration.paused_at else timezone.now()
            )
            total_duration += paused_at - duration.started_at

        def get_category_durations(queryset):
            """
            Splits the queryset into two parts:
            - One with a large statistic category
            - One without a large statistic category
            """
            with_large = queryset.filter(
                Q(categories__large_statistic_category__isnull=False)
            ).values(
                "categories__large_statistic_category__name",
                "categories__large_statistic_category__id",
                "organization__id",
            )

            return with_large.distinct()

        data["total_duration"] = format_duration(total_duration)
        data["categories"] = []
        category_dict = {}

        combine_cards = list(get_category_durations(tasks)) + list(
            get_category_durations(events)
        )
        for card in combine_cards:
            category_name = card["categories__large_statistic_category__name"]
            category_id = card["categories__large_statistic_category__id"]
            organization_id = card["organization__id"]
            category_color = (
                OrganizationsStatisticCategories.objects.filter(
                    organization_id=organization_id,
                    large_statistic_category__name=category_name,
                )
                .values_list("color", flat=True)
                .first()
            )
            filter_durations = durations.filter(
                Q(task__categories__large_statistic_category__id=category_id)
                | Q(
                    schedule__categories__large_statistic_category__id=category_id
                )
            )
            duration = annotate_duration(
                filter_durations, start_of_day, end_of_day
            )["total_duration"]

            if category_id in category_dict:
                category_dict[category_id]["duration"] += duration
            else:
                category_dict[category_id] = {
                    "category_id": category_id,
                    "category_name": category_name,
                    "category_color": category_color,
                    "duration": duration,
                }
        filter_durations = durations.filter(
            Q(task__categories__large_statistic_category__isnull=True)
            & Q(schedule__categories__large_statistic_category__isnull=True)
        )
        if filter_durations.exists():
            category_dict["empty_category"] = {
                "category_id": None,
                "category_name": None,
                "category_color": CategoryColors.GRAY.value,
                "duration": annotate_duration(
                    filter_durations, start_of_day, end_of_day
                )["total_duration"],
            }

        category_list = list(category_dict.values())
        total_duration = time_str_to_timedelta(format_duration(total_duration))
        percent = 100
        for cat in category_list:
            category_duration = format_duration(cat["duration"]) or timedelta(0)
            category_name = cat["category_name"]
            category_color = cat["category_color"]
            category_id = cat["category_id"]
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
                    "category_id": category_id,
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
            organization_ids = split_id_from_string(organization_ids_params)

        data = []
        if organization_ids:
            for organization_id in organization_ids:
                organization = Organization.objects.get(id=organization_id)
                users = organization.users.all().order_by("created_at")
                user_list = []
                for user in users:
                    total_duration = timedelta()
                    durations = TaskDuration.objects.filter(
                        Q(
                            Q(started_at__gte=start_of_day)
                            & Q(user=user)
                            & Q(paused_at__lte=end_of_day)
                        )
                    )
                    for duration in durations:
                        paused_at = (
                            duration.paused_at
                            if duration.paused_at
                            else timezone.now()
                        )
                        total_duration += paused_at - duration.started_at

                    confirm_report = user.reported_confirmations.filter(
                        date=date, confirm_by=request_user
                    ).first()
                    user_serializer = CreationDataUserSerializer(user).data
                    user_serializer["total_duration"] = format_duration(
                        total_duration
                    )
                    user_serializer["is_confirmed"] = (
                        confirm_report.is_confirmed if confirm_report else False
                    )
                    user_list.append(user_serializer)

                data.append(
                    {
                        "organization": {
                            "id": organization.id,
                            "name": organization.name,
                        },
                        "users": user_list,
                    }
                )

        return self.response_ok(data)


@extend_schema(tags=["System > Statistics"])
class StatisticViewSet(BaseAPIViewSet):
    """API endpoint for statistics"""

    permission_classes = [ActionPermission]
    filter_backends = [FilterByPermission]
    screen_name = Screens.STATISTIC.value

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
            OpenApiParameter(name="cursor", type=str),
            OpenApiParameter(name="cursor_id", type=int),
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
        tag_ids = []
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        total_duration = request.query_params.get("total_duration")
        ordering = request.query_params.get("ordering")
        cursor = request.query_params.get("cursor")
        cursor_id = request.query_params.get("cursor_id")
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
            organization_ids = split_id_from_string(organization_ids_param)

        (
            large_category_ids,
            medium_category_ids,
            small_category_ids,
        ) = get_list_id_category_of_organization(organization_ids)

        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            [user],
            organization_ids,
            tags=tag_ids,
        )
        tasks, events = get_list_models(durations)
        tasks = (
            tasks.filter(
                task_durations__user=user,
                task_durations__paused_at__lte=end_of_day,
                task_durations__started_at__gte=start_of_day,
            )
            .annotate(
                total_duration=Sum(
                    ExpressionWrapper(
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
                        - Coalesce(
                            F("task_durations__started_at"), start_of_day
                        ),
                        output_field=DurationField(),
                    )
                )
            )
            .distinct()
        )
        events = (
            events.filter(
                task_durations__user=user,
                task_durations__paused_at__lte=end_of_day,
                task_durations__started_at__gte=start_of_day,
            )
            .annotate(
                total_duration=Sum(
                    ExpressionWrapper(
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
                        - Coalesce(
                            F("task_durations__started_at"), start_of_day
                        ),
                        output_field=DurationField(),
                    )
                )
            )
            .distinct()
        )
        filters = build_category_filters(
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
            small_category_id=small_category_id,
            large_category_ids=large_category_ids,
            medium_category_ids=medium_category_ids,
            small_category_ids=small_category_ids,
        )
        tasks = tasks.filter(filters)
        events = events.filter(filters)
        merged_qs = sorted(
            chain(tasks, events),
            key=lambda x: (x.total_duration or timedelta(0), x.id),
            reverse=not bool(ordering),
        )
        new_qs = merged_qs
        if cursor and cursor_id:
            new_qs = []
            cursor = time_str_to_timedelta(cursor)
            cursor_id = int(cursor_id)
            for x in merged_qs:
                duration = time_str_to_timedelta(
                    format_duration(x.total_duration or timedelta(0))
                )
                if ordering:
                    if duration > cursor or (
                        duration == cursor and x.id > cursor_id
                    ):
                        new_qs.append(x)
                else:
                    if duration < cursor or (
                        duration == cursor and x.id < cursor_id
                    ):
                        new_qs.append(x)

        merged_duration = []
        for item in new_qs:
            if isinstance(item, Task):
                serializer = StatisticTaskSerializer(
                    item,
                    context={
                        "start_of_day": start_of_day,
                        "end_of_day": end_of_day,
                        "total_duration": total_duration,
                        "tag_ids": tag_ids if is_tag_page else None,
                        "user": user,
                    },
                )
            else:
                serializer = StatisticEventSerializer(
                    item,
                    context={
                        "start_of_day": start_of_day,
                        "end_of_day": end_of_day,
                        "total_duration": total_duration,
                        "tag_ids": tag_ids if is_tag_page else None,
                        "user": user,
                    },
                )
            merged_duration.append(serializer.data)

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
            OpenApiParameter(name="small_category_id", type=str),
            OpenApiParameter(name="user_id", type=int),
            OpenApiParameter(name="tag_ids", type=str),
            OpenApiParameter(name="total_duration", type=str),
            OpenApiParameter(name="is_tag_page", type=bool),
            OpenApiParameter(
                name="statistic_by",
                type=str,
                enum=[
                    FilterTime.DAY.value,
                    FilterTime.WEEK.value,
                    FilterTime.MONTH.value,
                    FilterTime.YEAR.value,
                ],
            ),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="task_durations",
        serializer_class=None,
    )
    def task_durations(self, request):
        """
        Return list durations of task and event
        """
        user = request.user
        organization_ids_param = request.query_params.get("organization_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_id = request.query_params.get("user_id")
        tag_ids_param = request.query_params.get("tag_ids")
        tag_ids = []
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        statistic_by = request.query_params.get("statistic_by")
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
            organization_ids = split_id_from_string(organization_ids_param)

        (
            large_category_ids,
            medium_category_ids,
            small_category_ids,
        ) = get_list_id_category_of_organization(organization_ids)
        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            [user],
            organization_ids,
            tags=tag_ids,
        )
        tasks, events = get_list_models(durations)
        filters = build_category_filters(
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
            small_category_id=small_category_id,
            large_category_ids=large_category_ids,
            medium_category_ids=medium_category_ids,
            small_category_ids=small_category_ids,
        )
        tasks = tasks.filter(filters)
        events = events.filter(filters)
        data = []
        if not check_is_not_none_category(
            large_category_id, medium_category_id, small_category_id
        ):
            durations = get_duration_of_none_category(
                durations, large_category_id, medium_category_id
            )
        ranges = split_ranges(
            from_date, end_date, trim_whitespace(statistic_by)
        )

        def _get_durations_by_time(filter_durations, percent, duration):
            """
            Handle get duration by time
            """
            durations = []
            for start, end in ranges:
                start_date_min = datetime.combine(start, time.min)
                end_date_max = datetime.combine(end, time.max)
                total_duration = timedelta(0)
                percent_per_total_duration = 0
                if filter_durations:
                    filter_duration_by_range = filter_durations.filter(
                        started_at__gte=start_date_min,
                        paused_at__lte=end_date_max,
                    )
                    total_duration = get_total_durations(
                        filter_duration_by_range
                    )
                    # Calculate the percentage of the total duration
                    if duration.total_seconds() > 0:
                        percent_per_total_duration = (
                            total_duration.total_seconds()
                            / duration.total_seconds()
                            * 100
                        )
                    else:
                        percent_per_total_duration = 0
                    # Ensure percentage does not exceed remaining percent
                    if round(percent_per_total_duration) <= percent:
                        percent -= round(percent_per_total_duration)
                    else:
                        percent_per_total_duration = percent
                durations.append(
                    {
                        "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                        "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                        "duration": format_duration(total_duration),
                        "percent": min(round(percent_per_total_duration), 100),
                    }
                )
            return durations

        if is_tag_page:
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
            )
            if not tag_list:
                tag = {
                    "tag_id": None,
                    "tag_name": NONE_CATEGORY,
                    "duration": "00:00:00",
                }
                tag["durations"] = _get_durations_by_time(
                    None, 100, tag["duration"]
                )
                data.append(tag)
            else:
                for tag in tag_list:
                    if check_is_not_none_category(
                        large_category_id, medium_category_id, small_category_id
                    ):
                        filter_durations = get_list_durations_by_users(
                            durations=durations,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                            small_id=small_category_id,
                            tags=[tag["tag_id"]],
                        )
                    else:
                        filter_durations = get_list_durations_by_users(
                            durations=durations, tags=[tag["tag_id"]]
                        )
                    tag["duration"] = get_total_durations(filter_durations)
                    tag["durations"] = _get_durations_by_time(
                        filter_durations, 100, tag["duration"]
                    )
                    tag["duration"] = format_duration(tag["duration"])
                    data.append(tag)
        else:
            category_list = aggregate_durations(
                tasks,
                events,
                durations=durations,
                start_of_day=start_of_day,
                end_of_day=end_of_day,
                large_category_id=large_category_id,
                medium_category_id=medium_category_id,
            )
            if not category_list:
                category = {
                    "category_id": None,
                    "category_name": NONE_CATEGORY,
                    "category_color": CategoryColors.GRAY.value,
                    "duration": "00:00:00",
                }
                category["durations"] = _get_durations_by_time(
                    None, 100, category["duration"]
                )
                data.append(category)
            else:
                for category in category_list:
                    category_id = category["category_id"]
                    filter_durations = None

                    if check_is_not_none_category(
                        large_category_id, medium_category_id, small_category_id
                    ):
                        if not large_category_id and not medium_category_id:
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
                    if category_id is None:
                        filter_durations = get_duration_of_none_category(
                            filter_durations if filter_durations else durations,
                            large_category_id,
                            medium_category_id,
                        )

                    category["durations"] = _get_durations_by_time(
                        filter_durations, 100, category["duration"]
                    )
                    category["duration"] = format_duration(category["duration"])
                    data.append(category)

        return self.response_ok(data)

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
            organization_ids = split_id_from_string(organization_ids_param)
        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

        data = {}
        if organization_ids:
            durations = get_list_durations_by_users(
                start_of_day,
                end_of_day,
                [user],
                organization_ids,
                tags=tag_ids,
            )
            if not durations.exists():
                return self.response_ok(data)
            tasks, events = get_list_models(durations)
            total_duration = get_total_durations(durations)

            category_list = aggregate_durations(
                tasks,
                events,
                durations=durations,
                start_of_day=start_of_day,
                end_of_day=end_of_day,
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
                    durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                    )
                    duration = get_total_durations(durations)

                    tasks, events = get_list_models(durations)
                    category_list = aggregate_durations(
                        tasks,
                        events,
                        durations=durations,
                        start_of_day=start_of_day,
                        end_of_day=end_of_day,
                        large_category_id=large_category_id,
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
                        durations = get_list_durations_by_users(
                            durations=durations,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                        )

                        duration = get_total_durations(durations)

                        tasks, events = get_list_models(durations)
                        category_list = aggregate_durations(
                            tasks,
                            events,
                            durations=durations,
                            start_of_day=start_of_day,
                            end_of_day=end_of_day,
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
            organization_ids = split_id_from_string(organization_ids_param)

        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

        data = {}
        if tag_ids:
            durations = get_list_durations_by_users(
                start_of_day,
                end_of_day,
                [user],
                organization_ids,
                tags=tag_ids,
            )
            if not durations.exists():
                return self.response_ok(data)
            tasks, events = get_list_models(durations)
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
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
                    durations=durations,
                )

                if large_category_id:
                    durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                    )
                    total_duration, tag_list = process_merge_card_per_tag(
                        tag_ids,
                        durations=durations,
                    )
                    data["medium_total_duration"] = format_duration(
                        total_duration
                    )
                    tasks, events = get_list_models(durations)
                    data["medium_categories"] = process_tags(
                        tag_list,
                        total_duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        is_with_tasks=True,
                        durations=durations,
                    )
                    if medium_category_id:
                        durations = get_list_durations_by_users(
                            durations=durations,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                        )
                        total_duration, tag_list = process_merge_card_per_tag(
                            tag_ids,
                            durations=durations,
                        )
                        data["small_total_duration"] = format_duration(
                            total_duration
                        )
                        tasks, events = get_list_models(durations)
                        data["small_categories"] = process_tags(
                            tag_list,
                            total_duration,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            is_with_tasks=True,
                            durations=durations,
                        )
                        if small_category_id:
                            durations = get_list_durations_by_users(
                                durations=durations,
                                large_id=large_category_id,
                                medium_id=medium_category_id,
                                small_id=small_category_id,
                            )
                            (
                                total_duration,
                                tag_list,
                            ) = process_merge_card_per_tag(
                                tag_ids,
                                durations=durations,
                            )
                            data["small_total_duration"] = format_duration(
                                total_duration
                            )
                            tasks, events = get_list_models(durations)
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
                                durations=durations,
                            )

        return self.response_ok(data)


@extend_schema(tags=["System > Organization Statistics"])
class OrganizationStatisticViewSet(BaseAPIViewSet):
    """API endpoint for organization statistics"""

    permission_classes = [ActionPermission]
    filter_backends = [FilterByPermission]
    screen_name = Screens.TEAMDOCK.value
    queryset = Organization.objects.all()

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
            OpenApiParameter(name="user_ids", type=str),
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
        user_ids_param = request.query_params.get("user_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        instance = self.get_object()
        if user_ids_param:
            users = instance.users.filter(
                id__in=split_id_from_string(user_ids_param)
            )
        else:
            users = instance.users.all()
        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        data = {}
        tag_ids = []
        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)
        if instance:
            durations = get_list_durations_by_users(
                start_of_day,
                end_of_day,
                users,
                organizations=[instance],
                tags=tag_ids,
            )
            if not durations.exists():
                return self.response_ok(data)
            tasks, events = get_list_models(durations)
            total_duration, category_list = process_per_user(
                users,
                tasks,
                events,
                start_of_day,
                end_of_day,
                durations=durations,
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
                    durations=durations,
                )
                # Process medium categories if large_category_id is provided
                if large_category_id:
                    durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                    )
                    tasks, events = get_list_models(durations)
                    total_duration, category_list = process_per_user(
                        users,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        large_category_id,
                        durations=durations,
                    )
                    data["medium_total_duration"] = format_duration(
                        total_duration
                    )
                    data["medium_categories"] = process_categories(
                        category_list,
                        total_duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        TaskCategoryTypes.MEDIUM.value,
                        users=users,
                        durations=durations,
                    )
                # Process small categories if medium_category_id is provided
                if medium_category_id:
                    durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                        medium_id=medium_category_id,
                    )
                    tasks, events = get_list_models(durations)
                    total_duration, category_list = process_per_user(
                        users,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        large_category_id,
                        medium_category_id,
                        durations=durations,
                    )
                    data["small_total_duration"] = format_duration(
                        total_duration
                    )
                    data["small_categories"] = process_categories(
                        category_list,
                        total_duration,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        TaskCategoryTypes.SMALL.value,
                        users=users,
                        durations=durations,
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
            OpenApiParameter(name="user_ids", type=str),
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
        user_ids_param = request.query_params.get("user_ids")
        if user_ids_param:
            users = instance.users.filter(
                id__in=split_id_from_string(user_ids_param)
            )
        else:
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
            durations = get_list_durations_by_users(
                start_of_day,
                end_of_day,
                users,
                [instance],
                tags=tag_ids,
            )
            if not durations.exists():
                return self.response_ok(data)
            tasks, events = get_list_models(durations)
            total_duration, tag_list = process_per_user(
                users,
                tasks,
                events,
                start_of_day,
                end_of_day,
                is_tag=True,
                tag_ids=tag_ids,
                durations=durations,
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
                    durations=durations,
                )

                if large_category_id:
                    durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                    )
                    tasks, events = get_list_models(durations)
                    total_duration, tag_list = process_per_user(
                        users,
                        tasks,
                        events,
                        start_of_day,
                        end_of_day,
                        is_tag=True,
                        tag_ids=tag_ids,
                        durations=durations,
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
                        durations=durations,
                    )
                    if medium_category_id:
                        durations = get_list_durations_by_users(
                            durations=durations,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                        )
                        tasks, events = get_list_models(durations)
                        total_duration, tag_list = process_per_user(
                            users,
                            tasks,
                            events,
                            start_of_day,
                            end_of_day,
                            is_tag=True,
                            tag_ids=tag_ids,
                            durations=durations,
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
                            durations=durations,
                        )
                        if small_category_id:
                            durations = get_list_durations_by_users(
                                durations=durations,
                                large_id=large_category_id,
                                medium_id=medium_category_id,
                                small_id=small_category_id,
                            )
                            tasks, events = get_list_models(durations)
                            total_duration, tag_list = process_per_user(
                                users,
                                tasks,
                                events,
                                start_of_day,
                                end_of_day,
                                is_tag=True,
                                tag_ids=tag_ids,
                                durations=durations,
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
                                durations=durations,
                                users=users,
                            )

        return self.response_ok(data)
