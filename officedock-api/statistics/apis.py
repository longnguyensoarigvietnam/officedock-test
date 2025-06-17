from datetime import datetime, time, timedelta
from itertools import chain

from django.db.models import (
    Sum,
    ExpressionWrapper,
    F,
    DurationField,
    Case,
    When,
    Q,
)
from django.db.models.functions import Now, Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.timezone import now
from django.utils.translation import trim_whitespace
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES
from base.paginations import BasePagination
from common.constants import BASE_DATE_FORMAT
from common.serializers import (
    CreationDataUserSerializer,
)
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    split_id_from_string,
    get_organizations_of_user_by_screen_role,
)
from organizations.constants import CategoryColors, OrganizationTypes
from organizations.models import Organization
from stat_data.constants import ALL_TEAM, FilterTime, NONE_CATEGORY
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
    split_ranges,
    build_category_filters,
    get_list_durations_by_users,
    get_total_durations,
    get_duration_of_none_category,
    check_is_not_none_category,
    validate_date_by_regex_and_reformat,
    percentage_calculation_of_duration,
)
from tasks.constants import TaskCategoryTypes
from tasks.models import Task
from users.models import User
from roles.constants import Screens, Actions
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
            OpenApiParameter(name="organization_id", type=str),
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
        organization_id_param = request.query_params.get("organization_id")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_id = request.query_params.get("user_id")
        tag_ids_param = request.query_params.get("tag_ids")
        tag_ids = []
        total_duration = request.query_params.get("total_duration")
        ordering = request.query_params.get("ordering")
        cursor = request.query_params.get("cursor")
        cursor_id = request.query_params.get("cursor_id")
        is_tag_page = request.query_params.get("is_tag_page")
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        if user_id:
            user = User.objects.filter(id=user_id).first()
            if not user:
                raise NotFound()
        if organization_ids_param is None or organization_ids_param == ALL_TEAM:
            filter_orgs = Q(users=user)
            # Filter a organization in all team
            if organization_id_param:
                filter_orgs &= Q(id=organization_id_param)
            organization_ids = Organization.all_objects.filter(
                filter_orgs
            ).values_list("id", flat=True)
        else:
            organization_ids = split_id_from_string(organization_ids_param)

        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            [],
            organization_ids,
            tags=tag_ids,
        )
        tasks, events = get_list_models(durations)
        tasks = (
            tasks.filter(
                Q(task_durations__user=user)
                & Q(
                    Q(
                        Q(task_durations__started_at__gte=start_of_day)
                        & Q(task_durations__paused_at__lte=end_of_day)
                    )
                    | Q(
                        Q(task_durations__started_at__lte=end_of_day)
                        & Q(task_durations__started_at__gte=start_of_day)
                        & Q(task_durations__paused_at__isnull=True)
                    )
                )
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
                Q(task_durations__user=user)
                & Q(
                    Q(
                        Q(task_durations__started_at__gte=start_of_day)
                        & Q(task_durations__paused_at__lte=end_of_day)
                    )
                    | Q(
                        Q(task_durations__started_at__lte=end_of_day)
                        & Q(task_durations__started_at__gte=start_of_day)
                        & Q(task_durations__paused_at__isnull=True)
                    )
                )
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
        current_total_percent = 0
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
                        "current_total_percent": current_total_percent,
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
                        "current_total_percent": current_total_percent,
                    },
                )
            current_total_percent += serializer.data.get("percent")
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
        statistic_by = request.query_params.get("statistic_by")
        is_tag_page = request.query_params.get("is_tag_page")

        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        user = get_object_or_404(User, id=user_id) if user_id else request.user
        calendar_org = user.company.get_calendar_organization()

        if organization_ids_param is None or organization_ids_param == ALL_TEAM:
            organization_ids = Organization.all_objects.filter(
                users=user
            ).values_list("id", flat=True)
        else:
            organization_ids = split_id_from_string(organization_ids_param)

        tag_ids = split_id_from_string(tag_ids_param)
        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            [user],
            organization_ids,
            tags=tag_ids,
        )
        durations = get_list_durations_by_users(
            durations=durations,
            large_id=large_category_id,
            medium_id=medium_category_id,
            tags=tag_ids,
        )
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
        total_duration = get_total_durations(durations)

        def _get_durations_by_time(filter_durations, percent, duration):
            """
            Handle get duration by time
            """
            durations = []
            percent = 0
            for index, (start, end) in enumerate(ranges):
                is_last_element = index == len(ranges) - 1

                start_date_min = datetime.combine(start, time.min)
                end_date_max = datetime.combine(end, time.max)
                total_duration = timedelta(0)
                percent_per_total_duration = 0
                if filter_durations:
                    # Get duration by range
                    if start <= now().date() <= end:
                        filter_duration_by_range = filter_durations.filter(
                            Q(
                                Q(
                                    Q(started_at__gte=start_date_min)
                                    & Q(paused_at__lte=end_date_max)
                                )
                                | Q(
                                    Q(started_at__lte=end_date_max)
                                    & Q(started_at__gte=start_date_min)
                                    & Q(paused_at__isnull=True)
                                )
                            )
                        )
                    else:
                        filter_duration_by_range = filter_durations.filter(
                            Q(
                                Q(started_at__gte=start_date_min)
                                & Q(Q(paused_at__lte=end_date_max)),
                            )
                        )
                    total_duration = get_total_durations(
                        filter_duration_by_range
                    )
                    # Calculate the percentage of the total duration
                    (
                        percent_per_total_duration,
                        percent,
                    ) = percentage_calculation_of_duration(
                        total_duration.total_seconds(),
                        duration.total_seconds(),
                        percent,
                        is_last_element,
                    )

                durations.append(
                    {
                        "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                        "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                        "duration": format_duration(total_duration),
                        "percent": percent_per_total_duration,
                    }
                )
            return durations

        if medium_category_id and calendar_org.id in organization_ids:
            durations = get_list_durations_by_users(
                start_of_day=None,
                end_of_day=None,
            )

        if is_tag_page:
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
                organization_ids_param=organization_ids_param,
            )

            if not tag_list:
                # Return empty data
                data.append(
                    {
                        "tag_id": None,
                        "tag_name": NONE_CATEGORY,
                        "duration": "00:00:00",
                        "durations": _get_durations_by_time(
                            None, 100, "00:00:00"
                        ),
                    }
                )
                return self.response_ok(data)
            percent = 0
            # Handle get list duration by ranges
            for index, tag in enumerate(tag_list):
                is_last_element = index == len(tag_list) - 1
                org_id = tag["organization_id"]
                organization = Organization.all_objects.filter(
                    id=org_id
                ).first()
                tag["organization_name"] = organization.name
                if check_is_not_none_category(
                    large_category_id, medium_category_id, small_category_id
                ):
                    filter_durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                        medium_id=medium_category_id,
                        small_id=small_category_id,
                        tags=[tag["tag_id"]],
                        organizations=[organization],
                    )
                else:
                    filter_durations = get_list_durations_by_users(
                        durations=durations,
                        tags=[tag["tag_id"]],
                        organizations=[organization],
                    )
                tag["duration"] = get_total_durations(filter_durations)
                # Calculate the percentage of the total duration
                (
                    percent_per_total_duration,
                    percent,
                ) = percentage_calculation_of_duration(
                    total_duration.total_seconds(),
                    tag["duration"].total_seconds(),
                    percent,
                    is_last_element,
                )
                tag["percent"] = percent_per_total_duration
                tag["durations"] = _get_durations_by_time(
                    filter_durations, 100, tag["duration"]
                )
                tag["duration"] = format_duration(tag["duration"])
                data.append(tag)
            return self.response_ok(data)
        category_list = aggregate_durations(
            durations=durations,
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
            organization_ids_param=organization_ids_param,
        )
        if not category_list:
            # Return empty data
            data = [
                {
                    "category_id": None,
                    "category_name": NONE_CATEGORY,
                    "category_color": CategoryColors.GRAY.value,
                    "duration": "00:00:00",
                    "durations": _get_durations_by_time(None, 100, "00:00:00"),
                }
            ]
            return self.response_ok(data)

        percent = 0
        # Handle get list duration by ranges
        for index, category in enumerate(category_list):
            is_last_element = index == len(category_list) - 1
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
            # Calculate the percentage of the total duration
            (
                percent_per_total_duration,
                percent,
            ) = percentage_calculation_of_duration(
                total_duration.total_seconds(),
                category["duration"].total_seconds(),
                percent,
                is_last_element,
            )
            category["percent"] = percent_per_total_duration
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
        tag_ids = []
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        calendar_org = user.company.get_calendar_organization()
        if organization_ids_param is None or organization_ids_param == ALL_TEAM:
            organization_ids = Organization.all_objects.filter(
                users=user
            ).values_list("id", flat=True)
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
            total_duration = get_total_durations(durations)
            category_list = aggregate_durations(
                durations=durations,
                organization_ids_param=organization_ids_param,
            )

            # Process large categories
            if category_list:
                data["large_total_duration"] = format_duration(total_duration)
                data["large_categories"] = process_categories(
                    category_list,
                    total_duration,
                    TaskCategoryTypes.LARGE.value,
                    is_with_tasks=True,
                    durations=durations,
                )
                # Process medium categories if large_category_id is provided
                if large_category_id:
                    durations = get_list_durations_by_users(
                        durations=durations,
                        large_id=large_category_id,
                    )
                    duration = get_total_durations(durations)
                    category_list = aggregate_durations(
                        durations=durations,
                        large_category_id=large_category_id,
                    )

                    data["medium_total_duration"] = format_duration(duration)
                    data["medium_categories"] = process_categories(
                        category_list,
                        duration,
                        TaskCategoryTypes.MEDIUM.value,
                        durations=durations,
                        is_with_tasks=True,
                    )
                    # Process small categories if medium_category_id is provided
                    if (
                        medium_category_id
                        and calendar_org.id not in organization_ids
                    ):
                        durations = get_list_durations_by_users(
                            durations=durations,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                        )
                        duration = get_total_durations(durations)
                        category_list = aggregate_durations(
                            durations=durations,
                            large_category_id=large_category_id,
                            medium_category_id=medium_category_id,
                        )
                        data["small_total_duration"] = format_duration(duration)
                        data["small_categories"] = process_categories(
                            category_list,
                            duration,
                            TaskCategoryTypes.SMALL.value,
                            durations=durations,
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
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        if organization_ids_param is None or organization_ids_param == ALL_TEAM:
            organization_ids = Organization.all_objects.filter(
                users=user
            ).values_list("id", flat=True)
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
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
                organization_ids_param=organization_ids_param,
            )
            if tag_list:
                data["large_total_duration"] = format_duration(total_duration)
                data["large_categories"] = process_tags(
                    tag_list,
                    total_duration,
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
                    data["medium_categories"] = process_tags(
                        tag_list,
                        total_duration,
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
                        data["small_categories"] = process_tags(
                            tag_list,
                            total_duration,
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
        statistic_by = request.query_params.get("statistic_by")
        is_tag_page = request.query_params.get("is_tag_page")
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        user = get_object_or_404(User, id=user_id) if user_id else request.user
        calendar_org = user.company.get_calendar_organization()

        if organization_ids_param is None or organization_ids_param == ALL_TEAM:
            organization_ids = Organization.all_objects.filter(
                users=user
            ).values_list("id", flat=True)
        else:
            organization_ids = split_id_from_string(organization_ids_param)
        tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            [user],
            organization_ids,
            tags=tag_ids,
        )
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

        # Handle for statistic tag mydock page
        if is_tag_page:
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
                organization_ids_param=organization_ids_param,
            )
            if medium_category_id and calendar_org.id in organization_ids:
                durations = get_list_durations_by_users(
                    start_of_day=None,
                    end_of_day=None,
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
        # Handle for statistic category mydock page
        category_list = aggregate_durations(
            durations=durations,
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
            organization_ids_param=organization_ids_param,
        )
        if medium_category_id and calendar_org.id in organization_ids:
            durations = get_list_durations_by_users(
                start_of_day=None,
                end_of_day=None,
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
        tag_ids=None,
    ):
        """
        Response data of change percentage over the period
        """

        if tag_ids is None:
            tag_ids = []

        def _handle_get_filter_durations(id, filter_duration_by_range):
            filter_durations = None
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
            percent = 0
            elements = []
            total_sec = total_duration.total_seconds()
            # Get list data tag will show from data list,
            # then take id tag to filter duration get response duration time and percent per total duration of tag within range time.
            for index, tag in enumerate(data_list):
                organization = Organization.all_objects.filter(
                    id=tag["organization_id"]
                ).first()
                is_last_element = index == len(data_list) - 1
                filter_duration = get_list_durations_by_users(
                    durations=durations_by_range,
                    tags=[tag["tag_id"]],
                    organizations=[organization],
                )
                if not filter_duration.exists():
                    continue
                duration = get_total_durations(filter_duration)
                (
                    percent_per_total_duration,
                    percent,
                ) = percentage_calculation_of_duration(
                    total_sec,
                    duration.total_seconds(),
                    percent,
                    is_last_element,
                )
                elements.append(
                    {
                        "tag_id": tag["tag_id"],
                        "tag_name": tag["tag_name"],
                        "duration": format_duration(duration),
                        "percent": percent_per_total_duration,
                    }
                )
            return elements

        for start, end in ranges:
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            # Get duration by range
            if start <= now().date() <= end:
                durations_by_range = durations.filter(
                    Q(
                        Q(
                            Q(started_at__gte=start_date_min)
                            & Q(paused_at__lte=end_date_max)
                        )
                        | Q(
                            Q(started_at__lte=end_date_max)
                            & Q(started_at__gte=start_date_min)
                            & Q(paused_at__isnull=True)
                        )
                    )
                )
            else:
                durations_by_range = durations.filter(
                    Q(
                        Q(started_at__gte=start_date_min)
                        & Q(Q(paused_at__lte=end_date_max)),
                    )
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
                        )
                        if durations
                        else [],
                        "total_duration": format_duration(total_duration),
                    }
                )
            elif data_list:
                filter_duration_by_range = get_list_durations_by_users(
                    durations=durations_by_range,
                    large_id=large_category_id,
                    medium_id=medium_category_id,
                    small_id=small_category_id,
                )
                # Get total duration of duration by range
                total_duration = get_total_durations(filter_duration_by_range)

                percent = 0
                # Handle get list duration by ranges
                for index, ele in enumerate(data_list):
                    is_last_element = index == len(data_list) - 1
                    id = ele["category_id"]
                    organization_id = ele["organization_id"]
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
                    # Filter durations for the category by organization id
                    filter_durations = filter_durations.filter(
                        Q(task__organization__id=organization_id)
                        | Q(schedule__organization__id=organization_id)
                    )
                    duration = get_total_durations(filter_durations)
                    # Calculate the percentage of the total duration
                    total_sec = total_duration.total_seconds()
                    (
                        percent_per_total_duration,
                        percent,
                    ) = percentage_calculation_of_duration(
                        total_sec,
                        duration.total_seconds(),
                        percent,
                        is_last_element,
                    )
                    elements.append(
                        {
                            "category_id": id,
                            "category_name": ele["category_name"],
                            "category_color": ele["category_color"],
                            "duration": format_duration(duration),
                            "percent": percent_per_total_duration,
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
    queryset = Organization.all_objects.all()

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="large_category_id", type=str),
            OpenApiParameter(name="medium_category_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
            OpenApiParameter(name="user_ids", type=str),
            OpenApiParameter(name="organization_id", type=str),
            OpenApiParameter(name="organization_get_members_id", type=str),
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
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        user = request.user
        tag_ids_param = request.query_params.get("tag_ids")
        user_ids_param = request.query_params.get("user_ids")
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        organization_id = request.query_params.get("organization_id")
        organization_get_members_id = request.query_params.get(
            "organization_get_members_id"
        )
        calendar_org = user.company.get_calendar_organization()
        if not organization_id:
            raise NotFound()
        if organization_id == ALL_TEAM:
            organizations = get_organizations_of_user_by_screen_role(
                user, Screens.TEAMDOCK.value, Actions.VIEW.value
            )
        else:
            organizations = [
                Organization.all_objects.filter(id=organization_id).first()
            ]
            if not organizations[0]:
                raise NotFound(ERROR_MESSAGES["organization_not_exists"])
        if user_ids_param:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids_param)
            )
        else:
            org = (
                organizations
                if not organization_get_members_id
                else [
                    get_object_or_404(
                        Organization, id=organization_get_members_id
                    )
                ]
            )
            users = User.objects.filter(organizations__in=org).distinct()
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        data = {}
        tag_ids = split_id_from_string(tag_ids_param)
        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            users,
            organizations=organizations,
            tags=tag_ids,
        )
        total_duration = get_total_durations(durations)
        category_list = aggregate_durations(
            durations=durations,
            organization_ids_param=organization_id,
        )
        if not durations.exists() or category_list is None:
            return self.response_ok(data)
        # Process large categories
        data["large_total_duration"] = format_duration(total_duration)
        data["large_categories"] = process_categories(
            category_list,
            total_duration,
            TaskCategoryTypes.LARGE.value,
            durations=durations,
            is_with_users=True,
        )
        # Process medium categories if large_category_id is provided
        if large_category_id and organization_id != ALL_TEAM:
            data = self._handle_get_statistic_category(
                durations,
                data,
                TaskCategoryTypes.MEDIUM.value,
                large_category_id=large_category_id,
                medium_category_id=None,
                small_category_id=None,
                type_total_duration="medium_total_duration",
                type_category="medium_categories",
                organization_id=organization_id,
            )
            # Process small categories if medium_category_id is provided
            if medium_category_id and calendar_org not in organizations:
                data = self._handle_get_statistic_category(
                    durations,
                    data,
                    TaskCategoryTypes.SMALL.value,
                    large_category_id=large_category_id,
                    medium_category_id=medium_category_id,
                    small_category_id=None,
                    type_total_duration="small_total_duration",
                    type_category="small_categories",
                    organization_id=organization_id,
                )

        return self.response_ok(data)

    def _handle_get_statistic_category(
        self,
        durations,
        data,
        task_category_type,
        large_category_id=None,
        medium_category_id=None,
        small_category_id=None,
        type_total_duration=None,
        type_category=None,
        organization_id=None,
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
        total_duration = get_total_durations(durations)
        category_list = aggregate_durations(
            durations=durations,
            large_category_id=large_category_id,
            medium_category_id=medium_category_id,
            organization_ids_param=organization_id,
        )
        data[type_total_duration] = format_duration(total_duration)
        data[type_category] = process_categories(
            category_list,
            total_duration,
            task_category_type,
            is_with_users=True,
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
            OpenApiParameter(name="organization_id", type=str),
            OpenApiParameter(name="organization_get_members_id", type=str),
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
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        organization_id = request.query_params.get("organization_id")
        tag_ids_param = request.query_params.get("tag_ids")
        user_ids_param = request.query_params.get("user_ids")
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        organization_get_members_id = request.query_params.get(
            "organization_get_members_id"
        )
        calendar_org = user.company.get_calendar_organization()
        if organization_id == ALL_TEAM:
            organizations = get_organizations_of_user_by_screen_role(
                user, Screens.TEAMDOCK.value, Actions.VIEW.value
            )
        else:
            organizations = [
                Organization.all_objects.filter(id=organization_id).first()
            ]
            if not organizations[0]:
                raise NotFound(ERROR_MESSAGES["organization_not_exists"])
        if user_ids_param:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids_param)
            )
        else:
            org = (
                organizations
                if not organization_get_members_id
                else [
                    get_object_or_404(
                        Organization, id=organization_get_members_id
                    )
                ]
            )
            users = User.objects.filter(organizations__in=org).distinct()
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
            organizations,
            tags=tag_ids,
        )
        total_duration, tag_list = process_merge_card_per_tag(
            tag_ids,
            durations=durations,
            organization_ids_param=organization_id,
        )
        if not durations.exists() or tag_list is None:
            return self.response_ok(data)

        data["large_total_duration"] = format_duration(total_duration)
        data["large_categories"] = process_tags(
            tag_list,
            total_duration,
            is_with_users=True,
            durations=durations,
        )

        if large_category_id and organization_id != ALL_TEAM:
            data = self._handle_get_statistic_tag_by_categories(
                durations,
                tag_ids,
                data,
                large_category_id=large_category_id,
                medium_category_id=None,
                small_category_id=None,
                type_total_duration="medium_total_duration",
                type_category="medium_categories",
                organization_id=organization_id,
            )

            if medium_category_id and calendar_org.id not in organizations:
                data = self._handle_get_statistic_tag_by_categories(
                    durations,
                    tag_ids,
                    data,
                    large_category_id=large_category_id,
                    medium_category_id=medium_category_id,
                    small_category_id=None,
                    type_total_duration="small_total_duration",
                    type_category="small_categories",
                    organization_id=organization_id,
                )

                if small_category_id:
                    data = self._handle_get_statistic_tag_by_categories(
                        durations,
                        tag_ids,
                        data,
                        large_category_id=large_category_id,
                        medium_category_id=medium_category_id,
                        small_category_id=small_category_id,
                        type_total_duration="category_total_duration",
                        type_category="category",
                        organization_id=organization_id,
                    )

        return self.response_ok(data)

    def _handle_get_statistic_tag_by_categories(
        self,
        durations,
        tag_ids,
        data,
        large_category_id=None,
        medium_category_id=None,
        small_category_id=None,
        type_total_duration=None,
        type_category=None,
        organization_id=None,
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
        total_duration, tag_list = process_merge_card_per_tag(
            tag_ids,
            durations=durations,
            organization_ids_param=organization_id,
        )
        data[type_total_duration] = format_duration(total_duration)
        data[type_category] = process_tags(
            tag_list,
            total_duration,
            durations=durations,
            is_with_users=True,
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
        statistic_by = request.query_params.get("statistic_by")
        request.query_params.get("is_tag_page")
        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
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
        data = []
        ranges = split_ranges(
            from_date, end_date, trim_whitespace(statistic_by)
        )
        if (
            not durations.exists()
            or medium_category_id
            and organization.type is OrganizationTypes.CALENDAR.value
        ):
            user_durations = self._get_durations_by_range(
                None, ranges, durations
            )
            return self.response_ok(
                {
                    "user": None,
                    "total_duration": format_duration(timedelta(0)),
                    "durations": user_durations,
                }
            )

        filter_with_category_durations = get_list_durations_by_users(
            durations=durations,
            large_id=large_category_id,
            medium_id=medium_category_id,
            small_id=small_category_id,
        )

        for user in users:
            filter_durations = get_list_durations_by_users(
                durations=filter_with_category_durations,
                users=[user],
            )
            if not filter_durations:
                continue
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
        percent = 0
        for index, (start, end) in enumerate(ranges):
            is_last_element = index == len(ranges) - 1
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            duration = timedelta(0)
            # Get duration by range
            if start <= now().date() <= end:
                filters = Q(
                    Q(
                        Q(started_at__gte=start_date_min)
                        & Q(paused_at__lte=end_date_max)
                    )
                    | Q(
                        Q(started_at__lte=end_date_max)
                        & Q(started_at__gte=start_date_min)
                        & Q(paused_at__isnull=True)
                    )
                )
                # Get all durations per range for calculate total duration in this time
                root_durations_per_range = root_durations.filter(filters)
                # Get all durations per range by USER
                if filter_durations:
                    filter_duration_by_range = filter_durations.filter(filters)
                    duration = get_total_durations(filter_duration_by_range)
            else:
                # Get all durations per range for calculate total duration in this time
                root_durations_per_range = root_durations.filter(
                    started_at__gte=start_date_min,
                    paused_at__lte=end_date_max,
                )
                # Get all durations per range by USER
                if filter_durations:
                    filter_duration_by_range = filter_durations.filter(
                        started_at__gte=start_date_min,
                        paused_at__lte=end_date_max,
                    )
                    duration = get_total_durations(filter_duration_by_range)
            # Get total duration of root dutions per range
            total_duration = (
                get_total_durations(root_durations_per_range)
                if root_durations_per_range
                else timedelta(0)
            )

            # Calculate the percentage of a user's duration relative to the total duration within a time range
            percent_per_range, percent = percentage_calculation_of_duration(
                total_duration.total_seconds(),
                duration.total_seconds(),
                percent,
                is_last_element,
            )
            durations.append(
                {
                    "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                    "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                    "duration": format_duration(duration),
                    "percent_per_range": percent_per_range,
                }
            )

        return durations
