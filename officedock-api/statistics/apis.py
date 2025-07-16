import math
from collections import defaultdict
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
from common.constants import BASE_DATE_FORMAT, AVATAR_GCS_EXPIRATION_SECONDS
from common.serializers import (
    CreationDataUserSerializer,
)
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    split_id_from_string,
    get_organizations_of_user_by_screen_role,
    validate_company_organization,
    get_signed_url,
)
from organizations.constants import OrganizationTypes
from organizations.models import Organization
from stat_data.constants import (
    ALL_TEAM,
    CALENDAR,
    FilterTime,
    MAIN_TEAM,
    SUB_TEAM,
)
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
    get_list_durations_by_users,
    get_total_durations,
    get_duration_of_none_category,
    check_is_not_none_category,
    validate_date_by_regex_and_reformat,
    percentage_calculation_of_duration,
    process_team_categories,
    process_team_tags,
    build_category_filters,
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
        validate_company_organization(user.company, organization_id_param)
        large_category_id = request.query_params.get("large_category_id")
        medium_category_id = request.query_params.get("medium_category_id")
        small_category_id = request.query_params.get("small_category_id")
        user_id = request.query_params.get("user_id")
        tag_ids_param = request.query_params.get("tag_ids")
        tag_ids = []
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
            user = get_object_or_404(User, id=user_id)
        if organization_ids_param is None or organization_ids_param == ALL_TEAM:
            organization_by_role = get_organizations_of_user_by_screen_role(
                user, Screens.TEAMDOCK.value, Actions.VIEW.value
            )
            filter_orgs = Q(id__in=organization_by_role)
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
            [user],
            organization_ids,
            tags=tag_ids,
        )
        durations = get_list_durations_by_users(
            durations=durations,
            large_id=large_category_id,
            medium_id=medium_category_id,
            small_id=small_category_id,
        )
        total_duration = get_total_durations(durations, is_tag_page, tag_ids)
        total_duration = format_duration(total_duration)
        filters = Q(
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
        if organization_id_param:
            filters &= Q(organization_id=organization_id_param)
        tasks, events = get_list_models(durations)
        tasks = (
            tasks.filter(filters)
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
            events.filter(filters)
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
        return paginator.get_paginated_response(
            paginated_data, total_duration=total_duration
        )

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
            small_id=small_category_id,
            tags=tag_ids,
        )
        data = {"durations": []}
        if not check_is_not_none_category(
            large_category_id, medium_category_id, small_category_id
        ):
            durations = get_duration_of_none_category(
                durations, large_category_id, medium_category_id
            )
        ranges = split_ranges(
            from_date, end_date, trim_whitespace(statistic_by)
        )

        if medium_category_id and calendar_org.id in organization_ids:
            return self.response_ok(data)

        for index, (start, end) in enumerate(ranges):
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            filter_duration_by_range = durations.filter(
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
            if is_tag_page:
                total_duration, tag_list = process_merge_card_per_tag(
                    tag_ids,
                    durations=filter_duration_by_range,
                    organization_ids=organization_ids,
                )
                range_data = process_tags(
                    tag_list,
                    total_duration,
                    durations=filter_duration_by_range,
                )
            else:
                total_duration = get_total_durations(filter_duration_by_range)
                category_list = aggregate_durations(
                    durations=filter_duration_by_range,
                    large_category_id=large_category_id,
                    medium_category_id=medium_category_id,
                )
                type_cat = TaskCategoryTypes.LARGE.value
                if large_category_id:
                    type_cat = TaskCategoryTypes.MEDIUM.value
                elif medium_category_id:
                    type_cat = TaskCategoryTypes.SMALL.value
                range_data = process_categories(
                    category_list,
                    total_duration,
                    type_cat,
                    durations=durations,
                )
            data["durations"].append(
                {
                    "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                    "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                    "data": range_data,
                }
            )
        # Get data for table under chart
        if is_tag_page:
            total_duration, tag_list = process_merge_card_per_tag(
                tag_ids, durations=durations, organization_ids=organization_ids
            )
            data["data"] = process_tags(
                tag_list,
                total_duration,
                durations=durations,
            )
        else:
            total_duration = get_total_durations(durations)
            category_list = aggregate_durations(
                durations=durations,
                large_category_id=large_category_id,
                medium_category_id=medium_category_id,
                organization_ids_param=organization_ids_param,
            )

            data["data"] = process_categories(
                category_list,
                total_duration,
                TaskCategoryTypes.LARGE.value,
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
                if large_category_id and organization_ids_param != ALL_TEAM:
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
                organization_ids=organization_ids,
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
                        organization_ids=organization_ids,
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
                    if (
                        medium_category_id
                        and calendar_org.id not in organization_ids
                    ):
                        durations = get_list_durations_by_users(
                            durations=durations,
                            large_id=large_category_id,
                            medium_id=medium_category_id,
                        )
                        total_duration, tag_list = process_merge_card_per_tag(
                            tag_ids,
                            durations=durations,
                            organization_ids=organization_ids,
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
                                organization_ids=organization_ids,
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
        if not users:
            return self.response_ok(data)
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
        company = user.company
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
        calendar_org = company.get_calendar_organization()

        if organization_id == ALL_TEAM:
            organizations = get_organizations_of_user_by_screen_role(
                user, Screens.TEAMDOCK.value, Actions.VIEW.value
            )
        else:
            organization = validate_company_organization(
                company, organization_id
            )
            organizations = [organization.id]

        if user_ids_param:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids_param)
            )
        else:
            orgs = organizations
            if organization_get_members_id:
                orgs = [
                    validate_company_organization(
                        company, organization_get_members_id
                    )
                ]
            users = User.objects.filter(organizations__in=orgs).distinct()

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
            organization_ids=organizations,
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
                organizations=organizations,
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
                    organizations=organizations,
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
                        organizations=organizations,
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
        organizations=None,
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
            organization_ids=organizations,
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
                [
                    {
                        "user": None,
                        "total_duration": format_duration(timedelta(0)),
                        "durations": user_durations,
                    }
                ]
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
                filter_durations, ranges, filter_with_category_durations
            )
            data.append(
                {
                    "user": CreationDataUserSerializer(user).data,
                    "total_duration": format_duration(user_total_duration),
                    "durations": user_durations,
                }
            )

        return self.response_ok(self._normalize_percent_per_range(data))

    def _get_durations_by_range(self, filter_durations, ranges, root_durations):
        """
        Handle get duration by durations filter by category, tag...
        """
        durations = []
        for index, (start, end) in enumerate(ranges):
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

    def _normalize_percent_per_range(self, data):
        """
        Handle normalize percent per range if total percent < 100%
        """
        # Map: (startDate, endDate) -> list of (user, duration_dict)
        range_users = defaultdict(list)

        for user in data:
            for duration in user.get("durations", []):
                key = (duration["start_date"], duration["end_date"])
                range_users[key].append((user, duration))

        # Normalize
        for key, user_durations in range_users.items():
            total = sum(
                duration["percent_per_range"] for _, duration in user_durations
            )

            if total != 100 and total > 0:
                count = len(user_durations)
                base = math.floor(100 / count)
                remainder = 100 - (base * count)

                for idx, (_, duration) in enumerate(user_durations):
                    duration["percent_per_range"] = base + (
                        1 if idx < remainder else 0
                    )

        return data


@extend_schema(tags=["System > All Team Statistics"])
class AllTeamStatisticViewSet(BaseAPIViewSet):
    """API endpoint for statistics"""

    permission_classes = [ActionPermission]
    filter_backends = [FilterByPermission]
    screen_name = Screens.STATISTIC.value

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="main_organization_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
            OpenApiParameter(name="user_ids", type=str),
            OpenApiParameter(name="is_tag_page", type=bool),
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
        Returns a list of statistic all team.
        """
        user = request.user
        main_organization_id = request.query_params.get("main_organization_id")
        main_organization = (
            get_object_or_404(Organization, id=main_organization_id)
            if main_organization_id
            else user.get_main_organization()
        )
        is_tag_page = request.query_params.get("is_tag_page")
        user_ids = request.query_params.get("user_ids")
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
        if not user_ids:
            users = [user]
        else:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids)
            ).all()
        organization_ids = (
            Organization.all_objects.filter(users__in=users)
            .values_list("id", flat=True)
            .distinct()
        )
        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

        data = {}
        if organization_ids:
            durations = get_list_durations_by_users(
                start_of_day,
                end_of_day,
                users,
                organization_ids,
                tags=tag_ids,
            )
            if not durations.exists():
                return self.response_ok(data)
            if is_tag_page:
                total_duration, tag_list = process_merge_card_per_tag(
                    tag_ids,
                    durations=durations,
                    organization_ids=organization_ids,
                )
                if tag_list:
                    data["large_categories"] = process_team_tags(
                        tag_list,
                        total_duration,
                        durations=durations,
                        main_organization=main_organization,
                        calendar_organization=calendar_org,
                    )
            else:
                total_duration = get_total_durations(durations)
                category_list = aggregate_durations(
                    durations=durations,
                )
                # Process large categories
                if category_list:
                    data["large_categories"] = process_team_categories(
                        category_list,
                        total_duration,
                        durations=durations,
                        main_organization=main_organization,
                        calendar_organization=calendar_org,
                    )

            data["large_total_duration"] = format_duration(total_duration)
        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter(name="from_date", type=datetime),
            OpenApiParameter(name="end_date", type=datetime),
            OpenApiParameter(name="main_organization_id", type=str),
            OpenApiParameter(name="tag_ids", type=str),
            OpenApiParameter(name="user_ids", type=str),
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
            OpenApiParameter(
                name="option",
                type=str,
                enum=[
                    MAIN_TEAM,
                    SUB_TEAM,
                    CALENDAR,
                ],
                required=False,
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
        user = request.user
        main_organization_id = request.query_params.get("main_organization_id")
        main_organization = (
            get_object_or_404(Organization, id=main_organization_id)
            if main_organization_id
            else user.get_main_organization()
        )
        user_ids = request.query_params.get("user_ids")
        tag_ids_param = request.query_params.get("tag_ids")
        statistic_by = request.query_params.get("statistic_by")
        is_tag_page = request.query_params.get("is_tag_page")
        option = request.query_params.get("option")

        from_date = validate_date_by_regex_and_reformat(
            request.query_params.get("from_date")
        )
        end_date = validate_date_by_regex_and_reformat(
            request.query_params.get("end_date")
        )
        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        calendar_org = user.company.get_calendar_organization()
        if not user_ids:
            users = [user]
        else:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids)
            ).all()
        organization_ids = Organization.all_objects.filter(
            users__in=users
        ).values_list("id", flat=True)
        tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            [user],
            organization_ids,
            tags=tag_ids,
        )
        data = {"durations": [], "data": []}
        if not durations.exists():
            return self.response_ok(data)

        ranges = split_ranges(
            from_date, end_date, trim_whitespace(statistic_by)
        )
        for index, (start, end) in enumerate(ranges):
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            filter_duration_by_range = durations.filter(
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
            if is_tag_page:
                total_duration, data_list = process_merge_card_per_tag(
                    tag_ids,
                    durations=filter_duration_by_range,
                    organization_ids=organization_ids,
                )
                teams = process_team_tags(
                    data_list,
                    total_duration,
                    durations=filter_duration_by_range,
                    main_organization=main_organization,
                    calendar_organization=calendar_org,
                )
            else:
                total_duration = get_total_durations(filter_duration_by_range)
                data_list = aggregate_durations(
                    durations=filter_duration_by_range,
                )
                teams = process_team_categories(
                    data_list,
                    total_duration,
                    durations=filter_duration_by_range,
                    main_organization=main_organization,
                    calendar_organization=calendar_org,
                )
            break_team = []
            for team in teams:
                if team.get("data"):
                    team.pop("data")
                subteams = []
                if team.get("sub_teams"):
                    subteams = team.pop("sub_teams")
                if user_ids and option:
                    team["users"] = []
                    if (
                        option == CALENDAR == team["organization_name"]
                        or option == MAIN_TEAM
                        and team["organization_id"] == int(main_organization_id)
                    ):
                        users_in_org = users.filter(
                            organizations__id=team["organization_id"]
                        )
                        team["users"] += self._get_list_users_duration_by_team(
                            users_in_org,
                            filter_duration_by_range,
                            team["organization_id"],
                            team["organization_name"],
                            time_str_to_timedelta(team["duration"]),
                        )
                        break_team.append(team)
                        break
                    elif option == SUB_TEAM:
                        for subteam in subteams:
                            users_in_org = users.filter(
                                organizations__id=subteam["organization_id"]
                            )
                            team[
                                "users"
                            ] += self._get_list_users_duration_by_team(
                                users_in_org,
                                filter_duration_by_range,
                                subteam["organization_id"],
                                subteam["organization_name"],
                                time_str_to_timedelta(team["duration"]),
                            )
                        break_team.append(team)
                        break

            break_team = break_team if user_ids and option else teams
            data["durations"].append(
                {
                    "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                    "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                    "data": break_team,
                }
            )
        if is_tag_page:
            total_duration, data_list = process_merge_card_per_tag(
                tag_ids,
                durations=durations,
                organization_ids=organization_ids,
            )
            teams = process_team_tags(
                data_list,
                total_duration,
                durations=durations,
                main_organization=main_organization,
                calendar_organization=calendar_org,
            )
        else:
            total_duration = get_total_durations(durations)
            data_list = aggregate_durations(
                durations=durations,
            )
            teams = process_team_categories(
                data_list,
                total_duration,
                durations=durations,
                main_organization=main_organization,
                calendar_organization=calendar_org,
            )

        for team in teams:
            if user_ids and option:
                team["users"] = []
                if team["organization_id"] != SUB_TEAM:
                    users_in_org = users.filter(
                        organizations__id=team["organization_id"]
                    )
                    team["users"] += self._get_list_users_duration_by_team(
                        users_in_org,
                        durations,
                        team["organization_id"],
                        team["organization_name"],
                        time_str_to_timedelta(team["duration"]),
                    )
            if team.get("sub_teams"):
                subteams = team.pop("sub_teams")
                if user_ids and option:
                    for subteam in subteams:
                        users_in_org = users.filter(
                            organizations__id=subteam["organization_id"]
                        )
                        team["users"] += self._get_list_users_duration_by_team(
                            users_in_org,
                            durations,
                            subteam["organization_id"],
                            subteam["organization_name"],
                            time_str_to_timedelta(team["duration"]),
                        )
            if team.get("data"):
                team.pop("data")

        data["data"] = teams
        return self.response_ok(data)

    def _get_list_users_duration_by_team(
        self,
        users,
        durations,
        organization_id,
        organization_name,
        total_duration,
    ):
        """
        Handle get list users duration for chart 3, 4
        """
        users_in_team = []
        percent = 0
        for user in users.values(
            "id", "profile__full_name", "avatar", "avatar_color"
        ):
            filter_duration_by_range_by_user = get_list_durations_by_users(
                durations=durations,
                users=[user["id"]],
                organizations=[organization_id],
            )
            duration_by_user = get_total_durations(
                filter_duration_by_range_by_user
            )
            # Calculate the percentage of the total duration
            (
                percent_per_total_duration,
                percent,
            ) = percentage_calculation_of_duration(
                total_duration.total_seconds(),
                duration_by_user.total_seconds(),
                percent,
            )
            users_in_team.append(
                {
                    "id": user["id"],
                    "full_name": organization_name
                    + " "
                    + user["profile__full_name"],
                    "avatar": get_signed_url(
                        user["avatar"], AVATAR_GCS_EXPIRATION_SECONDS
                    ),
                    "avatar_color": user["avatar_color"],
                    "total_duration": format_duration(duration_by_user),
                    "percent": percent_per_total_duration,
                }
            )

        return users_in_team
