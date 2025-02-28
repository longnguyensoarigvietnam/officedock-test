from datetime import datetime, timedelta

from django.db.models import (
    OuterRef,
    Subquery,
    Q,
    Value,
    DateTimeField,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.timezone import now
from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from base.constants import REPLACE_NULL_DATE
from calendars.constants import CalendarTypes, ScheduleCategoryTypes
from chat.constants import ChatMessageTypes
from common.serializers import CreationDataUserSerializer
from common.utils import get_common_categories
from organizations.models import Organization
from organizations.serializers import OrganizationSerializer
from skills.models import StatisticCategory
from tags.serializers import BaseTagSerializer, TagsForCreationSerializer
from tasks.models import (
    PeopleInChargeTasks,
    Task,
    TaskIndex,
    TaskSchedule,
    TaskStatus,
    TodoList,
)
from tasks.constants import INITIAL_INDEX_VALUE, DatetimeUnitTypes
from users.serializers import ProfileSerializer, UsersForCreationSerializer
from users.models import User


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
        tags_tasks = obj.tags_tasks.order_by("created_at").all()
        tags = [tag_tasks.tag for tag_tasks in tags_tasks]

        return BaseTagSerializer(tags, many=True).data

    def get_is_my_task(self, instance):
        """
        Return True if task is my task, otherwise return False.
        """

        user = self.context.get("request").user
        return user.id in instance.people_in_charge_tasks.values_list(
            "user", flat=True
        )

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


def get_task_index(instance, request, user_id=None):
    """
    Return the last TaskIndex for the given task and user.
    """
    user_id = (
        user_id
        or request.query_params.get("user_id")
        or getattr(request.user, "id", None)
    )

    return (
        TaskIndex.objects.filter(task=instance, user_id=user_id).last()
        if user_id
        else None
    )


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
    organization = OrganizationSerializer(read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
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
            "priority",
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
        ]

        read_only_fields = ["id", "is_start", "is_my_task", "created_at"]

    def validate(self, attrs):
        """Validation data"""
        task_schedules = attrs.get("task_schedules")
        people_in_charge_ids = attrs.get("people_in_charge_ids")
        instance = self.instance

        # Sort list by plan start date
        if task_schedules:
            task_schedules.sort(key=lambda x: x["plan_start_date"])
            current_task_schedules = []
            if instance:
                current_task_schedules = instance.task_schedules.values_list(
                    "id", flat=True
                )
            for i in range(len(task_schedules) - 1):
                if (
                    task_schedules[i]["plan_end_date"]
                    > task_schedules[i + 1]["plan_start_date"]
                ):
                    raise serializers.ValidationError(
                        {
                            "task_schedules": ERROR_MESSAGES[
                                "exists_task_schedule"
                            ]
                        }
                    )
            for task_schedule in task_schedules:
                plan_start_date = task_schedule["plan_start_date"]
                plan_end_date = task_schedule["plan_end_date"]

                check_exists_schedule = TaskSchedule.objects.filter(
                    Q(
                        Q(plan_start_date__lt=plan_end_date)
                        | Q(plan_start_date__lte=plan_start_date)
                    )
                    & Q(
                        Q(plan_end_date__gt=plan_start_date)
                        | Q(plan_end_date__gte=plan_end_date)
                    )
                    & Q(
                        task__people_in_charge_tasks__user__in=[
                            user["people_in_charge"]
                            for user in people_in_charge_ids
                        ]
                    )
                )
                if current_task_schedules:
                    check_exists_schedule = check_exists_schedule.exclude(
                        id__in=current_task_schedules
                    )
                elif task_schedule.get("schedule_id"):
                    check_exists_schedule = check_exists_schedule.exclude(
                        id=task_schedule.get("schedule_id").id
                    )

                if check_exists_schedule.exists():
                    raise serializers.ValidationError(
                        {
                            "task_schedules": ERROR_MESSAGES[
                                "exists_task_schedule"
                            ]
                        }
                    )

        return attrs

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        if not obj.categories.exists():
            return []

        return get_common_categories(obj.categories.first())

    def to_representation(self, instance):
        """
        Custom sorting by index for list people in charge
        """
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
        if instance.reminds:
            representation["remind_countdown"] = instance.reminds["countdown"]
            representation["remind_type"] = instance.reminds["type"]
        return representation

    def get_index(self, instance):
        """
        Return index of task
        """
        last_task = get_task_index(
            instance, self.context.get("request"), self.context.get("user_id")
        )
        return last_task.index if last_task else INITIAL_INDEX_VALUE

    def get_pin_at(self, instance):
        """
        Return pin time of task
        """
        last_task = get_task_index(
            instance, self.context.get("request"), self.context.get("user_id")
        )

        return last_task.pin_at if last_task else None


class TaskBoardSerializer(TaskCommonSerializer):
    """
    Serializer for the Task model.
    """

    index = serializers.SerializerMethodField(read_only=True)
    pin_at = serializers.SerializerMethodField(read_only=True)
    type = serializers.SerializerMethodField(read_only=True)
    # FIXME: Check spec implement color of category
    categories = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "is_start",
            "is_my_task",
            "priority",
            "is_important",
            "deadline",
            "is_schedule_in_today",
            "index",
            "pin_at",
            "type",
            "categories",
        ]

    # FIXME: Check spec implement color of category
    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        if not obj.categories.exists():
            return []

        return get_common_categories(obj.categories.first())

    def get_index(self, instance):
        """
        Return index of task
        """
        last_task = get_task_index(
            instance, self.context.get("request"), self.context.get("user_id")
        )
        return last_task.index if last_task else INITIAL_INDEX_VALUE

    def get_pin_at(self, instance):
        """
        Return pin time of task
        """
        last_task = get_task_index(
            instance, self.context.get("request"), self.context.get("user_id")
        )
        return last_task.pin_at if last_task else None

    def get_type(self, instance):
        """
        Return task type for duration
        """
        return CalendarTypes.TASK.value


class TaskCalendarSerializer(TaskCommonSerializer):
    """
    Serializer for the Task model.
    """

    type = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    task_schedules = TaskScheduleSerializer(many=True)

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
        ]

    def get_type(self, instance):
        """
        Return task type for calendar event
        """
        return CalendarTypes.TASK.value

    # FIXME: Check spec implement color of category
    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        if not obj.categories.exists():
            return []

        return get_common_categories(obj.categories.first())


class TaskScheduleForCreationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Task model.
    """

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
        check_exists_schedule = TaskSchedule.objects.filter(
            Q(
                Q(plan_start_date__lt=plan_end_date)
                | Q(plan_start_date__lte=plan_start_date)
            )
            & Q(
                Q(plan_end_date__gt=plan_start_date)
                | Q(plan_end_date__gte=plan_end_date)
            )
        )

        if task:
            check_exists_schedule = check_exists_schedule.filter(
                task__people_in_charge_tasks__user__in=task.people_in_charge_tasks.values_list(
                    "user", flat=True
                )
            )

        if check_exists_schedule.exists():
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["exists_task_schedule"]}
            )

        return attrs

    def get_task(self, obj):
        return {
            "id": obj.task.id,
            "title": obj.task.title,
        }


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

    class Meta:
        model = TaskIndex
        fields = ["index", "user", "task", "status", "pin_at", "is_begin_unpin"]


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

    class Meta:
        model = TaskIndex
        fields = ["id", "index", "user", "task", "pin_at"]
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


class TaskTeamdockSerializer(serializers.ModelSerializer):
    """
    Serializer for task in teamdock
    """

    profile = ProfileSerializer(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "profile",
            "status",
        ]

    def get_status(self, obj):
        """
        Retrieve the task status along with tasks assigned to the user.
        """
        per_page = 5
        request = self.context.get("request")
        statuses = TaskStatus.objects.order_by("id")
        results = []

        for status in statuses:
            tasks = obj.in_charge_tasks.filter(status=status)
            tasks_total = tasks.count()

            # Fetch task index and pinned status for the user
            task_pin = TaskIndex.objects.filter(
                task=OuterRef("pk"), user_id=obj.id
            ).values("pin_at")[:1]
            task_index = TaskIndex.objects.filter(
                task=OuterRef("pk"), user_id=obj.id
            ).values("index")[:1]

            # Annotate tasks with task index and pin timestamp
            tasks = tasks.annotate(
                index=Subquery(task_index),
                coalesced_pin_at=Coalesce(
                    Subquery(task_pin),
                    Value(REPLACE_NULL_DATE),
                    output_field=DateTimeField(),
                ),
            ).order_by("-coalesced_pin_at", "-index")[:per_page]

            # Append formatted status data
            results.append(
                {
                    "id": status.id,
                    "name": status.name,
                    "total": tasks_total,
                    "has_next": tasks_total > per_page,
                    "tasks": TaskBoardSerializer(
                        tasks,
                        many=True,
                        context={"request": request, "user_id": obj.id},
                    ).data,
                }
            )

        return results
