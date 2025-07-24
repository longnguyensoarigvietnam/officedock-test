from django.db.models import Q
from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from calendars.models import EventLocation, Schedule, RepeatSchedule
from common.serializers import CreationDataUserSerializer
from common.utils import get_common_categories
from organizations.serializers import OrganizationSerializer
from skills.models import StatisticCategory
from tags.models import Tag
from tags.serializers import BaseTagSerializer
from tasks.constants import FrequencyMap
from users.models import User
from tasks.models import PeopleInChargeTasks, TaskSchedule, TaskDuration
from calendars.constants import CalendarTypes, ScheduleCategoryTypes
from calendars.utils import is_event_overlapping


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


class RepeatScheduleSerializer(serializers.ModelSerializer):
    """ "
    Serializer of repeat schedule
    """

    class Meta:
        model = RepeatSchedule
        fields = [
            "id",
            "uuid",
            "schedule",
            "plan_start_date",
            "plan_end_date",
        ]


class CheckScheduleOverlapSerializer(serializers.Serializer):
    """ "
    Serializer for check overlap time and location with another event
    """

    schedule_id = serializers.PrimaryKeyRelatedField(
        source="schedule",
        queryset=Schedule.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    location_id = serializers.PrimaryKeyRelatedField(
        source="location",
        queryset=EventLocation.objects.all(),
        write_only=True,
    )
    plan_start_date = serializers.DateTimeField()
    plan_end_date = serializers.DateTimeField()


class EventLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for event location
    """

    uuid = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = EventLocation
        fields = [
            "id",
            "uuid",
            "name",
        ]

    def validate(self, attrs):
        """
        Handle validate unique name in company
        """
        instance = self.instance
        request = self.context.get("request")
        company_id = (
            request.user.company_id if not instance else instance.company_id
        )
        name = attrs.get("name")

        queryset = EventLocation.objects.filter(
            company_id=company_id, name=name
        )

        if instance:
            queryset = queryset.exclude(id=instance.id)

        if queryset.exists():
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["unique_event_location_name"]}
            )

        return attrs


class ScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for Schedule model
    """

    participants = serializers.SerializerMethodField()
    participant_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        required=True,
    )
    tags = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
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
    send_to_chat = serializers.BooleanField(write_only=True, required=False)
    message = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    organization = OrganizationSerializer(read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(
        source="location",
        queryset=EventLocation.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    location = EventLocationSerializer(read_only=True)
    start_date = serializers.DateTimeField(allow_null=True, required=False)
    end_date = serializers.DateTimeField(allow_null=True, required=False)
    repeat_type = serializers.ChoiceField(
        choices=FrequencyMap.choices(),
        allow_null=True,
        required=False,
        default=FrequencyMap.ONCE.value,
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
    repeat_schedules = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "organization",
            "start_date",
            "end_date",
            "is_all_day",
            "tags",
            "categories",
            "category_ids",
            "tag_ids",
            "participants",
            "participant_ids",
            "location",
            "location_id",
            "memo",
            "type",
            "send_to_chat",
            "message",
            "is_start",
            "select_organizations",
            "repeat_interval",
            "repeat_type",
            "week_day",
            "month_day",
            "month",
            "repeat_schedules",
        ]
        read_only_fields = ["id"]

    def get_categories(self, obj):
        """Handle retrieving categories of a Task."""
        return get_common_categories(obj.categories.first(), obj)

    def validate(self, data):
        """
        Validation data
        """
        request = self.context.get("request")
        participants = data.get("participant_ids", [])
        tags = data.get("tag_ids", [])

        for tag in tags:
            if not tag.get_calendar_organization():
                raise serializers.ValidationError()

        for participant in participants:
            if participant.company_id != request.user.company_id:
                raise serializers.ValidationError(
                    {
                        "participant_ids": {
                            participant.id: ERROR_MESSAGES["company_not_match"]
                        }
                    }
                )

        return data

    def get_tags(self, obj):
        """
        Handle sorted tags schedules id
        """
        sorted_tags = obj.tags.all().order_by("tags_schedules__id")
        return BaseTagSerializer(sorted_tags, many=True).data

    def get_participants(self, obj):
        """
        Handle sorted participants schedules id
        """
        sorted_participants = obj.participants.all().order_by(
            "participants_schedules__id"
        )
        return CreationDataUserSerializer(sorted_participants, many=True).data

    def get_repeat_schedules(self, obj):
        """
        Handle get repeat schedules
        """
        request = self.context.get("request")
        if request.query_params.get("start_date") and request.query_params.get(
            "end_date"
        ):
            start_date = request.query_params.get("start_date")
            end_date = request.query_params.get("end_date")
            repeat_schedules = obj.repeat_schedules.filter(
                Q(plan_start_date__lte=end_date)
                & Q(plan_end_date__gte=start_date)
            ).all()
        else:
            repeat_schedules = obj.repeat_schedules.all()

        return RepeatScheduleSerializer(repeat_schedules, many=True).data


class BaseScheduleSerializer(ScheduleSerializer):
    """
    Handle return base schedule data
    """

    type = serializers.SerializerMethodField()
    event_type = serializers.SerializerMethodField()
    is_my_schedule = serializers.SerializerMethodField()
    is_start = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "start_date",
            "end_date",
            "is_all_day",
            "location",
            "type",
            "is_my_schedule",
            "participants",
            "is_start",
            "event_type",
            "categories",
            "select_organizations",
            "repeat_schedules",
        ]

    def to_representation(self, instance):
        """
        Custom data before return
        """
        representation = super().to_representation(instance)

        if recurring := instance.recurring:
            fields = [
                "start_date",
                "end_date",
                "repeat_type",
                "repeat_interval",
                "week_day",
                "month_day",
                "month",
            ]
            for field in fields:
                representation[field] = recurring.get(field)
        return representation

    def get_is_start(self, instance):
        """
        Return is_start if user is running this task
        """
        request = self.context.get("request")
        if user := request.user:
            return TaskDuration.objects.filter(
                schedule=instance, user=user, paused_at__isnull=True
            ).exists()

        return False

    def get_type(self, obj):
        """
        Return SCHEDULE type of calendar
        """
        return CalendarTypes.SCHEDULE.value

    def get_event_type(self, obj):
        """
        Return event type
        """
        return obj.type

    def get_is_my_schedule(self, instance):
        """
        Return True if schedule is my schedule, otherwise return False.
        """
        request = self.context.get("request")

        if user := request.user:
            return instance.participants_schedules.filter(user=user).exists()

        return False


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

    def validate(self, attrs):
        # Retrieve values from validated data
        plan_start_date = attrs.get("plan_start_date")
        plan_end_date = attrs.get("plan_end_date")
        if (
            plan_start_date
            and plan_end_date
            and plan_start_date >= plan_end_date
        ):
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
            )

        return attrs


class PeopleInChargeSerializer(serializers.ModelSerializer):
    """
    Serializer for creation data person in charge.
    """

    full_name = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()

    class Meta:
        model = PeopleInChargeTasks
        fields = ["id", "full_name"]

    def get_full_name(self, obj):
        """
        Return full name of user.
        """
        return obj.user.profile.full_name

    def get_id(self, obj):
        """
        Return id of user.
        """
        return obj.user.id


class TaskScheduleForCalendarSerializer(serializers.ModelSerializer):
    """
    Serializer for Task calendar
    """

    id = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    deadline = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    task_schedules = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()

    class Meta:
        model = TaskSchedule
        fields = [
            "id",
            "deadline",
            "title",
            "task_schedules",
            "participants",
            "type",
        ]
        read_only_fields = ["id"]

    def get_type(self, obj):
        """
        Return TASK type of calendar
        """
        return CalendarTypes.TASK.value

    def get_participants(self, obj):
        """
        Return participants of task
        """
        people = obj.task.people_in_charge_tasks.all()
        return PeopleInChargeSerializer(people, many=True, read_only=True).data

    def get_task_schedules(self, obj):
        """Handle get task schedules"""
        return [TaskScheduleSerializer(obj).data]

    def get_title(self, obj):
        """Return title of task"""
        return obj.task.title

    def get_deadline(self, obj):
        """Return deadline of task"""
        return obj.task.deadline

    def get_id(self, obj):
        """Return id of task"""
        return obj.task.id


class ScheduleTeamdockSerializer(BaseScheduleSerializer):
    """
    Serializer for schedule in teamdock
    """

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "start_date",
            "end_date",
            "is_all_day",
            "type",
            "participants",
            "is_start",
            "event_type",
            "categories",
        ]


class ScheduleDetailSerializer(ScheduleSerializer):
    """
    Serializer for schedule detail
    """

    repeat_schedules = serializers.SerializerMethodField(read_only=True)
    is_event_overlapping = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Schedule
        fields = [
            "id",
            "title",
            "organization",
            "start_date",
            "end_date",
            "is_all_day",
            "location",
            "type",
            "participants",
            "is_start",
            "categories",
            "select_organizations",
            "memo",
            "repeat_schedules",
            "is_event_overlapping",
            "tags",
            "created_at",
        ]

    def to_representation(self, instance):
        """
        Custom data before return
        """
        representation = super().to_representation(instance)

        if recurring := instance.recurring:
            fields = [
                "start_date",
                "end_date",
                "repeat_type",
                "repeat_interval",
                "week_day",
                "month_day",
                "month",
            ]
            for field in fields:
                representation[field] = recurring.get(field)
        return representation

    def get_repeat_schedules(self, obj):
        """
        Handle get repeat schedules
        """
        request = self.context.get("request")
        if repeat_id := request.query_params.get("repeat_schedule_id"):
            repeat_schedule = obj.repeat_schedules.filter(id=repeat_id).first()
            return RepeatScheduleSerializer(repeat_schedule).data
        return None

    def get_is_event_overlapping(self, obj: Schedule) -> bool:
        """
        Check if a schedule overlaps with existing events at a given location and time period.
        """
        if not obj.location_id:
            return False

        request = self.context.get("request")
        if not request:
            return False

        # Handle recurring event case
        if repeat_id := request.query_params.get("repeat_schedule_id"):
            repeat_schedule = obj.repeat_schedules.filter(id=repeat_id).first()
            if not repeat_schedule:
                return False

            return is_event_overlapping(
                instance=obj,
                location=obj.location_id,
                start_date=repeat_schedule.plan_start_date,
                end_date=repeat_schedule.plan_end_date,
            )

        return False
