from copy import deepcopy

import math
from collections import defaultdict
from datetime import datetime, time, timedelta
from itertools import chain
from urllib.parse import quote

from django.db.models import (
    Q,
    Count,
    Prefetch,
    Case,
    When,
    IntegerField,
    Value,
    DateTimeField,
    ExpressionWrapper,
    DurationField,
    F,
)
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.utils.translation import trim_whitespace
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES, KEYWORDS
from base.paginations import BasePagination
from calendars.constants import CalendarTypes, ScheduleCategoryTypes
from calendars.models import Schedule
from common.constants import BASE_DATE_FORMAT
from common.models import Category
from common.utils import (
    format_duration,
    get_deleted_statistic_category_name,
    time_str_to_timedelta,
    split_id_from_string,
    validate_company_organization,
)
from organizations.constants import OrganizationTypes
from organizations.models import Organization, OrganizationsStatisticCategories
from skills.constants import DEFAULT_TIME
from stat_data.constants import (
    ALL_TEAM,
    CALENDAR,
    FilterTime,
    MAIN_TEAM,
    SUB_TEAM,
    NONE_CATEGORY,
    SUB_TEAM_COLOR,
    MAIN_TEAM_COLOR,
    CALENDAR_COLOR,
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
    normalize_percentages,
    get_list_task_with_total_duration,
)
from tasks.constants import TaskCategoryTypes
from tasks.models import PeopleInChargeTasks, Task
from users.models import User
from users.serializers import BaseUserProfileSerializer
from roles.constants import Screens
from base.permissions import ActionPermission
from statistics.services.export import ExportTaskService
from statistics.constants import ExportType, PeriodClassification
from statistics.utils import (
    get_all_organization_id,
    handle_get_task_duration_of_teamdock,
)


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
            OpenApiParameter(name="main_organization_id", type=str),
            OpenApiParameter(
                name="export_type", type=str, enum=ExportType.values()
            ),
            OpenApiParameter(
                name="period_classification",
                type=str,
                enum=PeriodClassification.keys(),
            ),
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
        main_organization_id = request.query_params.get("main_organization_id")
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
        calendar_org = user.company.get_calendar_organization()

        # If it's tag page but no tag ids provided, return empty result directly to avoid unnecessary query
        if is_tag_page and not tag_ids_param:
            return self.response_ok(
                {"results": [], "total_duration": DEFAULT_TIME}
            )

        if user_id:
            user = get_object_or_404(User, id=user_id)
        if organization_ids_param == ALL_TEAM:
            organization_ids = get_all_organization_id(
                [user],
                exclude_team_unassigned=bool(main_organization_id),
            )
            # When main org not in input user orgs (input user unassigned in main organization)
            # Just show task duration in main org and calendar org of input user
            if (
                main_organization_id
                and int(main_organization_id) not in organization_ids
            ):
                organization_ids = [main_organization_id, calendar_org.id]
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
        # Get task/schedule duration map
        task_duration_map = get_list_task_with_total_duration(durations)
        schedule_duration_map = get_list_task_with_total_duration(
            durations, get_by_task=False
        )
        # Get task/schedule ids from duration
        task_ids = list(task_duration_map.keys())
        schedule_ids = list(schedule_duration_map.keys())
        # Get tasks model
        tasks = (
            Task.objects.filter(id__in=task_ids)
            .select_related("organization")
            .prefetch_related(
                Prefetch("tags", to_attr="prefetched_tags"),
                Prefetch(
                    "categories",
                    to_attr="prefetched_categories",
                    queryset=Category.objects.select_related(
                        "large_statistic_category",
                        "medium_statistic_category",
                        "small_statistic_category",
                    ),
                ),
            )
        )
        # Get schedule model
        events = (
            Schedule.objects.filter(id__in=schedule_ids)
            .select_related("organization")
            .prefetch_related(
                Prefetch("tags", to_attr="prefetched_tags"),
                Prefetch(
                    "categories",
                    to_attr="prefetched_categories",
                    queryset=Category.objects.select_related(
                        "large_statistic_category",
                        "medium_statistic_category",
                        "small_statistic_category",
                    ),
                ),
            )
        )
        org_of_task_ids = set(tasks.values_list("organization_id", flat=True))
        org_of_task_ids.add(calendar_org.id)
        category_types = [
            ("large_statistic_category", ScheduleCategoryTypes.LARGE.value),
            ("medium_statistic_category", ScheduleCategoryTypes.MEDIUM.value),
            ("small_statistic_category", ScheduleCategoryTypes.SMALL.value),
        ]
        org_values = Organization.all_objects.filter(
            id__in=org_of_task_ids
        ).values_list("id", "name", "type", "deleted_at")

        # Fetch organization-category metadata (e.g. color) in a single query
        org_cats = OrganizationsStatisticCategories.objects.filter(
            organization__in=org_of_task_ids
        ).values(
            "id",
            "organization_id",
            "large_statistic_category_id",
            "medium_statistic_category_id",
            "small_statistic_category_id",
            "deleted_type",
        )

        # Map organization-category pairs to their metadata for fast lookup
        org_cat_map = {}
        for oc in org_cats:
            org_id = oc["organization_id"]
            large_id = oc["large_statistic_category_id"]
            medium_id = oc["medium_statistic_category_id"]
            small_id = oc["small_statistic_category_id"]
            deleted_type = oc["deleted_type"]

            # full
            org_cat_map[(org_id, large_id, medium_id, small_id)] = deleted_type

            # medium fallback
            org_cat_map.setdefault(
                (org_id, large_id, medium_id, None), deleted_type
            )

            # large fallback
            org_cat_map.setdefault((org_id, large_id, None, None), deleted_type)

        org_map = {
            org_id: {
                "id": org_id,
                "name": f"{name}{KEYWORDS['deleted']}" if deleted_at else name,
                "type": org_type,
            }
            for org_id, name, org_type, deleted_at in org_values
        }
        merged_duration = []
        for item in list(chain(tasks, events)):
            if isinstance(item, Task):
                item_type = CalendarTypes.TASK.value
                duration = task_duration_map[item.id]
            else:
                item_type = CalendarTypes.SCHEDULE.value
                duration = schedule_duration_map[item.id]

            # Format category
            category_formatted = []
            if item.prefetched_categories:
                pref_cat = item.prefetched_categories[0]
                large_category = getattr(
                    pref_cat, "large_statistic_category", None
                )
                medium_category = getattr(
                    pref_cat, "medium_statistic_category", None
                )
                small_category = getattr(
                    pref_cat, "small_statistic_category", None
                )
                key = (
                    item.organization_id,
                    getattr(large_category, "id", None),
                    getattr(medium_category, "id", None),
                    getattr(small_category, "id", None),
                )
                deleted_type = org_cat_map.get(key)

                for attr, type_value in category_types:
                    if cate_obj := getattr(pref_cat, attr):
                        category_formatted.append(
                            {
                                "id": cate_obj.id,
                                "name": get_deleted_statistic_category_name(
                                    cate_obj, deleted_type, type_value
                                ),
                                "type": type_value,
                            }
                        )
                    else:
                        category_formatted.append(
                            {
                                "id": NONE_CATEGORY,
                                "name": NONE_CATEGORY,
                                "type": type_value,
                            }
                        )
            else:
                for attr, type_value in category_types:
                    category_formatted.append(
                        {
                            "id": NONE_CATEGORY,
                            "name": NONE_CATEGORY,
                            "type": type_value,
                        }
                    )
            # Calculate percent
            percent_part = percentage_calculation_of_duration(
                total_duration.total_seconds(),
                duration.total_seconds(),
            )
            merged_duration.append(
                {
                    "id": item.id,
                    "title": item.title,
                    "tags": [
                        {"id": tag.id, "name": tag.name}
                        for tag in item.prefetched_tags
                    ],
                    "total_duration": format_duration(duration),
                    "percent": percent_part,
                    "categories": category_formatted,
                    "type": item_type,
                    "organization": org_map[item.organization_id],
                    "created_at": item.created_at,
                }
            )
        merged_qs = sorted(
            merged_duration,
            key=lambda x: (
                time_str_to_timedelta(x["total_duration"]) or timedelta(0),
                x["id"],
            ),
            reverse=not bool(ordering),
        )
        new_qs = merged_qs
        if cursor and cursor_id:
            new_qs = []
            cursor = time_str_to_timedelta(cursor)
            cursor_id = int(cursor_id)
            for x in merged_qs:
                duration = time_str_to_timedelta(
                    x["total_duration"]
                ) or timedelta(0)
                if ordering:
                    if duration > cursor or (
                        duration == cursor and x["id"] > cursor_id
                    ):
                        new_qs.append(x)
                else:
                    if duration < cursor or (
                        duration == cursor and x["id"] < cursor_id
                    ):
                        new_qs.append(x)
        new_qs = normalize_percentages(new_qs)
        sum_total_duration = (
            format_duration(total_duration) if new_qs else DEFAULT_TIME
        )

        export_type = request.query_params.get("export_type")
        if export_type:
            service = ExportTaskService(
                request, new_qs, export_type, sum_total_duration
            )
            excel_file = service.export_task_statistic()
            filename = service.get_filename()

            if export_type == ExportType.CSV.value:
                content_type = "text/csv"
            elif export_type == ExportType.XLSX.value:
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

            response = HttpResponse(
                excel_file.getvalue(),
                content_type=content_type,
            )
            response[
                "Content-Disposition"
            ] = f"attachment; filename*=UTF-8''{quote(filename)}"
            response["Content-Transfer-Encoding"] = "binary"

            return response

        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(new_qs, request)
        return paginator.get_paginated_response(
            paginated_data,
            total_duration=sum_total_duration,
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

        # Detemire type category
        type_cat = TaskCategoryTypes.LARGE.value
        if large_category_id:
            type_cat = TaskCategoryTypes.MEDIUM.value
        if medium_category_id:
            type_cat = TaskCategoryTypes.SMALL.value

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
                    type_value=type_cat,
                )
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
                type_value=type_cat,
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
                durations=durations, type_value=TaskCategoryTypes.LARGE.value
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
                        type_value=TaskCategoryTypes.MEDIUM.value,
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
                            type_value=TaskCategoryTypes.SMALL.value,
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
            organization_ids = get_all_organization_id([user])
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

        organization = Organization.all_objects.filter(
            id=organization_id
        ).first()
        if not organization:
            raise NotFound(ERROR_MESSAGES["organization_not_exists"])
        if user_ids_param:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids_param)
            )
        else:
            org = (
                organization
                if not organization_get_members_id
                else get_object_or_404(
                    Organization, id=organization_get_members_id
                )
            )
            task_user_ids = list(
                PeopleInChargeTasks.objects.filter(
                    task__organization=org
                ).values_list("user_id", flat=True)
            )
            users = User.objects.filter(
                Q(id__in=task_user_ids) | Q(organizations=org)
            ).distinct()

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
            organizations=[organization],
            tags=tag_ids,
        )
        total_duration = get_total_durations(durations)
        category_list = aggregate_durations(
            durations=durations, type_value=TaskCategoryTypes.LARGE.value
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
            organization=organization,
        )
        # Process medium categories if large_category_id is provided
        if large_category_id:
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
            if medium_category_id and calendar_org not in [organization]:
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
            type_value=task_category_type,
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
        organization = validate_company_organization(company, organization_id)
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
            task_user_ids = list(
                PeopleInChargeTasks.objects.filter(
                    task__organization__in=orgs
                ).values_list("user_id", flat=True)
            )
            users = User.objects.filter(
                Q(id__in=task_user_ids) | Q(organizations__in=orgs)
            ).distinct()

        start_of_day = datetime.combine(from_date, time.min)
        end_of_day = datetime.combine(end_date, time.max)
        tag_ids = split_id_from_string(tag_ids_param)
        data = {}

        if not tag_ids or not users:
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
            organization=organization,
        )

        if large_category_id:
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
        organization = (
            Organization.all_objects.filter(id=pk).only("id", "type").first()
        )
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
        users_in_org = organization.users.values_list("id", flat=True)
        user_serialized_map = {}
        for user in users.select_related("profile"):
            user_serialized_map[user.id] = BaseUserProfileSerializer(user).data
            # Add unassigned tag behind user name
            if (
                users_in_org
                and user.id not in users_in_org
                and not user.deleted_at
            ):
                user_serialized_map[user.id]["full_name"] += KEYWORDS[
                    "unassigned"
                ]
        total_duration_by_range = {}
        for index, (start, end) in enumerate(ranges):
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
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
                root_durations_per_range = (
                    filter_with_category_durations.filter(filters)
                )
            else:
                # Get all durations per range for calculate total duration in this time
                root_durations_per_range = (
                    filter_with_category_durations.filter(
                        started_at__gte=start_date_min,
                        paused_at__lte=end_date_max,
                    )
                )
            # Get total duration of root duration per range
            total_duration_by_range[index] = (
                get_total_durations(root_durations_per_range)
                if root_durations_per_range
                else timedelta(0)
            )

        for user in users:
            filter_durations = get_list_durations_by_users(
                durations=filter_with_category_durations,
                users=[user],
            )
            user_total_duration = get_total_durations(filter_durations)
            user_durations = self._get_durations_by_range(
                filter_durations, ranges, total_duration_by_range
            )
            data.append(
                {
                    "id": user.id,
                    "user": user_serialized_map.get(user.id),
                    "total_duration": format_duration(user_total_duration),
                    "durations": user_durations,
                }
            )
        return self.response_ok(self._normalize_percent_per_range(data))

    def _get_durations_by_range(
        self, filter_durations, ranges, total_duration_by_range
    ):
        """
        Handle get duration by durations filter by category, tag...
        """
        durations = []
        for index, (start, end) in enumerate(ranges):
            start_date_min = datetime.combine(start, time.min)
            end_date_max = datetime.combine(end, time.max)
            if not total_duration_by_range or total_duration_by_range[
                index
            ] == timedelta(0):
                durations.append(
                    {
                        "start_date": start_date_min.strftime(BASE_DATE_FORMAT),
                        "end_date": end_date_max.strftime(BASE_DATE_FORMAT),
                        "duration": format_duration(timedelta(0)),
                        "percent_per_range": 0,
                    }
                )
                continue
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
                filter_duration_by_range = filter_durations.filter(filters)
                duration = get_total_durations(filter_duration_by_range)
            else:
                filter_duration_by_range = filter_durations.filter(
                    started_at__gte=start_date_min,
                    paused_at__lte=end_date_max,
                )
                duration = get_total_durations(filter_duration_by_range)
            # Get total duration of root duration per range
            total_duration = total_duration_by_range[index]

            # Calculate the percentage of a user's duration relative to the total duration within a time range
            percent_per_range = percentage_calculation_of_duration(
                total_duration.total_seconds(), duration.total_seconds()
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
        main_organization_id = request.query_params.get(
            "main_organization_id", None
        )
        main_organization = (
            get_object_or_404(Organization, id=main_organization_id)
            if main_organization_id
            else user.get_main_organization()
        )
        is_tag_page = request.query_params.get("is_tag_page")
        user_ids = request.query_params.get("user_ids", None)
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
        if "user_ids" not in request.query_params:
            users = [user]
        else:
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids)
            ).all()
        data = {}
        if not users:
            return self.response_ok(data)

        # Get all org ids include team not assigned
        organization_ids = get_all_organization_id(
            users,
            exclude_team_unassigned=bool(main_organization_id),  # Is team dock
        )

        if tag_ids_param:
            tag_ids = split_id_from_string(tag_ids_param)

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
            if main_organization_id:
                users_in_org = main_organization.users.values_list(
                    "id", flat=True
                )
                durations = handle_get_task_duration_of_teamdock(
                    durations, users_in_org, main_organization
                )

            if is_tag_page:
                total_duration, tag_list = process_merge_card_per_tag(
                    tag_ids,
                    durations=durations,
                    organization_ids=organization_ids,
                    user=user if not main_organization_id else None,
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
                    user=user if not main_organization_id else None,
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
        user_list = None
        users_in_org = None
        if not user_ids:
            users = [user]
        else:
            users_in_org = main_organization.users.values_list("id", flat=True)
            users = User.objects.filter(
                id__in=split_id_from_string(user_ids)
            ).all()
            if users:
                user_list = []
                for user in users.select_related("profile"):
                    data = BaseUserProfileSerializer(user).data
                    # Add unassigned tag behind user name
                    if (
                        users_in_org
                        and user.id not in users_in_org
                        and user.deleted_at is None
                    ):
                        data["full_name"] += KEYWORDS["unassigned"]

                    user_list.append(data)

        # Get all org ids include team not assigned
        organization_ids = get_all_organization_id(
            users,
            exclude_team_unassigned=bool(main_organization_id),  # Is team dock
        )

        tag_ids = split_id_from_string(tag_ids_param)

        durations = get_list_durations_by_users(
            start_of_day,
            end_of_day,
            users,
            organization_ids,
            tags=tag_ids,
        )
        data = {"durations": [], "data": []}
        if not users or (main_organization_id and not main_organization):
            return self.response_ok(data)
        if main_organization_id:
            durations = handle_get_task_duration_of_teamdock(
                durations, users_in_org, main_organization
            )

        ranges = split_ranges(
            from_date, end_date, trim_whitespace(statistic_by)
        )
        fake_data_subteam = {
            "organization_name": SUB_TEAM,
            "organization_id": SUB_TEAM,
            "duration": DEFAULT_TIME,
            "percent": 0,
            "color": SUB_TEAM_COLOR,
            "users": [],
        }
        main_org_name = (
            (
                main_organization.name
                if main_organization.deleted_at == None
                else f"{main_organization.name}{KEYWORDS['deleted']}"
            )
            if main_organization
            else None
        )
        fake_data_mainteam = {
            "organization_name": main_org_name,
            "organization_id": main_organization.id
            if main_organization
            else None,
            "color": MAIN_TEAM_COLOR,
            "duration": DEFAULT_TIME,
            "percent": 0,
            "users": [],
        }
        fake_data_calendar = {
            "organization_name": CALENDAR,
            "organization_id": calendar_org.id,
            "color": CALENDAR_COLOR,
            "duration": DEFAULT_TIME,
            "percent": 0,
            "users": [],
        }
        fake_data_duration = None
        if option == SUB_TEAM:
            fake_data_duration = fake_data_subteam
        elif option == MAIN_TEAM:
            fake_data_duration = fake_data_mainteam
        elif option == CALENDAR:
            fake_data_duration = fake_data_calendar
        data = {"durations": []}

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

        all_subteams = []
        team_names = []
        durations_by_user = self._take_duration_for_all_users(
            durations, tag_ids, is_tag_page
        )
        org_users_map = defaultdict(set)
        for team in teams:
            if user_ids and option:
                team["users"] = []
                if team["organization_id"] != SUB_TEAM:
                    for user in user_list:
                        team["users"].append(
                            self.build_user_duration_object(
                                user,
                                durations_by_user[
                                    team["organization_id"], user["id"]
                                ],
                                team["organization_name"],
                                time_str_to_timedelta(team["duration"]),
                            )
                        )
            if team.get("sub_teams"):
                all_subteams = team.pop("sub_teams")
                if user_ids and option:
                    subteam_org_ids = [
                        st["organization_id"] for st in all_subteams
                    ]
                    for org_id, user_id in Organization.objects.filter(
                        id__in=subteam_org_ids
                    ).values_list("id", "users"):
                        org_users_map[org_id].add(user_id)
                    for subteam in all_subteams:
                        org_id = subteam["organization_id"]
                        org_users = org_users_map.get(org_id, set())

                        for user in user_list:
                            if user["id"] not in org_users:
                                continue
                            team["users"].append(
                                self.build_user_duration_object(
                                    user,
                                    durations_by_user[org_id, user["id"]],
                                    subteam["organization_name"],
                                    time_str_to_timedelta(team["duration"]),
                                )
                            )
            if team.get("data"):
                team.pop("data")
            team_names.append(team.get("organization_name"))
        # Append fake data to table under chart
        if len(team_names) < 3:
            if main_org_name not in team_names and main_org_name != None:
                teams.append(fake_data_mainteam)
            if SUB_TEAM not in team_names:
                teams.append(fake_data_subteam)
            if CALENDAR not in team_names:
                teams.append(fake_data_calendar)

        priority_order = {main_org_name: 0, SUB_TEAM: 1, CALENDAR: 2}
        # Sort based on priority_order
        teams.sort(
            key=lambda x: priority_order.get(x["organization_name"], 999)
        )
        data["data"] = normalize_percentages(teams, id_field="organization_id")
        # Normalize percent of users
        if user_ids and option:
            for team in teams:
                if team.get("users"):
                    team["users"] = normalize_percentages(
                        team.get("users"), id_field="full_name"
                    )
        # This code for TEAMDOCK:
        organization_filters = []
        organization_map = {}
        if user_ids and option:
            # Take organization is option for handle data
            if option == CALENDAR:
                organization_map[calendar_org.id] = calendar_org.name
            elif option == MAIN_TEAM:
                organization_map[main_organization.id] = main_org_name
            elif option == SUB_TEAM:
                organization_map.update(
                    {
                        sub["organization_id"]: sub["organization_name"]
                        for sub in all_subteams
                    }
                )
            organization_filters = (
                list(organization_map.keys()) if organization_map else []
            )
        for start, end in ranges:
            data_by_range = deepcopy(fake_data_duration)
            current_start = datetime.combine(start, time.min)
            current_end = datetime.combine(end, time.max)
            filter_duration_by_range = durations.filter(
                Q(started_at__gte=current_start, paused_at__lte=current_end)
                | Q(
                    started_at__lte=current_end,
                    started_at__gte=current_start,
                    paused_at__isnull=True,
                )
            )

            # This code for TEAMDOCK:
            if user_ids and option:
                filter_duration_by_range = get_list_durations_by_users(
                    durations=filter_duration_by_range,
                    organizations=organization_filters,
                )
                total_duration_by_range = get_total_durations(
                    filter_duration_by_range
                )
                percent = percentage_calculation_of_duration(
                    total_duration.total_seconds(),
                    total_duration_by_range.total_seconds(),
                )
                data_by_range["duration"] = format_duration(
                    total_duration_by_range
                )
                data_by_range["percent"] = percent
                durations_by_user = self._take_duration_for_all_users(
                    filter_duration_by_range, tag_ids, is_tag_page
                )
                for org_id in organization_filters:
                    if option == SUB_TEAM:
                        org_users = org_users_map.get(org_id, set())
                    for user in user_list:
                        if option == SUB_TEAM and user["id"] not in org_users:
                            continue
                        data_by_range["users"].append(
                            self.build_user_duration_object(
                                user,
                                durations_by_user[org_id, user["id"]],
                                organization_map.get(org_id),
                                total_duration_by_range,
                            )
                        )
                data_by_range["users"] = normalize_percentages(
                    data_by_range["users"], id_field="full_name"
                )
            else:
                # This for MYDOCK
                if is_tag_page:
                    (
                        total_duration_by_range,
                        data_list,
                    ) = process_merge_card_per_tag(
                        tag_ids,
                        durations=filter_duration_by_range,
                        organization_ids=organization_ids,
                    )
                    teams = process_team_tags(
                        data_list,
                        total_duration_by_range,
                        durations=filter_duration_by_range,
                        main_organization=main_organization,
                        calendar_organization=calendar_org,
                    )
                else:
                    total_duration_by_range = get_total_durations(
                        filter_duration_by_range
                    )
                    data_list = aggregate_durations(
                        durations=filter_duration_by_range,
                    )
                    teams = process_team_categories(
                        data_list,
                        total_duration_by_range,
                        durations=filter_duration_by_range,
                        main_organization=main_organization,
                        calendar_organization=calendar_org,
                    )
                for team in teams:
                    team.pop("data", None)
                    team.pop("sub_teams", [])

            break_team = [data_by_range] if (user_ids and option) else teams
            data["durations"].append(
                {
                    "start_date": current_start.strftime(BASE_DATE_FORMAT),
                    "end_date": current_end.strftime(BASE_DATE_FORMAT),
                    "data": break_team,
                }
            )
        return self.response_ok(data)

    def build_user_duration_object(
        self,
        user,
        user_duration,
        org_name,
        total_duration,
    ):
        percent = percentage_calculation_of_duration(
            total_duration.total_seconds(), user_duration.total_seconds()
        )
        data = {
            "id": user["id"],
            "full_name": f"{org_name} {user['full_name']}",
            "avatar": user["avatar"],
            "avatar_color": user["avatar_color"],
            "total_duration": format_duration(user_duration),
            "percent": percent,
        }
        return data

    def _take_duration_for_all_users(self, durations, tag_ids, is_tag_page):
        """
        Take duration once for all users
        """
        # Preload related objects
        durations = durations.select_related(
            "user", "task__organization", "schedule__organization"
        ).prefetch_related("task__tags", "schedule__tags")
        # Annotate filtered relations so counting tags does not create nested aggregates
        durations = durations.annotate(
            # Determine organization_id from either task or schedule
            organization_id=Case(
                When(task__isnull=False, then=F("task__organization_id")),
                When(
                    schedule__isnull=False, then=F("schedule__organization_id")
                ),
                default=Value(None),
                output_field=IntegerField(),
            ),
            related_tag_count=Case(
                When(
                    task__isnull=False,
                    then=Count(
                        "task__tags",
                        filter=Q(task__tags__in=tag_ids),
                        distinct=True,
                    ),
                ),
                When(
                    schedule__isnull=False,
                    then=Count(
                        "schedule__tags",
                        filter=Q(schedule__tags__in=tag_ids),
                        distinct=True,
                    ),
                ),
                default=1,
                output_field=IntegerField(),
            ),
            # Effective paused time
            effective_paused=Case(
                When(paused_at__isnull=True, then=Value(now())),
                default=F("paused_at"),
                output_field=DateTimeField(),
            ),
            # Actual duration
            actual_duration=ExpressionWrapper(
                F("effective_paused") - F("started_at"),
                output_field=DurationField(),
            ),
        )

        grouped_durations = durations.values(
            "organization_id", "user_id", "related_tag_count", "actual_duration"
        )
        durations_by_user = defaultdict(timedelta)
        for row in grouped_durations:
            total_duration = row["actual_duration"]
            if is_tag_page:
                total_duration *= row["related_tag_count"]
            durations_by_user[
                row["organization_id"], row["user_id"]
            ] += total_duration
        return durations_by_user
