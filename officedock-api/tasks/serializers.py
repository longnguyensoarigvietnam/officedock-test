from datetime import datetime, timedelta, time

from django.db.models import (
    Q,
    Max,
    F,
)
from django.utils import timezone
from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from calendars.constants import CalendarTypes, ScheduleCategoryTypes
from chat.constants import ChatMessageTypes
from common.constants import BASE_DATETIME_FORMAT
from common.serializers import CreationDataUserSerializer
from common.utils import (
    get_common_categories,
    get_large_statistic_category_color,
)
from organizations.models import Organization
from organizations.serializers import BaseOrganizationSerializer
from skills.models import StatisticCategory
from tags.serializers import BaseTagSerializer, TagsForCreationSerializer
from tasks.models import (
    PeopleInChargeTasks,
    Task,
    TaskIndex,
    TaskSchedule,
    TaskStatus,
    TeamTaskIndex,
    TodoList,
    TaskDuration,
)
from tasks.constants import (
    INITIAL_INDEX_VALUE,
    DatetimeUnitTypes,
    FrequencyMap,
    TaskStatus as TaskStatusConstant,
    TaskTypes,
)
from users.serializers import (
    ProfileSerializer,
    UsersForCreationSerializer,
    BaseUserSerializer,
)
from users.models import User
from tasks.utils import (
    annotate_and_order_tasks_by_pin_and_index,
    apply_filters_to_tasks,
    apply_ordering_to_tasks,
)


class TaskDurationSerializer(serializers.ModelSerializer):
    """
    Serializer for Task duration.
    """

    task_duration = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = ["id", "title", "task_duration", "is_start"]

    def get_task_duration(self, obj):
        """
        Calculate task duration.
        """

        task_durations = obj.task_durations.all()
        total_duration = timedelta()

        # Calculate time between started and paused
        for task_duration in task_durations:
            paused_at = (
                task_duration.paused_at
                if task_duration.paused_at
                else timezone.now()
            )
            total_duration += paused_at - task_duration.started_at

        # Calculate total time for all period time
        total_seconds = int(total_duration.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        # Format the output as desired (HH:MM:SS)
        return "{:02}:{:02}:{:02}".format(hours, minutes, seconds)


class TaskCommonSerializer(serializers.ModelSerializer):
    """
    Serializer for Task common.
    """

    status = serializers.SerializerMethodField(read_only=True)
    status_id = serializers.PrimaryKeyRelatedField(
        source="status",
        queryset=TaskStatus.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    tags = serializers.SerializerMethodField()
    is_my_task = serializers.SerializerMethodField()
    is_schedule_in_today = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "status",
            "status_id",
            "is_my_task",
            "tags",
            "is_schedule_in_today",
        ]
        read_only_fields = ["id"]

    def get_tags(self, obj):
        """
        Return tag order by created_at
        """
        # Get tags ordered by `created`
        tags = obj.tags.order_by("id")
        return BaseTagSerializer(tags, many=True).data

    def get_is_my_task(self, instance):
        """
        Return True if task is my task, otherwise return False.
        """

        request = self.context.get("request")
        if user := request.user:
            return instance.people_in_charge_tasks.filter(user=user).exists()

        return False

    def get_status(self, instance):
        """
        Get status of task
        """
        return {
            "id": instance.status_id,
            "name": instance.status_name,
        }

    def get_is_schedule_in_today(self, instance):
        """
        Return task type for duration
        """
        today = now().date()
        return instance.task_schedules.filter(
            plan_start_date__date__lte=today, plan_end_date__date__gte=today
        ).exists()


class TaskScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for task schedule.
    """

    schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=TaskSchedule.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    is_start = serializers.SerializerMethodField()

    class Meta:
        model = TaskSchedule
        fields = [
            "id",
            "uuid",
            "schedule_id",
            "plan_start_date",
            "plan_end_date",
            "is_start",
        ]

        read_only_fields = ["id", "uuid", "is_start"]

    def validate(self, attrs):
        """Validation"""
        instance = self.instance
        if instance and instance.task and instance.task.archived_at:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["cannot_edit_schedule_task_archive"]}
            )

        return attrs

    def get_is_start(self, instance):
        """
        Return status start of task
        """
        return instance.task.is_start


class TodoListSerializer(serializers.ModelSerializer):
    """
    Serializer for todo list.
    """

    todo_list_id = serializers.PrimaryKeyRelatedField(
        queryset=TodoList.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    is_checked = serializers.BooleanField(write_only=True)
    task_id = serializers.PrimaryKeyRelatedField(
        source="task",
        queryset=Task.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TodoList
        fields = [
            "id",
            "index",
            "content",
            "is_checked",
            "checked_at",
            "task_id",
            "todo_list_id",
        ]
        read_only_fields = ["id", "checked_at"]

    def create(self, validated_data):
        validated_data.pop("task_id", None)
        if validated_data.pop("is_checked", False):
            validated_data["checked_at"] = datetime.now()

        return super().create(validated_data)

    def update(self, instance, validated_data):
        is_checked = validated_data.pop("is_checked", False)
        validated_data["checked_at"] = datetime.now() if is_checked else None

        return super().update(instance, validated_data)


def get_task_index(instance, request, user_id=None, team_id=None):
    """
    Return the last TaskIndex for the given task and user.
    """
    user_id = (
        user_id
        or request.query_params.get("user_id")
        or getattr(request.user, "id", None)
    )

    task_index = None
    if team_id and user_id:
        task_index = TeamTaskIndex.objects.filter(
            task=instance, team_id=team_id, user_id=user_id
        ).last()
    elif user_id:
        task_index = TaskIndex.objects.filter(
            task=instance, user_id=user_id
        ).last()

    return task_index


class CategoryForCreationTaskSerializer(serializers.Serializer):
    """Serializer of category for creation task"""

    category_id = serializers.PrimaryKeyRelatedField(
        source="statistic_category",
        queryset=StatisticCategory.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    type = serializers.ChoiceField(
        choices=ScheduleCategoryTypes.choices(), required=True
    )


class TaskSerializer(TaskDurationSerializer, TaskCommonSerializer):
    """
    Serializer for the Task model.
    """

    people_in_charge = CreationDataUserSerializer(many=True, read_only=True)
    people_in_charge_ids = UsersForCreationSerializer(
        many=True, write_only=True, required=False, allow_null=True
    )
    tag_ids = TagsForCreationSerializer(
        many=True, write_only=True, required=False, allow_null=True
    )
    index = serializers.SerializerMethodField(read_only=True)
    pin_at = serializers.SerializerMethodField(read_only=True)
    todo_list = TodoListSerializer(many=True, required=False, allow_null=True)
    task_schedules = TaskScheduleSerializer(
        many=True, required=False, allow_null=True
    )
    send_to_chat = serializers.BooleanField(write_only=True, required=False)
    chat_room_code = serializers.CharField(write_only=True, required=False)
    action = serializers.ChoiceField(
        write_only=True,
        required=False,
        choices=[
            ChatMessageTypes.CREATION_TASK.value,
            ChatMessageTypes.EDIT_TASK.value,
        ],
    )
    organization = BaseOrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    # Detect data generation in my task or team task to respond with accurate index
    is_team_task = serializers.BooleanField(write_only=True, required=False)
    categories = serializers.SerializerMethodField(read_only=True)
    category_ids = CategoryForCreationTaskSerializer(
        many=True, required=False, allow_null=True, write_only=True
    )
    copy_task_id = serializers.PrimaryKeyRelatedField(
        source="copy_task",
        queryset=Task.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    remind_countdown = serializers.IntegerField(allow_null=True, required=False)
    remind_type = serializers.ChoiceField(
        allow_null=True, required=False, choices=DatetimeUnitTypes.choices()
    )
    show_deadline_time = serializers.BooleanField(
        write_only=True, default=False
    )
    plan_start_date = serializers.DateTimeField(allow_null=True, required=False)
    plan_end_date = serializers.DateTimeField(allow_null=True, required=False)
    repeat_type = serializers.ChoiceField(
        choices=FrequencyMap.choices(), allow_null=True, required=False
    )
    repeat_interval = serializers.IntegerField(allow_null=True, required=False)
    week_day = serializers.IntegerField(
        min_value=0, max_value=6, required=False, allow_null=True
    )
    month_day = serializers.IntegerField(
        min_value=1, max_value=31, required=False, allow_null=True
    )
    month = serializers.IntegerField(
        min_value=1, max_value=12, required=False, allow_null=True
    )
    task_schedule_from_date = serializers.DateTimeField(
        allow_null=True, required=False
    )
    task_schedule_end_date = serializers.DateTimeField(
        allow_null=True, required=False
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "type",
            "status",
            "status_id",
            "organization",
            "organization_id",
            "task_duration",
            "is_start",
            "is_my_task",
            "is_team_task",
            "deadline",
            "remind_at",
            "description",
            "tags",
            "tag_ids",
            "people_in_charge",
            "people_in_charge_ids",
            "created_at",
            "index",
            "is_important",
            "todo_list",
            "task_schedules",
            "send_to_chat",
            "chat_room_code",
            "action",
            "pin_at",
            "categories",
            "category_ids",
            "copy_task_id",
            "is_schedule_in_today",
            "remind_countdown",
            "remind_type",
            "plan_start_date",
            "plan_end_date",
            "repeat_interval",
            "repeat_type",
            "week_day",
            "month_day",
            "month",
            "task_schedule_from_date",
            "task_schedule_end_date",
            "show_deadline_time",
            "deleted_at",
            "archived_at",
            "completed_at",
        ]

        read_only_fields = [
            "id",
            "is_start",
            "is_my_task",
            "created_at",
            "completed_at",
            "archived_at",
            "deleted_at",
        ]

    def validate(self, attrs):
        """Validation data"""
        instance = self.instance
        repeat_type = attrs.get("repeat_type")
        week_day = attrs.get("week_day", None)
        month_day = attrs.get("month_day", None)
        plan_start_date = attrs.get("plan_start_date", None)
        plan_end_date = attrs.get("plan_end_date", None)
        month = attrs.get("month", None)

        if repeat_type == FrequencyMap.WEEKLY.value and week_day is None:
            raise serializers.ValidationError(
                {"week_day": ERROR_MESSAGES["select_day"]}
            )

        if repeat_type == FrequencyMap.MONTHLY.value and month_day is None:
            raise serializers.ValidationError(
                {"month_day": ERROR_MESSAGES["select_day"]}
            )

        if repeat_type == FrequencyMap.YEARLY.value and month is None:
            raise serializers.ValidationError(
                {"month": ERROR_MESSAGES["select_month"]}
            )

        if plan_start_date and plan_end_date is None:
            raise serializers.ValidationError(
                {"plan_end_date": ERROR_MESSAGES["select_day"]}
            )

        if instance and instance.archived_at:
            if attrs.get("status") and attrs.get("status") != instance.status:
                raise serializers.ValidationError(
                    {"detail": ERROR_MESSAGES["cannot_updated"]}
                )
            if (
                attrs.get("task_schedules")
                and attrs.get("task_schedules") != instance.task_schedules
            ):
                raise serializers.ValidationError(
                    {
                        "detail": ERROR_MESSAGES[
                            "cannot_edit_schedule_task_archive"
                        ]
                    }
                )

        return attrs

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        return get_common_categories(obj.categories.first(), obj)

    def to_representation(self, instance):
        """
        Custom sorting by index for list people in charge
        """
        action = self.context.get("action")
        task_schedule_from_date = self.context.get("task_schedule_from_date")
        task_schedule_end_date = self.context.get("task_schedule_end_date")
        representation = super().to_representation(instance)
        sorted_users = [
            item.user
            for item in PeopleInChargeTasks.objects.filter(
                task=instance
            ).order_by("id")
        ]
        representation["people_in_charge"] = CreationDataUserSerializer(
            sorted_users, many=True
        ).data

        if task_schedule_from_date and task_schedule_end_date:
            task_schedules = instance.task_schedules.filter(
                Q(
                    Q(plan_start_date__date__gte=task_schedule_from_date.date())
                    & Q(plan_end_date__date__lte=task_schedule_end_date.date())
                )
            ).all()
        elif action and action == "retrieve":
            task_schedules = instance.task_schedules.all()
        else:
            task_schedules = instance.task_schedules.filter(
                plan_start_date__date__gte=now().date()
            )

        representation["task_schedules"] = TaskScheduleSerializer(
            task_schedules, many=True
        ).data
        representation["show_deadline_time"] = False
        if instance.reminds:
            representation["remind_countdown"] = instance.reminds["countdown"]
            representation["remind_type"] = instance.reminds["type"]
            representation["show_deadline_time"] = (
                instance.reminds["show_deadline_time"]
                if instance.reminds.get("show_deadline_time")
                else False
            )
        if recurring := instance.recurring:
            fields = [
                "plan_start_date",
                "plan_end_date",
                "repeat_type",
                "repeat_interval",
                "week_day",
                "month_day",
                "month",
            ]
            for field in fields:
                representation[field] = recurring.get(field)
        return representation

    def get_index(self, instance):
        """
        Return index of task
        """
        # Get index from annotate the queryset if exists
        if hasattr(instance, "index"):
            return instance.index

        last_task = get_task_index(
            instance,
            self.context.get("request"),
            self.context.get("user_id"),
            self.context.get("organization_id"),
        )
        return last_task.index if last_task else INITIAL_INDEX_VALUE

    def get_pin_at(self, instance):
        """
        Return pin time of task
        """
        # Get pin_at from annotate the queryset if exists
        if hasattr(instance, "pin_at"):
            return instance.pin_at

        last_task = get_task_index(
            instance,
            self.context.get("request"),
            self.context.get("user_id"),
            self.context.get("organization_id"),
        )

        return last_task.pin_at if last_task else None


class TaskBoardSerializer(TaskCommonSerializer):
    """
    Serializer for the Task model.
    """

    index = serializers.SerializerMethodField(read_only=True)
    pin_at = serializers.SerializerMethodField(read_only=True)
    type = serializers.SerializerMethodField(read_only=True)
    categories = serializers.SerializerMethodField(read_only=True)
    is_cross_team_task = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "is_start",
            "is_important",
            "deadline",
            "is_schedule_in_today",
            "is_cross_team_task",
            "index",
            "pin_at",
            "type",
            "categories",
            "completed_at",
            "created_at",
        ]

    def to_representation(self, instance):
        """
        Custom representation
        """
        representation = super().to_representation(instance)
        if instance.status_name == TaskStatusConstant.MY_ROUTINE.value:
            recurring = instance.recurring
            fields = [
                "plan_start_date",
                "plan_end_date",
                "repeat_type",
                "repeat_interval",
                "week_day",
                "month_day",
                "month",
            ]
            for field in fields:
                representation[field] = (
                    recurring.get(field) if recurring else None
                )
        return representation

    def get_categories(self, obj):
        """Handle retrieving only color large categorie of a Task."""
        return get_large_statistic_category_color(obj)

    def get_index(self, instance):
        """
        Return index of task
        """
        # Get index from annotate the queryset if exists
        if hasattr(instance, "index"):
            return instance.index

        last_task = get_task_index(
            instance,
            self.context.get("request"),
            self.context.get("user_id"),
            self.context.get("organization_id"),
        )
        return last_task.index if last_task else INITIAL_INDEX_VALUE

    def get_pin_at(self, instance):
        """
        Return pin time of task
        """
        # Get pin_at from annotate the queryset if exists
        if hasattr(instance, "pin_at"):
            return instance.pin_at

        last_task = get_task_index(
            instance,
            self.context.get("request"),
            self.context.get("user_id"),
            self.context.get("organization_id"),
        )
        return last_task.pin_at if last_task else None

    def get_type(self, instance):
        """
        Return task type for duration
        """
        return CalendarTypes.TASK.value

    def get_is_cross_team_task(self, instance):
        """
        Returns detailed information about a task, including the `is_cross_team_task` flag
        to indicate whether the task belongs to another (secondary) team.
        """
        organization_id = self.context.get("organization_id")

        # If no organization_id in context, task is not cross-team
        if organization_id is None:
            return False

        # If task has no organization, it's not cross-team
        if not instance.organization_id:
            return False

        # Compare organization IDs
        return int(instance.organization_id) != int(organization_id)


class TaskCalendarSerializer(TaskCommonSerializer):
    """
    Serializer for the Task model.
    """

    type = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    task_schedules = serializers.SerializerMethodField()
    is_start = serializers.SerializerMethodField()
    deadline = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "is_start",
            "is_important",
            "deadline",
            "is_my_task",
            "task_schedules",
            "type",
            "categories",
            "status",
            "archived_at",
            "created_at",
        ]

    def get_is_start(self, instance):
        """
        Return is_start if user is running this task
        """
        request = self.context.get("request")
        if user := request.user:
            return TaskDuration.objects.filter(
                task=instance, user=user, paused_at__isnull=True
            ).exists()
        else:
            return False

    def get_task_schedules(self, instance):
        """
        Return task schedules by limit time
        """
        request = self.context.get("request")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date and end_date:
            end_date = datetime.strptime(end_date, BASE_DATETIME_FORMAT).date()
            task_schedules = instance.task_schedules.filter(
                plan_start_date__gte=start_date,
                plan_end_date__lte=datetime.combine(end_date, time.max),
            ).all()
        else:
            task_schedules = instance.task_schedules.all()
        return TaskScheduleSerializer(task_schedules, many=True).data

    def get_type(self, instance):
        """
        Return task type for calendar event
        """
        return CalendarTypes.TASK.value

    def get_deadline(self, instance):
        """
        Return task deadline
        """
        return (
            instance.deadline
            if instance.status_name != TaskStatusConstant.MY_ROUTINE.value
            else None
        )

    def get_categories(self, obj):
        """Handle retrieving only color large categorie of a Task."""
        return get_large_statistic_category_color(obj)


class TaskScheduleForCreationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Task model.
    """

    uuid = serializers.UUIDField(required=False, allow_null=True)
    task = serializers.SerializerMethodField()
    task_id = serializers.PrimaryKeyRelatedField(
        source="task", queryset=Task.objects.all(), write_only=True
    )

    class Meta:
        model = TaskSchedule
        fields = [
            "id",
            "uuid",
            "task_id",
            "task",
            "plan_start_date",
            "plan_end_date",
        ]

    def validate(self, attrs):
        """Validation"""
        plan_start_date = attrs.get("plan_start_date")
        plan_end_date = attrs.get("plan_end_date")
        task = attrs.get("task")
        if (
            plan_start_date
            and plan_end_date
            and plan_start_date >= plan_end_date
        ):
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
            )

        if task and task.archived_at:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["cannot_edit_schedule_task_archive"]}
            )

        return attrs

    def get_task(self, obj):
        return {
            "id": obj.task.id,
            "title": obj.task.title,
        }


class TaskScheduleForCreationMultipleSerializer(serializers.Serializer):
    """
    Serializer for create task schedule multiple
    """

    task_schedules = TaskScheduleForCreationSerializer(many=True)


class TaskIndexSerializer(serializers.ModelSerializer):
    """
    Serializer for task index
    """

    status = serializers.PrimaryKeyRelatedField(
        queryset=TaskStatus.objects.all(), required=False, allow_null=True
    )
    is_begin_unpin = serializers.BooleanField(
        required=False, default=False, write_only=True
    )
    team = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    people_in_charge = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = TaskIndex
        fields = [
            "index",
            "user",
            "team",
            "task",
            "status",
            "pin_at",
            "is_begin_unpin",
            "people_in_charge",
        ]


class TeamTaskIndexSerializer(serializers.ModelSerializer):
    """
    Serializer for team task index
    """

    status = serializers.PrimaryKeyRelatedField(
        queryset=TaskStatus.objects.all(), required=False, allow_null=True
    )
    is_begin_unpin = serializers.BooleanField(
        required=False, default=False, write_only=True
    )
    team = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    people_in_charge = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = TeamTaskIndex
        fields = [
            "index",
            "user",
            "team",
            "task",
            "status",
            "pin_at",
            "is_begin_unpin",
            "people_in_charge",
        ]


class TaskIndexForCreationSerializer(serializers.Serializer):
    """
    Serializer for task index
    """

    tasks = TaskIndexSerializer(many=True)


class TaskIndexPinAtSerializer(TaskIndexSerializer):
    """
    Serializer of pin for task index
    """

    pin_at = serializers.DateTimeField(required=True)
    team = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = TaskIndex
        fields = ["id", "index", "user", "team", "task", "pin_at"]
        read_only_fields = ["id", "index", "user", "task"]


class TaskTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for Task template.
    """

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
        ]
        read_only_fields = ["id"]


class TaskTeamdockSerializer(BaseUserSerializer):
    """
    Serializer for task in teamdock
    """

    profile = ProfileSerializer(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "avatar_color",
            "avatar",
            "profile",
            "full_name",
            "status",
            "deleted_at",
        ]

    def get_status(self, obj):
        """
        Retrieve the task status along with tasks assigned to the user.
        """
        request = self.context.get("request")
        user = request.user
        params = request.query_params
        ordering_fields = self.context.get("ordering_fields")
        organization_id = params.get("organization_id")
        is_cross_team_task = (
            params.get("is_cross_team_task", "").lower() == "true"
        )
        page_size = int(params.get("page_size", 5))
        ordering = params.get("ordering", None)
        statuses = list(TaskStatus.objects.order_by("id"))
        user_org_ids = list(
            obj.organizations.all().values_list("id", flat=True)
        )

        results = []
        all_tasks = obj.in_charge_tasks.filter(
            organization_id__in=user_org_ids,
            deleted_at__isnull=True,
        ).exclude(type=TaskTypes.MY_TEMPLATE.value)
        for status in statuses:
            tasks = all_tasks.filter(status=status)

            # Filter data
            tasks = apply_filters_to_tasks(tasks, params)

            if ordering:
                # Validate ordering before applying it
                if ordering not in ordering_fields:
                    raise ValidationError(
                        {
                            "detail": ERROR_MESSAGES[
                                "invalid_ordering_field"
                            ].format(field_name=ordering)
                        }
                    )

                # Ordering by deadline, important for tasks queryset
                tasks = apply_ordering_to_tasks(tasks, ordering)

                # Update team task index only if sorting by deadline or importance
                update_team_task_indexes = []
                for idx, task in enumerate(tasks):
                    team_task_index = task.team_task_index.filter(
                        team_id=organization_id, user=user
                    ).first()
                    if team_task_index:
                        if team_task_index.pin_at:
                            team_task_index.pin_at = timezone.now() - timedelta(
                                minutes=INITIAL_INDEX_VALUE + idx
                            )
                        team_task_index.index = INITIAL_INDEX_VALUE - idx
                        update_team_task_indexes.append(team_task_index)

                if update_team_task_indexes:
                    TeamTaskIndex.objects.bulk_update(
                        update_team_task_indexes, fields=["index", "pin_at"]
                    )

            # If the current user has no team task index, reindex tasks
            if not ordering or is_cross_team_task:
                tasks_had_index = TeamTaskIndex.objects.filter(
                    team_id=organization_id,
                    user=user,
                    task__status=status,
                    task__people_in_charge=obj,
                ).values("task_id")
                tasks_without_index = tasks.exclude(id__in=tasks_had_index)

                if tasks_without_index.exists():
                    # Get max index task not assigned user of user logged in team
                    max_index = (
                        TeamTaskIndex.objects.filter(
                            team_id=organization_id,
                            user=user,
                            task__status=status,
                            task__people_in_charge=obj,
                        )
                        .aggregate(max_idx=Max("index"))
                        .get("max_idx")
                    )

                    if max_index is None:
                        max_index = INITIAL_INDEX_VALUE

                    tasks = tasks.order_by(
                        F("deadline").asc(nulls_last=True),
                        F("is_important").desc(),
                        F("updated_at").desc(),
                    )

                    # Add index start to max_index - 1, max_index - 2, ...
                    create_team_task_indexes = []
                    for idx, task in enumerate(tasks_without_index, start=1):
                        create_team_task_indexes.append(
                            TeamTaskIndex(
                                task=task,
                                team_id=organization_id,
                                user=user,
                                company_id=user.company_id,
                                index=max_index - idx,
                            )
                        )
                    if create_team_task_indexes:
                        TeamTaskIndex.objects.bulk_create(
                            create_team_task_indexes, ignore_conflicts=True
                        )

            # Fetch task index and pinned status for the user
            tasks = annotate_and_order_tasks_by_pin_and_index(
                tasks, user, True, organization_id
            )

            # Get only data in seleted organization
            if not is_cross_team_task:
                tasks = tasks.filter(organization_id=organization_id)

            # Append formatted status data
            tasks_total = tasks.count()
            results.append(
                {
                    "id": status.id,
                    "name": status.name,
                    "total": tasks_total,
                    "has_next": tasks_total > page_size,
                    "tasks": TaskBoardSerializer(
                        tasks[:page_size],
                        many=True,
                        context={
                            "request": request,
                            "user_id": user.id,
                            "organization_id": organization_id,
                        },
                    ).data,
                }
            )

        return results


class TaskArchiveSerializer(TaskCommonSerializer):
    """
    Serializer for the Task model.
    """

    categories = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "type",
            "categories",
            "archived_at",
            "completed_at",
        ]

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        return get_common_categories(obj.categories.first(), obj)
