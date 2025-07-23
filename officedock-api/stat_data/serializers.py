from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from calendars.constants import CalendarTypes
from calendars.models import Schedule
from common.utils import (
    format_duration,
    get_common_categories_with_none_category,
)
from dashboard.serializers import ActualDurationListSerializer
from tags.serializers import BaseTagSerializer
from tasks.models import TaskDuration, Task
from tasks.serializers import TaskCommonSerializer, TodoListSerializer


class DurationSerializer(serializers.ModelSerializer):
    """
    Duration serializer
    """

    duration = serializers.SerializerMethodField()

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "uuid",
            "started_at",
            "paused_at",
            "duration",
        ]
        read_only_fields = ["id", "uuid"]

    def get_duration(self, obj):
        """
        Handle calculate duration
        """
        paused_at = obj.paused_at if obj.paused_at else timezone.now()

        return format_duration(paused_at - obj.started_at)


def _get_list_durations(obj, start_of_day, end_of_day, user=None):
    """
    Handle get list durations
    """
    return obj.task_durations.filter(
        Q(user=user)
        & Q(
            Q(Q(started_at__gte=start_of_day) & Q(paused_at__lte=end_of_day))
            | Q(
                Q(started_at__lte=end_of_day)
                & Q(started_at__gte=start_of_day)
                & Q(paused_at__isnull=True)
            )
        )
    ).all()


class DailyTaskSerializer(TaskCommonSerializer):
    """
    Daily task serializer
    """

    task_durations = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()
    todo_list = TodoListSerializer(many=True, required=False, allow_null=True)
    categories = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "tags",
            "task_durations",
            "total_duration",
            "todo_list",
            "categories",
            "organization",
            "type",
        ]

    def get_type(self, obj):
        """Return type of model"""
        return CalendarTypes.TASK.value

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        if not obj.categories.exists():
            return []

        return get_common_categories_with_none_category(
            obj.categories.first(), obj
        )

    def get_task_durations(self, obj):
        """
        Handle get task duration
        """
        start_of_day = self.context.get("start_of_day")
        end_of_day = self.context.get("end_of_day")
        user = self.context.get("user")
        durations = _get_list_durations(obj, start_of_day, end_of_day, user)

        return DurationSerializer(
            durations,
            many=True,
            context={"start_of_day": start_of_day, "end_of_day": end_of_day},
        ).data

    def get_total_duration(self, obj):
        """
        Handle get total duration
        """
        start_of_day = self.context.get("start_of_day")
        end_of_day = self.context.get("end_of_day")
        tag_ids = self.context.get("tag_ids")
        user = self.context.get("user")
        durations = _get_list_durations(obj, start_of_day, end_of_day, user)

        total_duration = timedelta()
        # Calculate time between started and paused
        for task_duration in durations:
            paused_at = (
                task_duration.paused_at
                if task_duration.paused_at
                else timezone.now()
            )
            total_duration += paused_at - task_duration.started_at
        if tag_ids:
            related_tag_count = obj.tags.filter(id__in=tag_ids).count()
            total_duration = total_duration * related_tag_count
        # Format the output as desired (HH:MM:SS)
        return format_duration(total_duration)


class TotalDurationSerializer(DailyTaskSerializer):
    """
    Total duration serializer
    """

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "status",
            "tags",
            "task_durations",
            "total_duration",
            "todo_list",
            "categories",
        ]


class DailyEventSerializer(serializers.ModelSerializer):
    """
    Daily task serializer
    """

    task_durations = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField(read_only=True)
    tags = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "tags",
            "task_durations",
            "total_duration",
            "categories",
            "organization",
            "type",
        ]

    def get_tags(self, obj):
        """
        Handle sorted tags schedules id
        """
        sorted_tags = obj.tags.all().order_by("tags_schedules__id")
        return BaseTagSerializer(sorted_tags, many=True).data

    def get_type(self, obj):
        """Return type of model"""
        return CalendarTypes.SCHEDULE.value

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        if not obj.categories.exists():
            return []

        return get_common_categories_with_none_category(
            obj.categories.first(), obj
        )

    def get_task_durations(self, obj):
        """
        Handle get task duration
        """
        start_of_day = self.context.get("start_of_day")
        end_of_day = self.context.get("end_of_day")
        user = self.context.get("user")
        durations = _get_list_durations(obj, start_of_day, end_of_day, user)

        return DurationSerializer(
            durations,
            many=True,
            context={"start_of_day": start_of_day, "end_of_day": end_of_day},
        ).data

    def get_total_duration(self, obj):
        """
        Handle get total duration
        """
        start_of_day = self.context.get("start_of_day")
        end_of_day = self.context.get("end_of_day")
        tag_ids = self.context.get("tag_ids")
        user = self.context.get("user")
        durations = _get_list_durations(obj, start_of_day, end_of_day, user)

        total_duration = timedelta()
        # Calculate time between started and paused
        for task_duration in durations:
            paused_at = (
                task_duration.paused_at
                if task_duration.paused_at
                else timezone.now()
            )
            total_duration += paused_at - task_duration.started_at
        if tag_ids:
            related_tag_count = obj.tags.filter(id__in=tag_ids).count()
            total_duration = total_duration * related_tag_count
        # Format the output as desired (HH:MM:SS)
        return format_duration(total_duration)


class DurationDetailForPDFSerializer(ActualDurationListSerializer):
    """Actual duration detail serializer"""

    class Meta:
        model = TaskDuration
        fields = [
            "id",
            "title",
            "started_at",
            "paused_at",
        ]
