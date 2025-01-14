from datetime import timedelta, datetime, time

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from common.utils import format_duration, get_common_categories
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


def _get_list_durations(obj, start_of_day, end_of_day):
    """
    Handle get list durations
    """
    start_of_today = datetime.combine(timezone.now().date(), time.min)

    if start_of_today == start_of_day:
        return obj.task_durations.filter(
            Q(started_at__gte=start_of_day)
            & Q(Q(paused_at__lte=end_of_day) | Q(paused_at__isnull=True))
        ).all()
    else:
        return obj.task_durations.filter(
            Q(started_at__gte=start_of_day) & Q(paused_at__lte=end_of_day)
        ).all()


class DailyTaskSerializer(TaskCommonSerializer):
    """
    Daily task serializer
    """

    task_durations = serializers.SerializerMethodField()
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
        ]

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        if not obj.categories.exists():
            return []

        return get_common_categories(obj.categories.first())

    def get_task_durations(self, obj):
        """
        Handle get task duration
        """
        start_of_day = self.context.get("start_of_day")
        end_of_day = self.context.get("end_of_day")
        durations = _get_list_durations(obj, start_of_day, end_of_day)

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
        durations = _get_list_durations(obj, start_of_day, end_of_day)

        total_duration = timedelta()
        # Calculate time between started and paused
        for task_duration in durations:
            paused_at = (
                task_duration.paused_at
                if task_duration.paused_at
                else timezone.now()
            )
            total_duration += paused_at - task_duration.started_at

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
