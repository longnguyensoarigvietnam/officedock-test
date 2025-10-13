from datetime import timedelta, datetime, time
from itertools import chain
from uuid import uuid4

from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Q, Value, CharField
from django.utils import timezone
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.mixins import UpdateModelMixin, DestroyModelMixin
from rest_framework.permissions import IsAuthenticated

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES
from base.paginations import BasePagination
from calendars.constants import CalendarTypes
from calendars.models import Schedule, RepeatSchedule
from calendars.serializers import BaseScheduleSerializer
from common.constants import BASE_DATETIME_FORMAT
from common.serializers import (
    CreationDataUserWithMainOrganizationSerializer,
)
from common.utils import (
    get_total_unread_messages,
    format_duration,
    create_categories_by_model,
    check_task_overtime,
    get_common_categories,
)
from dashboard.filters import ActualDurationFilter
from dashboard.serializers import (
    ActualDurationCreationSerializer,
    ActualDurationListSerializer,
    DurationCalculatorSerializer,
    DurationSerializer,
    UpdateDurationSerializer,
    ActualDurationDetailSerializer,
    ActualDurationBulkCreationSerializer,
)
from dashboard.utils import (
    separate_duration,
    separate_duration_while_keep_running,
    validate_editable_actual_duration,
)
from roles.constants import Screens
from stat_data.utils import get_total_durations
from tasks.constants import TaskStatus, CalculateSkillMapProcessCases
from tasks.models import Task, TaskDuration, TaskSchedule
from tasks.serializers import TaskCalendarSerializer
from tasks.utils import calculate_progress_skill_map, split_date_range


@extend_schema(tags=["System > Dashboard"])
class DashboardViewSet(BaseAPIViewSet):
    """
    API endpoint for Dashboard.
    """

    permission_classes = [IsAuthenticated]

    @action(
        methods=["GET"],
        detail=False,
        url_path="members",
        serializer_class=CreationDataUserWithMainOrganizationSerializer,
    )
    def members(self, request):
        """
        Get all members of the logged in user company
        """
        user_logged = request.user
        users = user_logged.company.users.order_by("created_at")
        return self.response_ok(self.get_serializer(users, many=True).data)

    @action(
        methods=["GET"],
        detail=False,
        url_path="unread-messages",
        serializer_class=None,
    )
    def unread_messages(self, request):
        """
        Get number of unread messages by logged user
        """
        return self.response_ok(
            {"total": get_total_unread_messages(request.user)}
        )

    def _append_data_to_cards(self, data, list, request):
        """Handle append data to cards"""
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        user = request.user

        for ele in list:
            if isinstance(ele, RepeatSchedule):
                model = ele.schedule
                model_type = CalendarTypes.SCHEDULE.value
            else:
                model = ele.task or ele.schedule
                model_type = (
                    CalendarTypes.TASK.value
                    if ele.task
                    else CalendarTypes.SCHEDULE.value
                )
            if any(
                item
                for item in data
                if item["id"] == model.id and item["type"] == model_type
            ):
                continue
            is_my_routine = False
            if isinstance(model, Task):
                if model.status_name == TaskStatus.MY_ROUTINE.value:
                    is_my_routine = True

            is_running = model.task_durations.filter(
                paused_at__isnull=True
            ).exists()
            durations = model.task_durations.filter(
                Q(started_at__gte=start_date)
                & Q(Q(paused_at__lte=end_date) | Q(paused_at__isnull=True))
                & Q(user=user)
            ).all()

            data.append(
                {
                    "id": model.id,
                    "title": model.title,
                    "type": model_type,
                    "is_running": is_running,
                    "is_my_routine": is_my_routine,
                    "started_at": durations.last().started_at
                    if durations.exists()
                    else None,
                    "paused_at": durations.last().paused_at
                    if durations.exists()
                    else None,
                    "total_duration": self._get_total_duration(
                        timedelta(0), durations
                    ),
                }
            )
        return data

    def _get_total_duration(self, total_duration, durations):
        """Handle get total duration"""
        # total_duration = time_to_timedelta(total_duration)
        for duration in durations:
            paused_at = duration.paused_at or now()
            total_duration += paused_at - duration.started_at

        return format_duration(total_duration)

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", type=datetime, required=True),
            OpenApiParameter("end_date", type=datetime, required=True),
        ],
    )
    @action(methods=["GET"], detail=False, url_path="cards")
    def cards(self, request):
        """
        Get cards of schedule in my task
        """
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        # Get data of task schedule
        task_schedules = TaskSchedule.objects.filter(
            plan_start_date__gte=start_date,
            plan_end_date__lte=end_date,
            task__people_in_charge_tasks__user=request.user,
            task__deleted_at__isnull=True,
        ).all()
        data = self._append_data_to_cards([], task_schedules, request)

        # Get data event in schedule
        repeat_schedules = RepeatSchedule.objects.filter(
            plan_end_date__gte=start_date,
            plan_start_date__lte=end_date,
            schedule__participants_schedules__user=request.user,
            schedule__deleted_at__isnull=True,
        ).all()
        data = self._append_data_to_cards(data, repeat_schedules, request)

        # Get actual duration
        durations = TaskDuration.objects.filter(
            Q(started_at__gte=start_date)
            & Q(Q(paused_at__lte=end_date) | Q(paused_at__isnull=True))
            & Q(user=request.user)
            & Q(
                Q(schedule__deleted_at__isnull=True)
                & Q(task__deleted_at__isnull=True)
            )
        )
        duration_cards = durations.exclude(
            schedule__in=[
                repeat_schedule.schedule for repeat_schedule in repeat_schedules
            ],
            task__in=[task_schedule.task for task_schedule in task_schedules],
        ).all()
        data = self._append_data_to_cards(data, duration_cards, request)
        total_duration = get_total_durations(durations.all())

        return self.response_ok(
            {"cards": data, "total_duration": format_duration(total_duration)}
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", type=datetime, required=True),
            OpenApiParameter("end_date", type=datetime, required=True),
        ],
    )
    @action(methods=["GET"], detail=False, url_path="kanban-schedules")
    def kanban_schedules(self, request):
        """
        Get all schedule in kanban
        """
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        user = request.user
        data = []
        if start_date and end_date:
            start_date = datetime.strptime(
                start_date, BASE_DATETIME_FORMAT
            ).date()
            end_date = datetime.strptime(end_date, BASE_DATETIME_FORMAT).date()
            start_date = datetime.combine(start_date, time.min)
            end_date = datetime.combine(end_date, time.max)
            tasks = Task.objects.filter(
                task_schedules__plan_start_date__gte=start_date,
                task_schedules__plan_start_date__lte=end_date,
                deleted_at__isnull=True,
                people_in_charge=user,
            ).distinct()
            schedules = Schedule.objects.filter(
                repeat_schedules__plan_start_date__lte=end_date,
                repeat_schedules__plan_end_date__gte=start_date,
                deleted_at__isnull=True,
                participants=user,
            ).distinct()
            data = (
                TaskCalendarSerializer(
                    tasks, many=True, context={"request": request}
                ).data
                + BaseScheduleSerializer(
                    schedules, many=True, context={"request": request}
                ).data
            )

        return self.response_ok(data)


@extend_schema(tags=["System > Duration"])
class DurationViewSet(BaseAPIViewSet, UpdateModelMixin, DestroyModelMixin):
    """
    API endpoint for Dashboard.
    """

    queryset = TaskDuration.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = DurationSerializer
    pagination_class = None
    lookup_field = "uuid"

    def get_queryset(self):
        """
        Filtering duration by company.
        """
        user = self.request.user
        queryset = super().get_queryset().filter(company_id=user.company_id)

        return queryset.order_by("started_at")

    def get_serializer(self, *args, **kwargs):
        """
        Handle get serializer by method
        """
        if self.action in ["partial_update", "update"]:
            return UpdateDurationSerializer(*args, **kwargs)

    @transaction.atomic
    def perform_update(self, serializer, request):
        """Handle update duration"""
        current_instance = self.get_object()
        validated_data = serializer.validated_data
        started_at = validated_data.get("started_at", None)
        paused_at = validated_data.get("paused_at", None)
        instance = serializer.save()  # Save the updated instance
        if not paused_at and not instance.paused_at:
            return [
                DurationSerializer(instance, context={"request": request}).data
            ]
        paused_at = paused_at or instance.paused_at or now()
        started_at = started_at or instance.started_at
        user = request.user
        is_edit_task_duration = bool(current_instance.task)
        if is_edit_task_duration:
            for user in current_instance.task.people_in_charge.all():
                # Minus duration to skill map actual measure time
                calculate_progress_skill_map(
                    current_instance.task,
                    user,
                    duration_time=-(
                        current_instance.paused_at - current_instance.started_at
                    ),
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                    duration_created_at=instance.created_at,
                )
        if started_at.date() != paused_at.date():
            # Call separate_duration to handle multi-day durations
            new_durations = separate_duration(
                instance, paused_at, is_get_new_durations=True, user=user
            )
            if is_edit_task_duration:
                # Calculate total duration
                total_duration = timedelta()
                for new_duration in new_durations:
                    if new_duration.paused_at:
                        total_duration += (
                            new_duration.paused_at - new_duration.started_at
                        )
                for user in instance.task.people_in_charge.all():
                    # Plus total duration to skill map actual measure time
                    calculate_progress_skill_map(
                        instance.task,
                        user,
                        duration_time=total_duration,
                        case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                        duration_created_at=instance.created_at,
                    )
            return DurationSerializer(
                new_durations, many=True, context={"request": request}
            ).data
        else:
            if (
                validated_data.get("started_at")
                and validated_data.get("paused_at")
                and is_edit_task_duration
            ):
                total_duration = instance.paused_at - instance.started_at
                for user in instance.task.people_in_charge.all():
                    # Plus total duration to skill map actual measure time
                    calculate_progress_skill_map(
                        instance.task,
                        user,
                        duration_time=total_duration,
                        case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                        duration_created_at=instance.created_at,
                    )
            # Return serialized single instance
            return [
                DurationSerializer(instance, context={"request": request}).data
            ]

    @transaction.atomic
    def perform_destroy(self, instance):
        """
        Handle delete actual duration
        """

        validate_editable_actual_duration(instance, is_deleted=True)

        model = instance.task or instance.schedule
        if model and model.is_start and instance.paused_at is None:
            model.is_start = False
            model.save()
        if instance.task:
            total_duration = instance.paused_at - instance.started_at
            for user in instance.task.people_in_charge.all():
                # Minus total duration to skill map actual measure time
                calculate_progress_skill_map(
                    instance.task,
                    user,
                    duration_time=-total_duration,
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                    duration_created_at=instance.created_at,
                )

        instance.delete()

    def update(self, request, *args, **kwargs):
        """Override update to control the response"""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)

        # Call perform_update and get the data
        data = self.perform_update(serializer, request)

        # Return a custom response
        return self.response_ok(data)

    def _check_exists_duration_started(self, task, schedule, user, obj_type):
        """
        Check if the user has a task/event running
        """
        # Check if there are any active (non-paused) TaskDuration entries
        duration_started = TaskDuration.objects.filter(
            user=user,
            paused_at__isnull=True,
        )
        # Exclude the current schedule or task from the check
        duration_started = duration_started.exclude(
            task=task, schedule=schedule
        )
        if duration_started.exists():
            obj_type = (
                CalendarTypes.TASK.value
                if duration_started.first().task
                else CalendarTypes.SCHEDULE.value
            )
            data = {
                "is_another_task_started": duration_started.exists(),
                "id": (
                    duration_started.last().task_id
                    if duration_started.last().task_id
                    else duration_started.last().schedule_id
                ),
                "type": obj_type,
            }
            return data
        return None

    @action(
        methods=["POST"],
        detail=False,
        url_path="calculate",
        serializer_class=DurationCalculatorSerializer,
    )
    @transaction.atomic()
    def calculate_duration(self, request, pk=None):
        """
        Save to task/event time while click start or pause.
        """
        object_id = request.data.get("id", None)
        object_type = request.data.get("type", None)
        is_start = request.data.get("is_start", False)
        user = request.user
        task_id = object_id if CalendarTypes.TASK.value == object_type else None
        schedule_id = (
            object_id if CalendarTypes.SCHEDULE.value == object_type else None
        )
        # Check whether the current task/event has a start time set for now.
        overlapping_qs = TaskDuration.objects.filter(
            Q(
                task_id=task_id,
                schedule_id=schedule_id,
            )
            & Q(started_at__lt=now(), paused_at__gt=now())
            & Q(user=user)
        )
        if overlapping_qs.exists():
            raise ValidationError({"detail": ERROR_MESSAGES["exists_duration"]})
        if object_id is None and object_type is None:
            raise ValidationError({"detail": ERROR_MESSAGES["task_not_exists"]})

        task = None
        schedule = None
        if schedule_id:
            schedule = Schedule.objects.filter(
                id=schedule_id,
                participants_schedules__user=user,
                deleted_at__isnull=True,
            ).first()
            # Validate user's event
            if not schedule:
                raise NotFound(
                    {"schedule": [ERROR_MESSAGES["schedule_not_exists"]]}
                )
        elif task_id:
            task = Task.objects.filter(
                id=task_id,
                people_in_charge_tasks__user=user,
                deleted_at__isnull=True,
            ).first()
            # Validate user's task
            if not task:
                raise NotFound({"task": [ERROR_MESSAGES["task_not_exists"]]})
        else:
            # TODO: Create empty task with status 対応中 here
            return
        exists_duration_started = self._check_exists_duration_started(
            task=task,
            schedule=schedule,
            user=user,
            obj_type=object_type,
        )
        # If there is a running task/event, return the data.
        if exists_duration_started and not is_start:
            return self.response_ok(exists_duration_started)

        last_task_duration = TaskDuration.objects.filter(
            user=user,
            paused_at__isnull=True,
        ).last()
        if (
            last_task_duration
            and last_task_duration.task == task
            and last_task_duration.schedule == schedule
        ):
            # Check if last task/event running is current task/event, stop it and return early
            self._stop_duration(user)
            last_task_duration.refresh_from_db()

            return self.response_ok(
                DurationSerializer(
                    last_task_duration, context={"request": request}
                ).data
            )
        else:
            # Stop currently running duration
            self._stop_duration(user)

        task_duration = self._start_duration(user, schedule=schedule, task=task)
        data = DurationSerializer(
            task_duration, context={"request": request}
        ).data
        data["is_another_task_started"] = False
        return self.response_ok(data)

    def _stop_duration(self, user):
        """
        Handle stop duration is running of user
        """
        durations = TaskDuration.objects.filter(
            user=user,
            paused_at__isnull=True,
        ).all()
        if not durations:
            return
        for duration in durations:
            # Split time range by day and create new duration for it
            new_durations = separate_duration(
                duration, timezone.now(), user=user, is_get_new_durations=True
            )
            model = duration.task or duration.schedule
            model.is_start = False
            model.save()
            # if duration of task, calculate progress skill map
            if duration.task:
                # Calculate total duration
                total_duration = timedelta()
                for new_duration in new_durations:
                    if new_duration.paused_at:
                        total_duration += (
                            new_duration.paused_at - new_duration.started_at
                        )
                for user in duration.task.people_in_charge.all():
                    # Plus total duration to skill map actual measure time
                    calculate_progress_skill_map(
                        duration.task,
                        user,
                        duration_time=total_duration,
                        case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                        duration_created_at=duration.created_at,
                    )

    def _start_duration(self, user, task=None, schedule=None):
        """
        Handle start duration
        """
        task_duration = TaskDuration.objects.filter(
            task=task,
            schedule=schedule,
            user=user,
        ).last()
        if task_duration is None or task_duration.paused_at is not None:
            task_duration = TaskDuration.objects.create(
                task=task,
                schedule=schedule,
                started_at=timezone.now(),
                user=user,
                company=user.company,
            )
            if task:
                task.is_start = True
                task.save()
            if schedule:
                schedule.is_start = True
                schedule.save()
        return task_duration

    @extend_schema(
        parameters=[
            OpenApiParameter("id", type=int),
            OpenApiParameter(
                "type",
                type=str,
                enum=[choice[0] for choice in CalendarTypes.choices()],
            ),
        ]
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="running",
        serializer_class=None,
    )
    def get_duration_running(self, request):
        """
        Get the working time of task is running or time duration of object by type.
        """
        user = request.user
        data = {}
        request.query_params.get("id", None)
        obj_type = request.query_params.get("type", None)
        object_id = request.query_params.get("id", None)
        schedule_id = (
            object_id if CalendarTypes.SCHEDULE.value == obj_type else None
        )
        task_id = object_id if CalendarTypes.TASK.value == obj_type else None

        start_of_today = datetime.combine(timezone.now().date(), time.min)
        durations = TaskDuration.objects.filter(
            Q(Q(user=user) & Q(paused_at__isnull=True))
        )

        for duration in durations:
            separate_duration_while_keep_running(duration, timezone.now(), user)

        if task_id or schedule_id:
            # Get current task running
            task_running = user.task_durations.filter(
                started_at__gte=start_of_today,
                task_id=task_id,
                schedule_id=schedule_id,
            ).last()
        else:
            # Get current task running
            task_running = user.task_durations.filter(
                started_at__gte=start_of_today,
                paused_at__isnull=True,
            ).last()
            if not task_running:
                task_running = user.task_durations.filter(
                    started_at__gte=start_of_today,
                ).last()
        if not task_running:
            return self.response_ok(data)
        current_duration_start = task_running.task or task_running.schedule
        obj_type = (
            CalendarTypes.TASK.value
            if task_running.task
            else CalendarTypes.SCHEDULE.value
        )
        if current_duration_start:
            paused_at = (
                task_running.paused_at
                if task_running.paused_at
                else timezone.now()
            )
            total_duration = paused_at - task_running.started_at
            is_over_estimate = False

            if task_running:
                is_send_sk, is_over_estimate = check_task_overtime(
                    current_duration_start, task_running
                )

            categories = None
            if current_duration_start.categories.exists():
                categories = get_common_categories(
                    current_duration_start.categories.first(),
                    current_duration_start,
                )

            data = {
                "id": current_duration_start.id,
                "categories": categories,
                "task_duration_running_uuid": task_running.uuid,
                "title": current_duration_start.title,
                "task_duration": format_duration(total_duration),
                "started_at": task_running.started_at,
                "paused_at": task_running.paused_at,
                "is_start": not task_running.paused_at,
                "is_over_estimate": is_over_estimate,
                "type": obj_type,
            }

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", type=datetime),
            OpenApiParameter("end_date", type=datetime),
            OpenApiParameter("user_id", type=int),
        ]
    )
    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        user_id = request.query_params.get("user_id", None)
        start_date = request.query_params.get("start_date", None)
        end_date = request.query_params.get("end_date", None)

        if start_date:
            queryset = queryset.filter(
                Q(started_at__gte=start_date) | Q(paused_at__gte=start_date)
            )
        if end_date:
            queryset = queryset.filter(
                Q(started_at__lte=end_date) | Q(paused_at__lte=end_date)
            )

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        else:
            queryset = queryset.none()

        return self.response_ok(
            DurationSerializer(
                queryset, many=True, context={"request": request}
            ).data
        )


@extend_schema(tags=["System > Actual Duration"])
class ActualDurationViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint actual duration of task/event.
    """

    queryset = TaskDuration.objects.order_by("-created_at")
    permission_classes = [IsAuthenticated]
    serializer_class = ActualDurationListSerializer
    filterset_class = ActualDurationFilter
    filter_backends = [FilterByPermission, DjangoFilterBackend]
    screen_name = Screens.ACTUAL_DURATION.value

    def get_serializer_class(self):
        """Get serializer by action"""
        if self.action in ["create", "update", "partial_update"]:
            return ActualDurationCreationSerializer
        if self.action == ["bulk_create"]:
            return ActualDurationBulkCreationSerializer

        return super().get_serializer_class()

    def get_serializer_context(self):
        """Get serializer context"""
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_queryset(self):
        """Get queryset"""
        user = self.request.user
        queryset = super().get_queryset().filter(company_id=user.company_id)

        return queryset.order_by("-created_at")

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
            OpenApiParameter("user_id", type=int),
        ]
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="tasks-schedules",
        serializer_class=None,
    )
    def get_tasks_schedules(self, request):
        """
        Get data options tasks and schedules by user
        """
        user_id = request.query_params.get("user_id")

        # Validate user_id
        if not user_id:
            return self.response_ok([])

        # Fetch tasks and schedules
        tasks = (
            Task.objects.filter(
                people_in_charge=user_id, deleted_at__isnull=True
            )
            .values("id", "title", "created_at")
            .annotate(
                type=Value(CalendarTypes.TASK.value, output_field=CharField())
            )
        )
        schedules = (
            Schedule.objects.filter(
                participants=user_id, deleted_at__isnull=True
            )
            .values("id", "title", "created_at")
            .annotate(
                type=Value(
                    CalendarTypes.SCHEDULE.value, output_field=CharField()
                )
            )
        )
        merged_qs = sorted(
            chain(tasks, schedules),
            key=lambda x: (x["created_at"], x["id"]),
            reverse=True,
        )

        paginator = self.pagination_class()
        paginated_data = paginator.paginate_queryset(merged_qs, request)

        return paginator.get_paginated_response(paginated_data)

    def retrieve(self, request, *args, **kwargs):
        """
        Handle retrieve detail
        """
        instance = self.get_object()
        data = ActualDurationDetailSerializer(instance).data
        if instance.task is not None:
            data["task_id"] = instance.task.id
            data["is_important"] = instance.task.is_important
            data["organization"] = (
                instance.task.organization.id
                if instance.task.organization
                else None
            )
        if instance.schedule is not None:
            data["schedule_id"] = instance.schedule.id
            data["schedule_type"] = instance.schedule.type
            data["organization"] = (
                instance.schedule.organization.id
                if instance.schedule.organization
                else None
            )

        return self.response_ok(data)

    @transaction.atomic
    def create(self, request):
        """
        Handle create actual duration task or schedule
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        durations = self._handle_create_actual_duration(validated_data)

        return self.response_ok(
            data=ActualDurationDetailSerializer(durations, many=True).data
        )

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Handle update actual duration task or schedule
        """
        user = self.request.user
        instance = serializer.instance
        validated_data = serializer.validated_data
        task = validated_data.pop("task", None)
        schedule = validated_data.pop("schedule", None)
        tags = validated_data.pop("tags", None)
        categories = validated_data.pop("category_ids", None)
        is_important = validated_data.pop("is_important", None)
        schedule_type = validated_data.pop("schedule_type", None)
        started_at = validated_data.pop("started_at", None)
        paused_at = validated_data.pop("paused_at", None)
        model = task or schedule

        # Create or update tags
        if tags is not None:
            # Remove all old tags and add new tag in request.
            model.tags.clear()

            for item in tags:
                model.tags.add(
                    item,
                    through_defaults={"company_id": user.company_id},
                )
        elif tags == []:
            model.tags.clear()

        # Create or update categories
        if categories is not None:
            create_categories_by_model(model, categories)
        elif categories == []:
            model.categories.all().delete()

        if isinstance(model, Task) and is_important is not None:
            model.is_important = is_important
            model.save()

        if isinstance(model, Schedule) and schedule_type:
            model.type = schedule_type
            model.save()
        if instance.task:
            current_paused_at = instance.paused_at or now()
            total_duration = current_paused_at - instance.started_at
            for user in instance.task.people_in_charge.all():
                # Minus total duration to skill map actual measure time
                calculate_progress_skill_map(
                    instance.task,
                    user,
                    duration_time=-total_duration,
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                    duration_created_at=instance.created_at,
                )

        # Update actual duration
        if started_at:
            instance.started_at = started_at
        if paused_at:
            instance.paused_at = paused_at
        instance.save()
        if instance.task:
            paused_at = instance.paused_at or now()
            total_duration = paused_at - instance.started_at
            for user in instance.task.people_in_charge.all():
                # Plus total duration to skill map actual measure time
                calculate_progress_skill_map(
                    instance.task,
                    user,
                    duration_time=total_duration,
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                    duration_created_at=instance.created_at,
                )
        paused_at = paused_at or instance.paused_at or now()
        started_at = started_at or instance.started_at
        if started_at.date() != paused_at.date():
            separate_duration(instance, instance.paused_at, user=user)

    @transaction.atomic
    def perform_destroy(self, instance):
        """
        Handle delete actual duration
        """

        validate_editable_actual_duration(instance, is_deleted=True)

        model = instance.task or instance.schedule
        if model and model.is_start and instance.paused_at is None:
            model.is_start = False
            model.save()
        if instance.task:
            total_duration = instance.paused_at - instance.started_at
            for user in instance.task.people_in_charge.all():
                # Minus total duration to skill map actual measure time
                calculate_progress_skill_map(
                    instance.task,
                    user,
                    duration_time=-total_duration,
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                    duration_created_at=instance.created_at,
                )

        instance.delete()

    def _handle_create_actual_duration(self, item):
        """
        Handle create actual duration and calculate progress skill
        """
        user = self.request.user
        task = item.pop("task", None)
        schedule = item.pop("schedule", None)
        tags = item.pop("tags", None)
        categories = item.pop("category_ids", None)
        is_important = item.pop("is_important", None)
        schedule_type = item.pop("schedule_type", None)
        started_at = item.pop("started_at", None)
        paused_at = item.pop("paused_at", None)
        uuid = item.pop("uuid", uuid4())
        model = task or schedule
        # Create or update tags
        if tags is not None:
            # Remove all old tags and add new tag in request.
            model.tags.clear()

            for item in tags:
                model.tags.add(
                    item,
                    through_defaults={"company_id": user.company_id},
                )
        elif tags == []:
            model.tags.clear()

        # Create or update categories
        if categories is not None:
            create_categories_by_model(model, categories)
        elif categories == []:
            model.categories.all().delete()

        if isinstance(model, Task) and is_important is not None:
            model.is_important = is_important
            model.save()

        if isinstance(model, Schedule) and schedule_type:
            model.type = schedule_type
            model.save()

        durations = []
        intervals = split_date_range(started_at, paused_at)
        if started_at.date() != paused_at.date():
            for start, end in intervals:
                uuid = uuid4()
                while TaskDuration.objects.filter(uuid=uuid).exists():
                    uuid = uuid4()
                task_duration = TaskDuration.objects.create(
                    task=model if isinstance(model, Task) else None,
                    schedule=model if isinstance(model, Schedule) else None,
                    started_at=start,
                    paused_at=end,
                    company_id=user.company_id,
                    user=user,
                    uuid=uuid,
                )
                durations.append(task_duration)
        else:
            task_duration = TaskDuration.objects.create(
                task=model if isinstance(model, Task) else None,
                schedule=model if isinstance(model, Schedule) else None,
                started_at=started_at,
                paused_at=paused_at,
                company_id=user.company_id,
                user=user,
                uuid=uuid,
            )
            durations.append(task_duration)

        if isinstance(model, Task):
            total_duration = paused_at - started_at
            for user in model.people_in_charge.all():
                # Plus total duration to skill map actual measure time
                calculate_progress_skill_map(
                    model,
                    user,
                    duration_time=total_duration,
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value,
                    duration_created_at=task_duration.created_at,
                )
        return durations

    @action(
        methods=["POST"],
        detail=False,
        url_path="bulk-create",
        serializer_class=ActualDurationBulkCreationSerializer,
    )
    @transaction.atomic
    def bulk_create(self, request):
        """
        Handle create multiple actual duration
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        actual_durations = serializer.validated_data["actual_durations"]
        durations = []
        for item in actual_durations:
            durations += self._handle_create_actual_duration(item)

        return self.response_ok(
            data=ActualDurationDetailSerializer(durations, many=True).data
        )
