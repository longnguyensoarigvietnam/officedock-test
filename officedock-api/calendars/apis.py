from datetime import datetime, time, timedelta

from dateutil import rrule
from django.db import transaction
from django.db.models import Q, QuerySet
from django.utils import timezone
from django.utils.timezone import make_aware, now
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework import viewsets, mixins, status, filters
from rest_framework.decorators import action

from base.apis import BaseAPIViewSet
from calendars.constants import (
    ScheduleFields,
    CalendarTypes,
    ScheduleRepeatOption,
)
from calendars.models import EventLocation, Schedule, RepeatSchedule
from calendars.filters import TaskScheduleForCalendarFilter
from calendars.serializers import (
    CheckScheduleOverlapSerializer,
    EventLocationSerializer,
    ScheduleSerializer,
    BaseScheduleSerializer,
    ScheduleTeamdockSerializer,
    TaskScheduleForCalendarSerializer,
    ScheduleDetailSerializer,
)
from calendars.utils import is_event_overlapping
from chat.constants import ChatRoomTypes, ChatMessageTypes, WebSocketEventType
from chat.models import ChatRoom
from chat.serializers import (
    ChatRoomsParticipantsWebSocketSerializer,
    ChatMessageSerializer,
)
from common.utils import (
    send_web_socket_event,
    create_categories_by_model,
    get_common_categories,
    split_id_from_string,
    check_task_overtime,
)
from tasks.models import TaskSchedule, TaskDuration, Task
from base.permissions import ActionPermission
from roles.constants import Screens
from common.serializers import CreationDataUserSerializer
from tasks.constants import FrequencyMap, LIMIT_DAY
from organizations.models import Organization


@extend_schema(tags=["System > Schedule"])
class ScheduleViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    Endpoint API of Schedule
    """

    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [
        ActionPermission,
    ]
    pagination_class = None
    screen_name = Screens.CALENDAR.value
    filter_backends = [filters.SearchFilter]
    search_fields = ["title"]

    def get_queryset(self):
        """
        Filtering schedule by company.
        """
        user = self.request.user
        queryset = super().get_queryset().filter(company_id=user.company_id)
        if self.action in ["list", "retrieve"]:
            queryset = queryset.filter(deleted_at__isnull=True)

        return queryset.order_by("created_at")

    def get_serializer(self, *args, **kwargs):
        """
        Handle get serializer.
        """
        if self.action == "list":
            return BaseScheduleSerializer(
                *args, **kwargs, context={"request": self.request}
            )

        return super().get_serializer(*args, **kwargs)

    def get_serializer_context(self):
        """
        Add request to context
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Perform to create a new schedule.
        """
        serializer_data = serializer.validated_data
        participants = serializer_data.pop("participant_ids", None)
        send_to_chat = serializer_data.pop("send_to_chat", None)
        schedule_message = serializer_data.pop("message", None)
        client_id = self.request.data.pop("client_id", None)
        tags = serializer_data.pop("tag_ids", None)
        categories = serializer_data.pop("category_ids", None)
        user = self.request.user
        company = user.company
        # Item for loop schedule
        start_date = serializer_data.pop("start_date", None)
        end_date = serializer_data.pop("end_date", None)
        repeat_type = serializer_data.pop("repeat_type", None)
        repeat_interval = serializer_data.pop("repeat_interval", None)
        week_day = serializer_data.pop("week_day", None)
        month_day = serializer_data.pop("month_day", None)
        month = serializer_data.pop("month", None)

        if repeat_type:
            serializer_data["recurring"] = {
                "repeat_type": repeat_type,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "repeat_interval": repeat_interval,
                "week_day": week_day,
                "month_day": month_day,
                "month": month,
            }
            serializer_data["recurring_option"] = (
                ScheduleRepeatOption.THIS_AND_FOLLOWING_EVENTS.value
                if repeat_type != FrequencyMap.ONCE.value
                else ScheduleRepeatOption.THIS_EVENT.value
            )
        # Set default calendar organization
        serializer_data["organization"] = company.get_calendar_organization()
        schedule = serializer.save(company=company, creator_id=user.id)

        if participants is not None:
            data = self._generate_chat_data(
                schedule.recurring,
                participants,
                user.id,
            )

            for participant in participants:
                if send_to_chat and user != participant:
                    self._send_chat_message(
                        user,
                        participant,
                        company,
                        schedule,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.CREATION_SCHEDULE.value,
                    )
                if send_to_chat:
                    self._send_to_calendar_room(
                        user,
                        participant,
                        schedule,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.CREATION_SCHEDULE.value,
                    )
                schedule.participants.add(
                    participant, through_defaults={"company": company}
                )

        if tags is not None:
            self._create_or_update_tag(schedule, tags)

        if categories is not None:
            create_categories_by_model(schedule, categories)

        # Create repeat schedule base on repeat type
        if repeat_type:
            self._generate_repeat_schedules(
                schedule,
                start_date,
                repeat_type,
                repeat_interval,
                week_day,
                month_day,
                end_date,
                month,
            )

    def _generate_repeat_schedules(
        self,
        schedule,
        start_date,
        repeat_type,
        repeat_interval=1,
        weekday=None,
        month_day=None,
        end_date=None,
        month=None,
        old_recurring=None,
        repeat_schedule=None,
    ):
        """
        Handle loop task and store in task schedule
        """
        start_date = (
            make_aware(start_date)
            if isinstance(start_date, datetime)
            else now()
        )

        if schedule.repeat_schedules.exists() or not old_recurring:
            if not repeat_schedule:
                schedule.repeat_schedules.all().delete()
            else:
                schedule.repeat_schedules.filter(
                    id__gte=repeat_schedule.id
                ).all().delete()

        if repeat_type == FrequencyMap.ONCE.value:
            RepeatSchedule.objects.create(
                schedule=schedule,
                company_id=schedule.company_id,
                plan_start_date=start_date,
                plan_end_date=end_date,
            )
            return
        end_time = end_date.timetz()

        # Make rule repeat
        rule_params = {
            "freq": FrequencyMap.to_rrule(FrequencyMap[repeat_type]),
            "interval": repeat_interval,
            "dtstart": start_date,
        }

        if repeat_type == FrequencyMap.WEEKLY.value and weekday is not None:
            rule_params["byweekday"] = weekday
            days_ahead = (weekday - start_date.weekday()) % 7
            rule_params["dtstart"] = start_date + timedelta(days=days_ahead)
        elif (
            repeat_type == FrequencyMap.MONTHLY.value and month_day is not None
        ):
            rule_params["bymonthday"] = month_day
            if month_day >= start_date.day:
                rule_params["dtstart"] = start_date.replace(day=month_day)
            else:
                rule_params["dtstart"] = start_date.replace(
                    day=month_day
                ) + timedelta(days=30)
        elif (
            repeat_type == FrequencyMap.YEARLY.value
            and month is not None
            and month_day is not None
        ):
            rule_params["bymonth"] = month
            if month >= start_date.month:
                rule_params["dtstart"] = start_date.replace(
                    day=month_day, month=month
                )
            else:
                rule_params["dtstart"] = start_date.replace(
                    day=month_day, month=month
                ) + timedelta(days=LIMIT_DAY + 1)

        rule_params["until"] = (
            rule_params["dtstart"] + timedelta(days=LIMIT_DAY)
            if repeat_type != FrequencyMap.YEARLY.value
            else rule_params["dtstart"]
        )  # Set default end_date is 1 year
        rule = rrule.rrule(**rule_params)
        schedules = []

        for occurrence in rule:
            plan_end_date = datetime.combine(
                occurrence.date(), end_time, occurrence.tzinfo
            )
            schedules.append(
                RepeatSchedule(
                    schedule=schedule,
                    company_id=schedule.company_id,
                    plan_start_date=occurrence,
                    plan_end_date=plan_end_date,
                )
            )

        RepeatSchedule.objects.bulk_create(schedules)

    def _create_or_update_tag(self, schedule, tags):
        """
        Handle create or update tag of schedule
        """
        schedule.tags.clear()
        for tag in tags:
            schedule.tags.add(
                tag, through_defaults={"company_id": schedule.company_id}
            )

    def _compare_objects(self, list_object, queryset_object):
        """
        Compares an object with a QuerySet.
        """
        if list_object is None or queryset_object is None:
            return False
        # Convert QuerySet to list for efficient comparison
        if isinstance(queryset_object, QuerySet):
            queryset_object = list(queryset_object)

        # Check if lengths are equal
        if len(list_object) != len(queryset_object):
            return False

        # Compare elements using set equality
        return set(list_object) == set(queryset_object)

    def _compare_category(self, list_categories, queryset_category):
        """
        Compare category and return bool
        """
        if list_categories is None or queryset_category is None:
            return False

        transformed_categories = [
            {"name": category["name"], "type": category["type"]}
            for category in get_common_categories(queryset_category)
        ]
        categories_list_sorted = sorted(
            transformed_categories, key=lambda x: x["name"]
        )
        transformed_input_categories = [
            {
                "name": category["statistic_category"].name,
                "type": category["type"],
            }
            for category in list_categories
            if category.get("statistic_category") is not None
        ]
        other_list_sorted = sorted(
            transformed_input_categories,
            key=lambda x: x["name"],
        )

        return categories_list_sorted == other_list_sorted

    def _get_field_changes(
        self,
        instance,
        validated_data,
        participants,
        tags,
        categories,
        recurring_change=False,
    ):
        """
        Handle get field changes between instance and validated data.
        """
        changes = []
        if recurring_change:
            changes.append(ScheduleFields.DURATION.value)

        if not self._compare_objects(participants, instance.participants.all()):
            changes.append(ScheduleFields.PARTICIPANTS.value)

        if not self._compare_objects(tags, instance.tags.all()):
            changes.append(ScheduleFields.TAG.value)

        if not self._compare_category(categories, instance.categories.first()):
            changes.append(ScheduleFields.CATEGORY.value)

        for field_name, new_value in validated_data.items():
            old_value = getattr(instance, field_name)
            if (
                new_value != old_value
                and field_name != "start_date"
                and field_name != "end_date"
                and field_name != "recurring"
                and field_name != "select_organizations"
            ):
                changes.append(
                    ScheduleFields.__members__[field_name.upper()].value
                )

        return changes

    def _handle_recurring_event_option(
        self,
        recurring_event_option,
        serializer_data,
        instance,
        user,
        recurring,
    ):
        """
        Handle schedule by recurring event option
        """
        parent = instance.parent or instance
        new_data = dict(serializer_data)
        new_data["recurring_option"] = recurring_event_option
        # Copy instance and create new
        new_data["creator_id"] = instance.creator_id
        new_data["organization"] = instance.organization
        new_data["company_id"] = user.company_id
        new_data["recurring"] = recurring
        if recurring_event_option == ScheduleRepeatOption.ALL_EVENTS.value:
            Schedule.objects.filter(id=parent.id).update(**new_data)
            parent.refresh_from_db()
            return parent
        else:
            # Create new instance
            return Schedule.objects.create(**new_data)

    def _handle_update_duration_and_remove_repeat_schedules(
        self, new_schedule, recurring_event_option, repeat_schedule
    ):
        """
        Handle update duration of all schedules behind current schedule and destroy it.
        """
        parent_schedule = new_schedule.parent or new_schedule
        if (
            recurring_event_option
            == ScheduleRepeatOption.THIS_AND_FOLLOWING_EVENTS.value
        ):
            child_schedules = parent_schedule.child_schedules.values_list(
                "id", flat=True
            )
            schedule_ids = list(child_schedules) + [parent_schedule.id]

            schedules = (
                RepeatSchedule.objects.filter(
                    id__gte=repeat_schedule.id, schedule__in=schedule_ids
                )
                .exclude(schedule=new_schedule)
                .values_list("schedule__id", flat=True)
                .distinct()
            )
            remove_schedules = Schedule.objects.filter(id__in=schedules).all()
            for child in remove_schedules:
                child.repeat_schedules.filter(
                    id__gte=repeat_schedule.id
                ).update(schedule=new_schedule)
                # Remove child if in repeat range of new schedule
                if not child.repeat_schedules.filter(
                    id__lt=repeat_schedule.id
                ).exists():
                    child.task_durations.update(schedule=new_schedule)
                    child.task_durations.filter(paused_at__isnull=True).update(
                        paused_at=now()
                    )
                    if child == parent_schedule:
                        new_schedule.parent = None
                        new_schedule.save()
                    child.delete()
        elif recurring_event_option == ScheduleRepeatOption.ALL_EVENTS.value:
            remove_schedules = parent_schedule.child_schedules.all()
            for child in remove_schedules:
                child.repeat_schedules.update(schedule=parent_schedule)
                child.task_durations.update(schedule=parent_schedule)
                child.task_durations.filter(paused_at__isnull=True).update(
                    paused_at=now()
                )
                child.delete()

    @transaction.atomic()
    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        company = user.company
        serializer_data = serializer.validated_data
        send_to_chat = serializer_data.pop("send_to_chat", None)
        schedule_message = serializer_data.pop("message", None)
        participants = serializer_data.pop("participant_ids", None)
        tags = serializer_data.pop("tag_ids", None)
        categories = serializer_data.pop("category_ids", None)
        client_id = self.request.data.pop("client_id", None)
        # Item for loop schedule
        start_date = serializer_data.pop("start_date", None)
        end_date = serializer_data.pop("end_date", None)
        repeat_type = serializer_data.pop("repeat_type", None)
        repeat_interval = serializer_data.pop("repeat_interval", None)
        week_day = serializer_data.pop("week_day", None)
        month_day = serializer_data.pop("month_day", None)
        month = serializer_data.pop("month", None)
        recurring_event_option = serializer_data.pop(
            "recurring_event_option", None
        )
        repeat_schedule = serializer_data.pop("repeat_schedule", None)
        old_recurring = instance.recurring
        recurring = old_recurring

        is_change_recurring = (
            old_recurring["repeat_type"] != repeat_type
            or old_recurring["repeat_interval"] != repeat_interval
        )
        if recurring_event_option == ScheduleRepeatOption.ALL_EVENTS.value:
            start_date = (
                instance.repeat_schedules.first().plan_start_date
                if instance.repeat_schedules.exists()
                else start_date
            )
            end_date = (
                (instance.repeat_schedules.first().plan_end_date)
                if instance.repeat_schedules.exists()
                else end_date
            )
        if repeat_type and is_change_recurring:
            recurring = {
                "repeat_type": repeat_type,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "repeat_interval": repeat_interval,
                "week_day": week_day,
                "month_day": month_day,
                "month": month,
            }
            serializer_data["recurring"] = recurring
        if not instance.organization:
            # Set default calendar organization
            serializer_data[
                "organization"
            ] = company.get_calendar_organization()
        data = []
        if participants and send_to_chat:
            data = self._generate_chat_data(
                recurring,
                participants,
                instance.creator_id if instance.creator_id else user.id,
            )
            data["field_changes"] = self._get_field_changes(
                instance,
                serializer_data,
                participants,
                tags,
                categories,
                recurring_change=recurring != old_recurring,
            )
            if recurring != old_recurring:
                data["old"] = old_recurring

        is_have_recurring = (
            repeat_type != FrequencyMap.ONCE.value and recurring_event_option
        )
        is_difference_repeat_date = (
            repeat_schedule != instance.repeat_schedules.first()
        )
        is_difference_repeat_option = (
            recurring_event_option != instance.recurring_option
        )
        if recurring_event_option == ScheduleRepeatOption.ALL_EVENTS.value:
            serializer_data["recurring_option"] = recurring_event_option
            # Saving schedule
            instance = self._handle_recurring_event_option(
                recurring_event_option,
                serializer_data,
                instance,
                user,
                recurring,
            )
        elif (
            is_have_recurring
            and recurring_event_option
            and (is_difference_repeat_option or is_difference_repeat_date)
        ):
            serializer_data["parent"] = instance.parent or instance
            instance = self._handle_recurring_event_option(
                recurring_event_option,
                serializer_data,
                instance,
                user,
                recurring,
            )
            serializer.instance = instance
        else:
            serializer.save()

        if participants is not None:
            old_participants = instance.participants.all()
            removed_users = [
                user for user in old_participants if user not in participants
            ]
            # Stop duration of removed user
            TaskDuration.objects.filter(
                user__in=removed_users,
                schedule=instance,
                paused_at__isnull=True,
            ).update(paused_at=timezone.now())
            instance.participants.clear()
            for participant in participants:
                if send_to_chat and user != participant:
                    self._send_chat_message(
                        user,
                        participant,
                        company,
                        instance,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.EDIT_SCHEDULE.value,
                    )
                if send_to_chat:
                    self._send_to_calendar_room(
                        user,
                        participant,
                        instance,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.EDIT_SCHEDULE.value,
                    )

                instance.participants.add(
                    participant, through_defaults={"company": company}
                )

        if tags is not None:
            self._create_or_update_tag(instance, tags)

        if categories is not None:
            create_categories_by_model(instance, categories)

        # Check is event run overtime or not
        start_of_today = datetime.combine(timezone.now().date(), time.min)
        task_duration = TaskDuration.objects.filter(
            started_at__gte=start_of_today,
            paused_at__isnull=True,
            schedule=instance,
        ).first()
        if task_duration:
            is_send_sk, is_over_estimate = check_task_overtime(
                instance, task_duration
            )
            if is_send_sk:
                for user in instance.participants.all():
                    send_web_socket_event(
                        {
                            "id": instance.id,
                            "task_duration_running_uuid": str(
                                task_duration.uuid
                            ),
                            "is_over_estimate": is_over_estimate,
                            "action": WebSocketEventType.DURATION_OVERTIME_WARNING.value,
                            "type": CalendarTypes.SCHEDULE.value,
                        },
                        user=user,
                    )
        if recurring_event_option in [
            ScheduleRepeatOption.THIS_AND_FOLLOWING_EVENTS.value,
            ScheduleRepeatOption.ALL_EVENTS.value,
        ]:
            self._handle_update_duration_and_remove_repeat_schedules(
                instance, recurring_event_option, repeat_schedule
            )

        if (
            repeat_type
            and recurring_event_option == ScheduleRepeatOption.THIS_EVENT.value
        ):
            repeat_schedule.schedule = instance
            repeat_schedule.save()
        # Create repeat schedule base on repeat type
        if repeat_type and is_change_recurring:
            instance.parent = None
            instance.save()
            self._generate_repeat_schedules(
                instance,
                start_date,
                repeat_type,
                repeat_interval,
                week_day,
                month_day,
                end_date,
                month,
                old_recurring,
            )

    @transaction.atomic()
    @extend_schema(
        parameters=[
            OpenApiParameter("repeat_schedule_id", type=int),
            OpenApiParameter("send_to_chat", type=bool),
            OpenApiParameter("message", type=str),
            OpenApiParameter(
                "recurring_event_option",
                type=str,
                enum=[
                    ScheduleRepeatOption.THIS_EVENT.value,
                    ScheduleRepeatOption.ALL_EVENTS.value,
                    ScheduleRepeatOption.THIS_AND_FOLLOWING_EVENTS.value,
                ],
                required=False,
            ),
        ]
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        company = user.company
        repeat_schedule_id = request.query_params.get("repeat_schedule_id")
        send_to_chat = request.query_params.get("send_to_chat", None)
        schedule_message = request.query_params.get("message", None)
        recurring_event_option = request.query_params.get(
            "recurring_event_option", None
        )
        participants = instance.participants.all()
        client_id = request.data.pop("client_id", None)

        if participants is not None and send_to_chat:
            data = self._generate_chat_data(
                instance.recurring,
                participants,
                instance.creator_id if instance.creator_id else user.id,
            )
            for participant in participants:
                if user != participant:
                    self._send_chat_message(
                        user,
                        participant,
                        company,
                        instance,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.REMOVE_SCHEDULE.value,
                    )
                else:
                    self._send_to_calendar_room(
                        user,
                        participant,
                        instance,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.REMOVE_SCHEDULE.value,
                    )
        if recurring_event_option in [
            ScheduleRepeatOption.THIS_AND_FOLLOWING_EVENTS.value,
            ScheduleRepeatOption.ALL_EVENTS.value,
        ]:
            parent_schedule = instance.parent or instance
            if (
                recurring_event_option
                == ScheduleRepeatOption.THIS_AND_FOLLOWING_EVENTS.value
            ):
                child_schedules = parent_schedule.child_schedules.values_list(
                    "id", flat=True
                )
                schedule_ids = list(child_schedules) + [parent_schedule.id]

                schedules = (
                    RepeatSchedule.objects.filter(
                        id__gte=repeat_schedule_id, schedule__in=schedule_ids
                    )
                    .exclude(schedule=instance)
                    .values_list("schedule__id", flat=True)
                    .distinct()
                )
                remove_schedules = Schedule.objects.filter(
                    id__in=schedules
                ).all()
                for child in remove_schedules:
                    child.repeat_schedules.filter(
                        id__gte=repeat_schedule_id
                    ).delete()
                    # Remove child if in repeat range of new schedule
                    if not child.repeat_schedules.filter(
                        id__lt=repeat_schedule_id
                    ).exists():
                        child.task_durations.update(schedule=instance)
                        child.task_durations.filter(
                            paused_at__isnull=True
                        ).update(paused_at=now())
                        child.delete()
                instance.repeat_schedules.filter(
                    id__gte=repeat_schedule_id
                ).delete()
                if instance.repeat_schedules.count() == 0:
                    self._soft_delete_if_needed(instance)
            elif (
                recurring_event_option == ScheduleRepeatOption.ALL_EVENTS.value
            ):
                remove_schedules = parent_schedule.child_schedules.all()
                for child in remove_schedules:
                    self._soft_delete_if_needed(child)

                self._soft_delete_if_needed(instance)
        elif (
            repeat_schedule_id
            and recurring_event_option == ScheduleRepeatOption.THIS_EVENT.value
        ):
            if instance.repeat_schedules.count() == 1:
                self._soft_delete_if_needed(instance)
            else:
                instance.repeat_schedules.filter(id=repeat_schedule_id).delete()

        return self.response(status_code=status.HTTP_204_NO_CONTENT)

    def _soft_delete_if_needed(self, schedule):
        if schedule.task_durations.exists():
            schedule.task_durations.filter(paused_at__isnull=True).update(
                paused_at=now()
            )
            schedule.is_start = False
            schedule.save()
            schedule.soft_delete()
        else:
            self.perform_destroy(schedule)

    def _generate_chat_data(self, recurring, users, creator_id=None):
        """
        Generate chat data for sending messages on schedule changes.
        """
        return {
            "new": recurring,
            "participants": [
                {
                    "id": user.id,
                    "name": user.profile.full_name,
                    "is_creator": user.id == creator_id,
                }
                for user in users
            ],
        }

    def _send_to_calendar_room(
        self,
        sender,
        user,
        schedule,
        chat_data,
        schedule_message,
        client_id,
        type,
    ):
        """
        Send a chat message to participants regarding the schedule change.
        """
        calendar_room_participant = (
            user.chat_rooms_participants.filter(
                chat_room__type=ChatRoomTypes.CALENDAR.value
            )
            .select_related("chat_room")
            .first()
        )
        if not calendar_room_participant:
            return
        chat_room = calendar_room_participant.chat_room
        calendar_room_participant.unread_messages += 1
        calendar_room_participant.save(update_fields=["unread_messages"])

        action = WebSocketEventType.MESSAGE.value

        message_data = {
            "sender": sender,
            "company": user.company,
            "schedule": schedule,
            "type": type,
            "schedule_changes": chat_data,
        }
        if schedule_message and schedule_message != "":
            message_data["message"] = schedule_message

        message_obj = chat_room.chat_messages.create(**message_data)
        # Send WebSocket event for real-time updates
        send_web_socket_event(
            {
                "client_id": client_id,
                "action": action,
                "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                    calendar_room_participant
                ).data,
                "chat_message": ChatMessageSerializer(message_obj).data,
            },
            user,
        )

    def _send_chat_message(
        self,
        user,
        participant,
        company,
        schedule,
        chat_data,
        schedule_message,
        client_id,
        type,
    ):
        """
        Send a chat message to participants regarding the schedule change.
        """
        chat_room_participant = (
            participant.chat_rooms_participants.filter(
                chat_room__type=ChatRoomTypes.PRIVATE.value,
                chat_room__participants=user,
            )
            .select_related("chat_room")
            .first()
        )

        action = WebSocketEventType.MESSAGE.value
        if chat_room_participant:
            chat_room = chat_room_participant.chat_room
            if chat_room_participant.hidden_at is not None:
                chat_room_participant.hidden_at = None
        else:
            chat_room = ChatRoom.objects.create(
                company=company, type=ChatRoomTypes.PRIVATE.value
            )
            chat_room.participants.set(
                [user, participant],
                through_defaults={"company": company},
            )
            action = WebSocketEventType.CREATE_CHAT_ROOM.value
            chat_room_participant = chat_room.chat_rooms_participants.filter(
                user=participant
            ).first()

        chat_room_participant.unread_messages += 1
        chat_room_participant.save(
            update_fields=["unread_messages", "hidden_at"]
        )

        message_data = {
            "sender": user,
            "company": company,
            "schedule": schedule,
            "type": type,
            "schedule_changes": chat_data,
        }
        if schedule_message and schedule_message != "":
            message_data["message"] = schedule_message

        message_obj = chat_room.chat_messages.create(**message_data)
        # Update unread message of user logged
        user_participant = chat_room.chat_rooms_participants.filter(
            user=user
        ).first()
        user_participant.unread_messages += 1
        user_participant.save(update_fields=["unread_messages"])

        # Serializer data
        chat_room_participant_serializer_data = (
            ChatRoomsParticipantsWebSocketSerializer(chat_room_participant).data
        )
        chat_room_user_serializer_data = (
            ChatRoomsParticipantsWebSocketSerializer(user_participant).data
        )
        chat_message_serializer_data = ChatMessageSerializer(message_obj).data

        # Send WebSocket event for real-time updates
        send_web_socket_event(
            {
                "client_id": client_id,
                "action": action,
                "chat_room": chat_room_participant_serializer_data,
                "chat_message": chat_message_serializer_data,
            },
            participant,
        )
        if user_participant:
            # Handle case realtime when send chat message to logged user
            send_web_socket_event(
                {
                    "client_id": None,
                    "action": action,
                    "chat_room": chat_room_user_serializer_data,
                    "chat_message": chat_message_serializer_data,
                },
                user,
            )
            # Check if user logged hide chat room, send websocket show it
            if user_participant.hidden_at is not None:
                user_participant.hidden_at = None
                user_participant.save(update_fields=["hidden_at"])
                send_web_socket_event(
                    {
                        "action": WebSocketEventType.SHOW_ROOM.value,
                        "chat_room": chat_room_user_serializer_data,
                        "chat_message": chat_message_serializer_data,
                    },
                    user,
                )

    @extend_schema(
        parameters=[
            OpenApiParameter("user_ids", type=str),
            OpenApiParameter("start_date", type=datetime),
            OpenApiParameter("end_date", type=datetime),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Get the schedules
        """
        queryset = self.filter_queryset(self.get_queryset())
        user_ids = self.request.query_params.get("user_ids")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(
                Q(repeat_schedules__plan_start_date__gte=start_date)
                | Q(repeat_schedules__plan_end_date__gte=start_date)
            )
        if end_date:
            queryset = queryset.filter(
                Q(repeat_schedules__plan_start_date__lte=end_date)
                | Q(repeat_schedules__plan_end_date__lte=end_date)
            )

        if user_ids:
            user_ids = user_ids.split(",")
            queryset = queryset.filter(participants__id__in=user_ids).distinct()
        else:
            queryset = queryset.none()

        return self.response_ok(
            BaseScheduleSerializer(
                queryset, many=True, context={"request": request}
            ).data
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("repeat_schedule_id", type=int, required=False),
        ]
    )
    def retrieve(self, request, *args, **kwargs):
        """
        Handle updating the count of task usage by the user.
        """
        schedule = self.get_object()

        return self.response_ok(
            ScheduleDetailSerializer(
                schedule,
                context={
                    "request": request,
                },
            ).data
        )

    @action(
        methods=["POST"],
        detail=False,
        url_path="check-overlapping",
        serializer_class=CheckScheduleOverlapSerializer,
    )
    def check_event_overlapping(self, request):
        """
        Check if a schedule overlaps with existing events at a given location and time period.
        """
        # Validate and deserialize the incoming request data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        # Extract validated parameters from the request
        schedule = validated_data.pop("schedule", None)
        location = validated_data.pop("location")
        plan_start_date = validated_data.pop("plan_start_date")
        plan_end_date = validated_data.pop("plan_end_date")

        return self.response_ok(
            {
                "is_event_overlapping": is_event_overlapping(
                    schedule, location, plan_start_date, plan_end_date
                )
            }
        )


@extend_schema(tags=["System > Teamdock > Schedule"])
class ScheduleTeamdockViewSet(BaseAPIViewSet):
    """
    API endpoint for Schedule teamdock
    """

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=str, required=True),
            OpenApiParameter("user_ids", type=str),
            OpenApiParameter("start_date", type=datetime),
            OpenApiParameter("end_date", type=datetime),
            OpenApiParameter("search", type=str),
            OpenApiParameter("tag_ids", type=str),
            OpenApiParameter("category_ids", type=str),
            OpenApiParameter("organization_ids", type=str),
            OpenApiParameter("is_cross_team_task", type=bool),
        ],
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                response=ScheduleTeamdockSerializer(many=True)
            )
        },
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="plan",
        serializer_class=ScheduleTeamdockSerializer,
    )
    @transaction.atomic()
    def teamdock_plan(self, request):
        """
        Get list plan of schedules + tasks in teamdock.
        """
        company = request.user.company
        calendar_org = company.get_calendar_organization()
        params = request.query_params
        organization_id = params.get("organization_id")
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        search = params.get("search")
        user_ids = params.get("user_ids")
        tag_ids = params.get("tag_ids")
        category_ids = params.get("category_ids")
        organization_ids = params.get("organization_ids")
        is_cross_team_task_param = (
            params.get("is_cross_team_task", "").lower() == "true"
        )

        if is_cross_team_task_param:
            # Get all organization_ids that users in this organization belong to (cross-team)
            org_ids = (
                Organization.objects.filter(
                    users__organizations__id=organization_id
                )
                .values_list("id", flat=True)
                .distinct()
            )
        else:
            org_ids = [organization_id]

        # Query data tasks and schedules
        plan_schedules = RepeatSchedule.objects.select_related(
            "schedule"
        ).filter(
            schedule__organization_id=calendar_org.id if calendar_org else None,
            schedule__deleted_at__isnull=True,
            company=company,
        )
        task_schedules = TaskSchedule.objects.select_related("task").filter(
            task__organization_id__in=org_ids,
            company=company,
            task__deleted_at__isnull=True,
        )

        # Handle filter search
        if search:
            plan_schedules = plan_schedules.filter(
                schedules__title__icontains=search
            )
            task_schedules = task_schedules.filter(
                task__title__icontains=search
            )

        if start_date:
            plan_schedules = plan_schedules.filter(
                Q(plan_start_date__gte=start_date)
                | Q(plan_end_date__gte=start_date)
            )
            task_schedules = task_schedules.filter(
                Q(plan_start_date__gte=start_date)
                | Q(plan_end_date__gte=start_date)
            )

        if end_date:
            plan_schedules = plan_schedules.filter(
                Q(plan_start_date__lte=end_date)
                | Q(plan_end_date__lte=end_date)
            )
            task_schedules = task_schedules.filter(
                Q(plan_start_date__lte=end_date)
                | Q(plan_end_date__lte=end_date)
            )

        # Handle filter data
        if user_ids := self.request.query_params.get("user_ids"):
            if ids := split_id_from_string(user_ids):
                plan_schedules = plan_schedules.filter(
                    schedule__participants__id__in=ids
                ).distinct()
                task_schedules = task_schedules.filter(
                    task__people_in_charge__id__in=ids
                ).distinct()

        if tag_ids := request.query_params.get("tag_ids"):
            if ids := split_id_from_string(tag_ids):
                plan_schedules = plan_schedules.filter(
                    schedule__tags__in=ids
                ).distinct()
                task_schedules = task_schedules.filter(
                    task__tags__in=ids
                ).distinct()

        if category_ids := request.query_params.get("category_ids"):
            if ids := split_id_from_string(category_ids):
                plan_schedules = plan_schedules.filter(
                    schedule__categories__large_statistic_category__in=ids
                ).distinct()
                task_schedules = task_schedules.filter(
                    task__categories__large_statistic_category__in=ids
                ).distinct()

        if organization_ids := request.query_params.get("organization_ids"):
            if ids := split_id_from_string(organization_ids):
                plan_schedules = plan_schedules.filter(
                    schedule__organization__in=ids
                ).distinct()
                task_schedules = task_schedules.filter(
                    task__organization__in=ids
                ).distinct()

        def _serialize_task_schedule(task_schedule):
            """
            Serialize a TaskSchedule object for the teamdock plan endpoint.
            """
            task = task_schedule.task
            is_cross_team_task = bool(
                task.organization
                and organization_id
                and int(task.organization.id) != int(organization_id)
            )

            return {
                "id": task_schedule.id,
                "title": task.title,
                "start_date": task_schedule.plan_start_date,
                "end_date": task_schedule.plan_end_date,
                "is_all_day": None,
                "is_start": task.is_start,
                "is_cross_team_task": is_cross_team_task,
                "type": CalendarTypes.TASK.value,
                "participants": CreationDataUserSerializer(
                    task.people_in_charge.all(), many=True
                ).data,
                "event_type": task.type,
                "categories": get_common_categories(
                    task.categories.first(), task
                )
                if task.categories.exists()
                else [],
            }

        def _serialize_plan_schedule(plan):
            """
            Serialize a RepeatSchedule (plan) object for the teamdock plan endpoint.
            """
            schedule = plan.schedule
            return {
                "id": plan.id,
                "title": schedule.title,
                "start_date": plan.plan_start_date,
                "end_date": plan.plan_end_date,
                "is_all_day": None,
                "is_start": schedule.is_start,
                "is_cross_team_task": False,
                "type": CalendarTypes.SCHEDULE.value,
                "participants": CreationDataUserSerializer(
                    schedule.participants.all(), many=True
                ).data,
                "event_type": schedule.type,
                "categories": get_common_categories(
                    schedule.categories.first(), schedule
                )
                if schedule.categories.exists()
                else [],
            }

        results = [_serialize_task_schedule(ts) for ts in task_schedules]
        results += [_serialize_plan_schedule(ps) for ps in plan_schedules]

        return self.response_ok(results)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=str, required=True),
            OpenApiParameter("start_date", type=datetime),
            OpenApiParameter("end_date", type=datetime),
            OpenApiParameter("user_ids", type=str),
            OpenApiParameter("search", type=str),
            OpenApiParameter("tag_ids", type=str),
            OpenApiParameter("category_ids", type=str),
            OpenApiParameter("organization_ids", type=str),
            OpenApiParameter("is_cross_team_task", type=bool),
        ],
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                response=ScheduleTeamdockSerializer(many=True)
            )
        },
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="actual",
        serializer_class=ScheduleTeamdockSerializer,
    )
    @transaction.atomic()
    def teamdock_actual(self, request):
        """
        Get list actual of schedules in teamdock.
        """
        company = request.user.company
        params = request.query_params
        calendar_org = company.get_calendar_organization()
        organization_id = params.get("organization_id")
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        search = params.get("search")
        is_cross_team_task_param = (
            params.get("is_cross_team_task", "").lower() == "true"
        )

        if is_cross_team_task_param:
            # Get all organization_ids that users in this organization belong to (cross-team)
            org_ids = (
                Organization.objects.filter(
                    users__organizations__id=organization_id
                )
                .values_list("id", flat=True)
                .distinct()
            )
        else:
            org_ids = [organization_id]

        durations = TaskDuration.objects.select_related(
            "task", "schedule"
        ).filter(
            Q(
                task__organization_id__in=org_ids,
                task__deleted_at__isnull=True,
            )
            | Q(
                schedule__organization_id=calendar_org.id
                if calendar_org
                else None,
                schedule__deleted_at__isnull=True,
            )
        )

        # Handle filter search
        if search:
            durations = durations.filter(
                Q(task__title__icontains=search)
                | Q(schedule__title__icontains=search)
            )

        if start_date:
            durations = durations.filter(
                Q(started_at__gte=start_date) | Q(paused_at__gte=start_date)
            )

        if end_date:
            durations = durations.filter(
                Q(started_at__lte=end_date) | Q(paused_at__lte=end_date)
            )

        # Handle filter data
        if user_ids := self.request.query_params.get("user_ids"):
            if ids := split_id_from_string(user_ids):
                durations = durations.filter(
                    Q(schedule__participants__id__in=ids)
                    | Q(task__people_in_charge__id__in=ids)
                ).distinct()

        if tag_ids := request.query_params.get("tag_ids"):
            if ids := split_id_from_string(tag_ids):
                durations = durations.filter(
                    Q(schedule__tags__id__in=ids) | Q(task__tags__id__in=ids)
                ).distinct()

        if category_ids := request.query_params.get("category_ids"):
            if ids := split_id_from_string(category_ids):
                durations = durations.filter(
                    Q(schedule__categories__large_statistic_category__in=ids)
                    | Q(task__categories__large_statistic_category__in=ids)
                ).distinct()

        if organization_ids := request.query_params.get("organization_ids"):
            if ids := split_id_from_string(organization_ids):
                durations = durations.filter(
                    Q(schedule__organization_id__in=ids)
                    | Q(task__organization_id__in=ids)
                ).distinct()

        results = []
        for duration in durations:
            # Detect model
            model = None
            is_cross_team_task = False

            if duration.task:
                model = duration.task
                is_cross_team_task = bool(
                    model.organization
                    and organization_id
                    and int(model.organization.id) != int(organization_id)
                )

            if duration.schedule:
                model = duration.schedule

            if not model or not duration.user:
                continue

            item = {
                "id": duration.id,
                "task_id": model.id if isinstance(model, Task) else None,
                "schedule_id": model.id
                if isinstance(model, Schedule)
                else None,
                "title": model.title,
                "start_date": duration.started_at,
                "end_date": duration.paused_at,
                "type": CalendarTypes.SCHEDULE.value
                if isinstance(model, Schedule)
                else CalendarTypes.TASK.value,
                "participants": CreationDataUserSerializer(
                    [duration.user], many=True
                ).data,
                "is_start": duration.paused_at is None
                or not duration.paused_at,
                "is_cross_team_task": is_cross_team_task,
                "event_type": model.type,
                "categories": []
                if not model.categories.exists()
                else get_common_categories(model.categories.first(), model),
            }
            results.append(item)

        return self.response_ok(results)


@extend_schema(tags=["System > Calendar"])
class CalendarViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint for Calendar
    """

    queryset = TaskSchedule.objects.order_by("plan_start_date").all()
    serializer_class = TaskScheduleForCalendarSerializer
    filterset_class = TaskScheduleForCalendarFilter
    permission_classes = [ActionPermission]
    pagination_class = None
    screen_name = Screens.CALENDAR.value

    def get_queryset(self):
        user = self.request.user
        user_id = self.request.query_params.get("user_id")
        queryset = super().get_queryset()

        if not user_id:
            queryset = queryset.none()

        return queryset.filter(company=user.company_id)


@extend_schema(tags=["System > Event Locations"])
class EventLocationViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for managing event locations in the system.

    This viewset provides CRUD operations for event locations, allowing users to:
    - Create new event locations
    - List all event locations for their company
    - Retrieve specific event location details
    - Update existing event locations
    - Delete event locations
    """

    queryset = EventLocation.objects.order_by("-created_at")
    serializer_class = EventLocationSerializer
    permission_classes = [ActionPermission]
    screen_name = Screens.CALENDAR_MANAGEMENT.value
    lookup_field = "uuid"

    def get_queryset(self):
        """
        Filter the queryset to only return event locations belonging to the user's company.
        """
        return (
            super()
            .get_queryset()
            .filter(company_id=self.request.user.company_id)
        )

    def perform_create(self, serializer):
        """
        Create a new event location and associate it with the user's company.
        """
        serializer.save(company_id=self.request.user.company_id)
