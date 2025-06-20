from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from calendars.constants import CalendarTypes, ScheduleTypes
from calendars.models import Schedule
from common.utils import get_common_categories, format_duration
from roles.constants import Actions, Screens
from roles.utils import has_permission
from tags.models import Tag
from tags.serializers import BaseTagSerializer
from tasks.models import Task, TaskDuration
from tasks.serializers import CategoryForCreationTaskSerializer


class DurationCalculatorSerializer(serializers.Serializer):
    """
    Handle get id and type of object
    """

    id = serializers.IntegerField(required=True)
    type = serializers.ChoiceField(
        required=True, choices=CalendarTypes.choices()
    )
    is_start = serializers.BooleanField(default=False)


class DurationSerializer(serializers.ModelSerializer):
    """
    Duration serializer
    """

    task_id = serializers.SerializerMethodField()
    schedule_id = serializers.SerializerMethodField()
    is_my_task = serializers.SerializerMethodField()
    is_start = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    plan_start_date = serializers.SerializerMethodField()
    plan_end_date = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "uuid",
            "title",
            "is_start",
            "task_id",
            "schedule_id",
            "is_my_task",
            "plan_start_date",
            "plan_end_date",
            "type",
            "is_cancel_alert",
            "categories",
            "total_duration",
        ]
        read_only_fields = ["id"]

    def get_total_duration(self, instance):
        """
        Return total duration of task
        """

        return (
            format_duration(instance.paused_at - instance.started_at)
            if instance.paused_at
            else None
        )

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        model = obj.task or obj.schedule
        if not model.categories.exists():
            return []

        return get_common_categories(model.categories.first(), model)

    def get_task_id(self, instance):
        """
        Return task id
        """
        if instance.task:
            return instance.task.id
        return None

    def get_schedule_id(self, instance):
        """
        Return schedule id
        """
        if instance.schedule:
            return instance.schedule.id
        return None

    def get_title(self, instance):
        """
        Return task title
        """
        if instance.task:
            return instance.task.title
        if instance.schedule:
            return instance.schedule.title

        return None

    def get_is_start(self, instance):
        """
        Return status start
        """
        if instance.task:
            return instance.task.is_start
        if instance.schedule:
            return instance.schedule.is_start
        return None

    def get_is_my_task(self, instance):
        """
        Return True if task is my task, otherwise return False.
        """
        if instance.task:
            user = self.context.get("request").user
            return user.id in instance.task.people_in_charge_tasks.values_list(
                "user", flat=True
            )
        return False

    def get_plan_start_date(self, instance):
        """
        Return started date
        """
        return instance.started_at

    def get_plan_end_date(self, instance):
        """
        Return paused date
        """
        return instance.paused_at

    def get_type(self, instance):
        """
        Return type of model
        """
        return (
            CalendarTypes.TASK.value
            if instance.task
            else CalendarTypes.SCHEDULE.value
        )


def check_valid_duration(started_at, paused_at, instance):
    """Handle check valid duration"""
    if started_at and paused_at and started_at >= paused_at:
        raise serializers.ValidationError(
            {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
        )
    if paused_at and paused_at > now():
        raise serializers.ValidationError(
            {"detail": ERROR_MESSAGES["end_date_greate_than_now"]}
        )
    elif started_at is None or paused_at is None and instance:
        is_start_gt_instance_paused = (
            started_at
            and instance.paused_at
            and started_at >= instance.paused_at
        )
        is_start_gt_now = (
            started_at
            and instance.paused_at is None
            and started_at >= timezone.now()
        )
        is_pause_lt_instance_start = (
            started_at is None
            and paused_at
            and paused_at <= instance.started_at
        )

        if (
            is_start_gt_instance_paused
            or is_start_gt_now
            or is_pause_lt_instance_start
        ):
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
            )


class UpdateDurationSerializer(serializers.ModelSerializer):
    """
    Duration serializer
    """

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "uuid",
            "started_at",
            "paused_at",
            "is_cancel_alert",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        """
        Validate data
        """
        instance = self.instance
        started_at = data.get("started_at", None)
        paused_at = data.get("paused_at")

        check_valid_duration(started_at, paused_at, instance)

        # Exclude the current instance when updating
        if instance:
            paused_at = paused_at or instance.paused_at or now()
            started_at = started_at or instance.started_at
            overlapping_qs = TaskDuration.objects.filter(
                Q(
                    task=instance.task,
                    schedule=instance.schedule,
                )
                & Q(started_at__lt=paused_at, paused_at__gt=started_at)
                & Q(user=instance.user)
            ).exclude(id=instance.id)

            if overlapping_qs.exists():
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["exists_duration"]}
                )

        return data


class ActualDurationCreationSerializer(serializers.ModelSerializer):
    """
    Base actual duration serializer
    """

    task_id = serializers.PrimaryKeyRelatedField(
        source="task",
        queryset=Task.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    schedule_id = serializers.PrimaryKeyRelatedField(
        source="schedule",
        queryset=Schedule.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        source="tags",
        queryset=Tag.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        many=True,
    )
    categories = serializers.SerializerMethodField(read_only=True)
    category_ids = CategoryForCreationTaskSerializer(
        many=True, required=False, allow_null=True, write_only=True
    )
    is_important = serializers.BooleanField(
        required=False, allow_null=True, default=False
    )
    schedule_type = serializers.ChoiceField(
        required=False,
        allow_null=True,
        choices=ScheduleTypes.choices(),
        write_only=True,
    )
    uuid = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "uuid",
            "task_id",
            "schedule_id",
            "tag_ids",
            "categories",
            "category_ids",
            "is_important",
            "schedule_type",
            "started_at",
            "paused_at",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "started_at": {"required": True},
            "paused_at": {"required": True},
        }

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        model = obj.task or obj.schedule
        if not model.categories.exists():
            return []

        return get_common_categories(model.categories.first(), model)

    def validate(self, data):
        """Validate data"""
        started_at = data.get("started_at", None)
        paused_at = data.get("paused_at", None)
        task = data.get("task", None)
        uuid = data.get("uuid", None)
        schedule = data.get("schedule", None)
        model = task or schedule
        instance = self.instance
        user = self.context.get("request").user
        if task is None and schedule is None:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["task_and_event_not_exists"]}
            )

        if uuid and TaskDuration.objects.filter(uuid=uuid).exists():
            raise ValidationError({"detail": ERROR_MESSAGES["cannot_create"]})

        check_valid_duration(started_at, paused_at, instance)
        if instance:
            paused_at = paused_at or instance.paused_at or now()
            started_at = started_at or instance.started_at
            user = instance.user
        overlapping_qs = TaskDuration.objects.filter(
            Q(
                task=model if isinstance(model, Task) else None,
                schedule=model if isinstance(model, Schedule) else None,
            )
            & Q(
                Q(started_at__lt=paused_at)
                & Q(Q(paused_at__gt=started_at) | Q(paused_at__isnull=True))
            )
            & Q(user=user)
        )

        # Exclude the current instance when updating
        if instance:
            overlapping_qs = overlapping_qs.exclude(id=instance.id)

        if overlapping_qs.exists():
            raise ValidationError({"detail": ERROR_MESSAGES["exists_duration"]})

        return data


class ActualDurationListSerializer(serializers.ModelSerializer):
    """
    Actual duration serializer for list
    """

    type = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    staffs = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "uuid",
            "type",
            "title",
            "tags",
            "categories",
            "started_at",
            "paused_at",
            "staffs",
            "task_id",
            "schedule_id",
            "created_at",
            "actions",
        ]
        read_only_fields = ["id"]

    def get_type(self, obj):
        """Get type of task or event"""
        return (
            CalendarTypes.TASK.value
            if obj.task
            else CalendarTypes.SCHEDULE.value
        )

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        user = self.context.get("request").user
        org = obj.task.organization if obj.task else obj.schedule.organization
        actions = {
            Actions.UPDATE.value: f"{Screens.ACTUAL_DURATION.value}_{Actions.UPDATE.value}",
            Actions.DELETE.value: f"{Screens.ACTUAL_DURATION.value}_{Actions.DELETE.value}",
        }

        return has_permission(actions, user, [org.id] if org else [])

    def get_title(self, obj):
        """Get title of task or event"""
        return (
            obj.task.title
            if obj.task
            else obj.schedule.title
            if obj.schedule
            else None
        )

    def get_tags(self, obj):
        """Get tags of task or event"""
        tags = (
            obj.task.tags
            if obj.task
            else obj.schedule.tags
            if obj.schedule
            else []
        )
        return BaseTagSerializer(tags, many=True).data

    def get_categories(self, obj):
        """Get categories of task or event"""
        model = obj.task or obj.schedule
        if not model.categories.exists():
            return []

        return get_common_categories(model.categories.first(), model)

    def get_staffs(self, obj):
        """Get staffs of task or event"""
        return [obj.user.profile.full_name] if obj.user else []


class ActualDurationDetailSerializer(ActualDurationListSerializer):
    """Actual duration detail serializer"""

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "uuid",
            "title",
            "tags",
            "categories",
            "started_at",
            "paused_at",
            "type",
        ]
