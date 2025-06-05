from datetime import datetime, time, timedelta
from itertools import chain

from django.db.models import (
    Sum,
    ExpressionWrapper,
    F,
    DurationField,
    Case,
    When,
)
from django.db.models.functions import Now, Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import trim_whitespace
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.paginations import BasePagination
from common.constants import BASE_DATE_FORMAT
from common.serializers import (
    CreationDataUserSerializer,
)
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    split_id_from_string,
)
from organizations.constants import CategoryColors
from organizations.models import Organization
from stat_data.constants import NONE_CATEGORY, FilterTime
from stat_data.serializers import (
    StatisticTaskSerializer,
    StatisticEventSerializer,
)
from stat_data.utils import (
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
    validate_date_format_using_regex,
    percentage_calculation_of_duration,
)
from tasks.constants import TaskCategoryTypes
from tasks.models import Task
from users.models import User
from roles.constants import Screens
from base.permissions import ActionPermission


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

        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

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
            exists_large_category_ids=large_category_ids,
            exists_medium_category_ids=medium_category_ids,
            exists_small_category_ids=small_category_ids,
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
                required=True,
            ),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="task-durations",
        serializer_class=None,
    )
    def task_durations(self, request):
        """
        Return list durations of task and event for chart time progression in the period
        """
        organization_ids_param = request.query_params.get("organization_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_id = request.query_params.get("user_id")
        tag_ids_param = request.query_params.get("tag_ids")
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        statistic_by = request.query_params.get("statistic_by")
        is_tag_page = request.query_params.get("is_tag_page")
        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        user = get_object_or_404(User, id=user_id) if user_id else request.user

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
            exists_large_category_ids=large_category_ids,
            exists_medium_category_ids=medium_category_ids,
            exists_small_category_ids=small_category_ids,
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
            # Return empty list durations
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
                return self.response_ok(data)

            # Handle get list duration by ranges
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
            return self.response_ok(data)

        category_list = aggregate_durations(
            tasks,
            events,
            durations=durations,
            start_of_day=start_of_day,
            end_of_day=end_of_day,
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
        )
        # Return empty list duration
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
            return self.response_ok(data)

        # Handle get list duration by ranges
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
        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

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

        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

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
                required=True,
            ),
        ]
    )
    @action(
        detail=False,
        methods=["GET"],
        url_path="percent-change",
        serializer_class=None,
    )
    def change_in_percentage_over_the_period(self, request):
        """
        Return list durations of task and event was change in percentage over the period
        """
        organization_ids_param = request.query_params.get("organization_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_id = request.query_params.get("user_id")
        tag_ids_param = request.query_params.get("tag_ids")
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        statistic_by = request.query_params.get("statistic_by")
        is_tag_page = request.query_params.get("is_tag_page")
        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        user = get_object_or_404(User, id=user_id) if user_id else request.user

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
            exists_large_category_ids=large_category_ids,
            exists_medium_category_ids=medium_category_ids,
            exists_small_category_ids=small_category_ids,
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

        if is_tag_page:
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
            )
            data = self._handle_get_percent_per_range_time(
                ranges,
                durations,
                data,
                tag_list,
                large_category_id,
                medium_category_id,
                small_category_id,
                is_tag_page=is_tag_page,
                tag_ids=tag_ids,
            )
            return self.response_ok(data)

        category_list = aggregate_durations(
            tasks,
            events,
            durations=durations,
            start_of_day=start_of_day,
            end_of_day=end_of_day,
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
        )
        data = self._handle_get_percent_per_range_time(
            ranges,
            durations,
            data,
            category_list,
            large_category_id,
            medium_category_id,
            small_category_id,
        )

        return self.response_ok(data)

    def _handle_get_percent_per_range_time(
        self,
        ranges,
        durations,
        data,
        data_list=None,
        large_category_id=None,
        medium_category_id=None,
        small_category_id=None,
        is_tag_page=False,
        tag_ids=[],
    ):
        """
        Response data of change percentage over the period
        """

        def _handle_get_filter_durations(id, filter_duration_by_range):
            filter_durations = None
            if check_is_not_none_category(
                large_category_id, medium_category_id, small_category_id
            ):

                # Get filter durations of all large category
                if not large_category_id and not medium_category_id:
                    filter_durations = get_list_durations_by_users(
                        durations=filter_duration_by_range,
                        large_id=id,
                    )
                    # Get filter duration of all medium category is child of large_category_id
                elif large_category_id:
                    filter_durations = get_list_durations_by_users(
                        durations=filter_duration_by_range,
                        large_id=large_category_id,
                        medium_id=id,
                    )
                    # Get filter duration of all small category is child of large_category_id and medium_category_id
                    if medium_category_id:
                        filter_durations = get_list_durations_by_users(
                            durations=filter_duration_by_range,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                            small_id=id,
                        )

            return filter_durations

        def _handle_tag_list(durations_by_range, total_duration):
            """
            Handle tag list and response data of tag
            """
            percent = 100
            elements = []
            len_of_list = len(data_list)
            total_sec = total_duration.total_seconds()
            # Get list data tag will show from data list,
            # then take id tag to filter duration get response duration time and percent per total duration of tag within range time.
            for tag in data_list:
                filter_duration = get_list_durations_by_users(
                    durations=durations_by_range, tags=[tag["tag_id"]]
                )
                if not filter_duration.exists():
                    elements.append(
                        {
                            "tag_id": tag["tag_id"],
                            "tag_name": tag["tag_name"],
                            "duration": "00:00:00",
                            "percent": 0,
                        }
                    )
                    continue
                duration = get_total_durations(filter_duration)
                percent_per_total_duration = percentage_calculation_of_duration(
                    total_sec, duration.total_seconds()
                )
                # If it is the last element, assign the remaining percentage.
                if len_of_list == 1 and total_sec > 0:
                    percent_per_total_duration = percent
                else:
                    percent -= round(percent_per_total_duration)
                    len_of_list -= 1
                elements.append(
                    {
                        "tag_id": tag["tag_id"],
                        "tag_name": tag["tag_name"],
                        "duration": format_duration(duration),
                        "percent": max(
                            0, min(round(percent_per_total_duration), 100)
                        ),
                    }
                )
            return elements

        for start, end in ranges:
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            # Get duration by range
            durations_by_range = durations.filter(
                started_at__gte=start_date_min,
                paused_at__lte=end_date_max,
            )
            elements = []
            if is_tag_page:
                if check_is_not_none_category(
                    large_category_id, medium_category_id, small_category_id
                ):
                    durations_by_range = get_list_durations_by_users(
                        durations=durations_by_range,
                        large_id=large_category_id,
                        medium_id=medium_category_id,
                        small_id=small_category_id,
                    )
                else:
                    durations_by_range = get_list_durations_by_users(
                        durations=durations_by_range,
                        tags=tag_ids,
                    )
                total_duration, _ = process_merge_card_per_tag(
                    tag_ids,
                    durations=durations_by_range,
                )
                data.append(
                    {
                        "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                        "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                        "tags": _handle_tag_list(
                            durations_by_range, total_duration
                        ),
                        "total_duration": format_duration(total_duration),
                    }
                )
            else:
                if not data_list:
                    total_duration = timedelta(0)
                    elements.append(
                        {
                            "category_id": None,
                            "category_name": NONE_CATEGORY,
                            "category_color": CategoryColors.GRAY.value,
                            "duration": "00:00:00",
                            "percent": 0,
                        }
                    )
                else:
                    filter_duration_by_range = get_list_durations_by_users(
                        durations=durations_by_range,
                        large_id=large_category_id,
                        medium_id=medium_category_id,
                        small_id=small_category_id,
                    )
                    # Get total duration of duration by range
                    total_duration = get_total_durations(
                        filter_duration_by_range
                    )

                    percent = 100
                    len_of_list = len(data_list)
                    # Handle get list duration by ranges
                    for ele in data_list:
                        id = ele["category_id"]
                        filter_durations = _handle_get_filter_durations(
                            id, filter_duration_by_range
                        )
                        if id is None:
                            filter_durations = get_duration_of_none_category(
                                filter_durations
                                if filter_durations
                                else durations_by_range,
                                large_category_id,
                                medium_category_id,
                            )
                        duration = get_total_durations(filter_durations)
                        # Calculate the percentage of the total duration
                        total_sec = total_duration.total_seconds()
                        percent_per_total_duration = (
                            percentage_calculation_of_duration(
                                total_sec, duration.total_seconds()
                            )
                        )
                        # If it is the last element, assign the remaining percentage.
                        if len_of_list == 1 and total_sec > 0:
                            percent_per_total_duration = percent
                        else:
                            percent -= round(percent_per_total_duration)
                            len_of_list -= 1

                        elements.append(
                            {
                                "category_id": id,
                                "category_name": ele["category_name"],
                                "category_color": ele["category_color"],
                                "duration": format_duration(duration),
                                "percent": max(
                                    0,
                                    min(round(percent_per_total_duration), 100),
                                ),
                            }
                        )
                data.append(
                    {
                        "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                        "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                        "categories": elements,
                        "total_duration": format_duration(total_duration),
                    }
                )

        return data


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

        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

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
        org_users = instance.users.all()
        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        data = {}
        tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            org_users,
            organizations=[instance],
            tags=tag_ids,
        )

        tasks, events = get_list_models(durations)
        total_duration, category_list = process_per_user(
            org_users,
            tasks,
            events,
            start_of_day,
            end_of_day,
            durations=durations,
        )
        if not durations.exists() or category_list is None:
            return self.response_ok(data)
        # Process large categories
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
            data = self._handle_get_statistic_category(
                durations,
                users,
                start_of_day,
                end_of_day,
                data,
                TaskCategoryTypes.MEDIUM.value,
                large_category_id=large_category_id,
                medium_category_id=None,
                small_category_id=None,
                type_total_duration="medium_total_duration",
                type_category="medium_categories",
            )
            # Process small categories if medium_category_id is provided
            if medium_category_id:
                data = self._handle_get_statistic_category(
                    durations,
                    users,
                    start_of_day,
                    end_of_day,
                    data,
                    TaskCategoryTypes.SMALL.value,
                    large_category_id=large_category_id,
                    medium_category_id=medium_category_id,
                    small_category_id=None,
                    type_total_duration="small_total_duration",
                    type_category="small_categories",
                )

        return self.response_ok(data)

    def _handle_get_statistic_category(
        self,
        durations,
        users,
        start_of_day,
        end_of_day,
        data,
        task_category_type,
        large_category_id=None,
        medium_category_id=None,
        small_category_id=None,
        type_total_duration=None,
        type_category=None,
    ):
        """
        Return data of statistic category by type of category
        """
        durations = get_list_durations_by_users(
            durations=durations,
            large_id=large_category_id,
            medium_id=medium_category_id,
            small_id=small_category_id,
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
        data[type_total_duration] = format_duration(total_duration)
        data[type_category] = process_categories(
            category_list,
            total_duration,
            tasks,
            events,
            start_of_day,
            end_of_day,
            task_category_type,
            users=users,
            durations=durations,
        )

        return data

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
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")

        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

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

        tag_ids = split_id_from_string(tag_ids_param)
        data = {}

        if not tag_ids:
            return self.response_ok(data)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            users,
            [instance],
            tags=tag_ids,
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
        if not durations.exists() or tag_list is None:
            return self.response_ok(data)

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
            data = self._handle_get_statistic_tag_by_categories(
                durations,
                users,
                start_of_day,
                end_of_day,
                tag_ids,
                data,
                large_category_id=large_category_id,
                medium_category_id=None,
                small_category_id=None,
                type_total_duration="medium_total_duration",
                type_category="medium_categories",
            )

            if medium_category_id:
                data = self._handle_get_statistic_tag_by_categories(
                    durations,
                    users,
                    start_of_day,
                    end_of_day,
                    tag_ids,
                    data,
                    large_category_id=large_category_id,
                    medium_category_id=medium_category_id,
                    small_category_id=None,
                    type_total_duration="small_total_duration",
                    type_category="small_categories",
                )

                if small_category_id:
                    data = self._handle_get_statistic_tag_by_categories(
                        durations,
                        users,
                        start_of_day,
                        end_of_day,
                        tag_ids,
                        data,
                        large_category_id=large_category_id,
                        medium_category_id=medium_category_id,
                        small_category_id=small_category_id,
                        type_total_duration="category_total_duration",
                        type_category="category",
                    )

        return self.response_ok(data)

    def _handle_get_statistic_tag_by_categories(
        self,
        durations,
        users,
        start_of_day,
        end_of_day,
        tag_ids,
        data,
        large_category_id=None,
        medium_category_id=None,
        small_category_id=None,
        type_total_duration=None,
        type_category=None,
    ):
        """
        Return data of statistic tag by category
        """
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
        data[type_total_duration] = format_duration(total_duration)
        data[type_category] = process_tags(
            tag_list,
            total_duration,
            tasks,
            events,
            start_of_day,
            end_of_day,
            durations=durations,
            users=users,
        )

        return data

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="small_category_id", type=str),
            OpenApiParameter(name="user_ids", type=str),
            OpenApiParameter(name="tag_ids", type=str),
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
                required=True,
            ),
        ]
    )
    @action(
        detail=True,
        methods=["GET"],
        url_path="user-task-durations",
        serializer_class=None,
    )
    def user_task_durations(self, request, pk):
        """
        Return data of statistic category each user
        """
        organization = self.get_object()
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_ids = request.query_params.get("user_ids")
        tag_ids_param = request.query_params.get("tag_ids")
        from_date = request.query_params.get("from_date")
        end_date = request.query_params.get("end_date")
        statistic_by = request.query_params.get("statistic_by")
        request.query_params.get("is_tag_page")
        validate_date_format_using_regex(from_date)
        validate_date_format_using_regex(end_date)

        from_date = datetime.strptime(from_date, BASE_DATE_FORMAT).date()
        end_date = datetime.strptime(end_date, BASE_DATE_FORMAT).date()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        users = split_id_from_string(user_ids)
        if users:
            users = User.objects.filter(id__in=users).all()
        else:
            return self.response_ok()
        tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            users,
            [organization.id],
            tags=tag_ids,
        )

        ranges = split_ranges(
            from_date, end_date, trim_whitespace(statistic_by)
        )
        data = []

        for user in users:
            filter_durations = get_list_durations_by_users(
                durations=durations,
                large_id=large_category_id,
                medium_id=medium_category_id,
                small_id=small_category_id,
                users=[user],
            )
            user_total_duration = get_total_durations(filter_durations)
            user_durations = self._get_durations_by_range(
                filter_durations, ranges, durations
            )
            data.append(
                {
                    "user": CreationDataUserSerializer(user).data,
                    "total_duration": format_duration(user_total_duration),
                    "durations": user_durations,
                }
            )

        return self.response_ok(data)

    def _get_durations_by_range(self, filter_durations, ranges, root_durations):
        """
        Handle get duration by durations filter by category, tag...
        """
        durations = []
        for start, end in ranges:
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            root_durations_per_range = root_durations.filter(
                started_at__gte=start_date_min,
                paused_at__lte=end_date_max,
            )
            total_duration = (
                get_total_durations(root_durations_per_range)
                if root_durations_per_range
                else timedelta(0)
            )
            duration = timedelta(0)
            if filter_durations:
                filter_duration_by_range = filter_durations.filter(
                    started_at__gte=start_date_min,
                    paused_at__lte=end_date_max,
                )
                duration = get_total_durations(filter_duration_by_range)
            # Calculate the percentage of a user's duration relative to the total duration within a time range
            percent_per_range = percentage_calculation_of_duration(
                total_duration.total_seconds(), duration.total_seconds()
            )
            durations.append(
                {
                    "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                    "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                    "duration": format_duration(duration),
                    "percent_per_range": min(round(percent_per_range), 100),
                }
            )

        return durations
