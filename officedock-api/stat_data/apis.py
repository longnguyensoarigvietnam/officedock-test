from datetime import datetime, time, timedelta
import re

from django.db.models import (
    Case,
    DurationField,
    ExpressionWrapper,
    F,
    Q,
    Sum,
    When,
)
from django.db.models.functions import Now, Coalesce
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES
from calendars.models import Schedule
from common.constants import DATE_REGEX, BASE_DATE_FORMAT
from common.utils import (
    format_duration,
    time_to_timedelta,
    transform_statistic_categories,
    generate_random_color,
)
from organizations.models import Organization
from organizations.serializers import OrganizationDetailSerializer
from stat_data.serializers import DailyTaskSerializer, DailyEventSerializer
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
            total_duration += time_to_timedelta(task["total_duration"])

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
                    "categories__large_statistic_category__color",
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
            category_color = card["categories__large_statistic_category__color"]
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
                "category_color": generate_random_color(),  # FXIME: Maybe remove later when not accept use random for unsetting category
                "duration": timedelta(0),
            }
            for task in task_without_large_durations:
                category_dict["empty_category"]["duration"] += task["duration"]
        if event_without_large_durations:
            if category_dict.get("empty_category") is None:
                category_dict["empty_category"] = {
                    "category_name": None,
                    "category_color": generate_random_color(),  # FXIME: Maybe remove later when not accept use random for unsetting category
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
                    time_to_timedelta(category_duration).total_seconds()
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
                        total_duration += time_to_timedelta(
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
