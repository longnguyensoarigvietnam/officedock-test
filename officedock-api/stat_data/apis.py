from datetime import datetime, time, timedelta

from django.db.models import (
    Q,
)
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES
from calendars.models import Schedule
from common.serializers import (
    CreationDataUserSerializer,
    CreationDataUserWithMainOrganizationSerializer,
)
from common.utils import (
    format_duration,
    time_str_to_timedelta,
    transform_statistic_categories,
    split_id_from_string,
    validate_company_organization,
)
from organizations.models import Organization
from organizations.serializers import OrganizationDetailSerializer
from stat_data.constants import ALL_TEAM
from stat_data.serializers import (
    DailyEventSerializer,
    DailyTaskSerializer,
    DurationDetailForPDFSerializer,
)
from stat_data.utils import (
    get_total_durations,
    validate_date_by_regex_and_reformat,
    percentage_calculation_of_duration,
    aggregate_durations,
)
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
    screen_name = Screens.TEAM_DAILY_REPORT.value

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
        user_id = request.query_params.get("user_id", None)
        user = get_object_or_404(User, id=user_id) if user_id else request.user
        prev_user = None
        next_user = None
        organization = None
        organization_id = request.query_params.get("organization_id")
        # Find previous and next user in organization by current user
        if organization_id:
            organization = validate_company_organization(
                user.company, organization_id
            )
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

        date = (
            validate_date_by_regex_and_reformat(
                request.query_params.get("date", None)
            )
            if request.query_params.get("date", None)
            else now().date()
        )
        start_of_day = datetime.combine(date, time.min)
        start_of_today = datetime.combine(now().date(), time.min)
        end_of_day = datetime.combine(date, time.max)

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

        total_duration = get_total_durations(durations)
        data["total_duration"] = format_duration(total_duration)
        data["categories"] = []
        category_list = aggregate_durations(
            durations=durations, is_daily_report=True
        )
        percent = 0
        for index, cat in enumerate(category_list):
            is_last_element = index == len(category_list) - 1
            category_duration = format_duration(cat["duration"]) or timedelta(0)
            category_name = cat["category_name"]
            category_color = cat["category_color"]
            category_id = cat["category_id"]
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
            data["categories"].append(
                {
                    "category_id": category_id,
                    "category_name": category_name,
                    "category_color": category_color,
                    "duration": category_duration,
                    "percent": percent_per_total_duration,
                }
            )

        date = (
            request.query_params.get("date")
            if request.query_params.get("date")
            else timezone.now().date()
        )

        # Get remark of user
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
        request_user = request.user

        date = (
            validate_date_by_regex_and_reformat(
                request.query_params.get("date", None)
            )
            if request.query_params.get("date", None)
            else timezone.now().date()
        )

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
                        Q(user=user)
                        & Q(
                            Q(
                                Q(started_at__gte=start_of_day)
                                & Q(paused_at__lte=end_of_day)
                            )
                            | Q(
                                Q(started_at__lte=end_of_day)
                                & Q(started_at__gte=start_of_day)
                                & Q(paused_at__isnull=True)
                            )
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
        url_path="daily-report-pdf",
        serializer_class=None,
    )
    def daily_report_pdf(self, request, *args, **kwargs):
        """
        Response data of daily report for print PDF
        """
        user_id = request.query_params.get("user_id", None)
        param_organization_id = request.query_params.get("organization_id")
        organization = validate_company_organization(
            request.user.company, param_organization_id
        )
        date = (
            validate_date_by_regex_and_reformat(
                request.query_params.get("date", None)
            )
            if request.query_params.get("date", None)
            else now().date()
        )
        user = get_object_or_404(User, id=user_id) if user_id else request.user

        start_of_day = datetime.combine(date, time.min)
        start_of_today = datetime.combine(now().date(), time.min)
        end_of_day = datetime.combine(date, time.max)

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
        data = {}
        total_duration = get_total_durations(durations)

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
                "categories__large_statistic_category_id",
                "organization_id",
            )

            return with_large.distinct()

        data["total_duration"] = format_duration(total_duration)
        data["categories"] = []
        user_serializer = CreationDataUserWithMainOrganizationSerializer(
            user
        ).data
        main_organization = (
            user_serializer["organizations"]
            if user_serializer["organizations"]
            else {"id": None}
        )
        category_list = aggregate_durations(
            durations=durations,
            organization_ids_param=ALL_TEAM,
            is_daily_report=True,
        )
        sub_duration = timedelta(0)
        total_duration = time_str_to_timedelta(format_duration(total_duration))
        percent = 0
        for index, cat in enumerate(category_list):
            is_last_element = index == len(category_list) - 1
            category_duration = format_duration(cat["duration"]) or timedelta(0)
            category_name = cat["category_name"]
            category_color = cat["category_color"]
            category_id = cat["category_id"]
            cate_organization_id = cat["organization_id"]
            # Plus subt organization category duration
            if cate_organization_id != main_organization["id"]:
                sub_duration += time_str_to_timedelta(category_duration)

            (
                percent_per_total_duration,
                percent,
            ) = percentage_calculation_of_duration(
                total_duration.total_seconds(),
                time_str_to_timedelta(category_duration).total_seconds(),
                percent,
                is_last_element,
            )

            data["categories"].append(
                {
                    "category_id": category_id,
                    "category_name": category_name,
                    "category_color": category_color,
                    "duration": category_duration,
                    "percent": percent_per_total_duration,
                    "is_of_main_organization": cate_organization_id
                    == main_organization["id"]
                    if cate_organization_id
                    else False,
                }
            )
        sub_percent, _ = percentage_calculation_of_duration(
            total_duration.total_seconds(), sub_duration.total_seconds()
        )
        data["sub_organization"] = {
            "duration": format_duration(sub_duration),
            "percent": sub_percent,
        }

        date = (
            request.query_params.get("date")
            if request.query_params.get("date")
            else timezone.now().date()
        )

        # Get remark of user
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
                "user": user_serializer,
                "organization_name": organization.name
                if organization
                else None,
                "is_confirmed": confirm_report,
            }
        )

        # Get task durations order by started_at for print PDF
        data["task_durations"] = DurationDetailForPDFSerializer(
            durations.order_by("started_at").all(), many=True
        ).data

        return self.response_ok(data)
