from datetime import datetime

from django.db import transaction
from django.db.models import Q, QuerySet
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action

from base.apis import BaseAPIViewSet
from calendars.constants import ScheduleFields
from calendars.models import Schedule
from calendars.filters import TaskScheduleForCalendarFilter
from calendars.serializers import (
    ScheduleSerializer,
    BaseScheduleSerializer,
    ScheduleTeamdockSerializer,
    TaskScheduleForCalendarSerializer,
)
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
)
from tasks.models import TaskSchedule
from base.permissions import ActionPermission
from roles.constants import Screens
from users.models import User


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

    def get_queryset(self):
        """
        Filtering schedule by company.
        """
        user = self.request.user
        queryset = super().get_queryset().filter(company=user.company)

        return queryset.order_by("start_date")

    def get_serializer(self, *args, **kwargs):
        """
        Handle get serializer.
        """
        if self.action == "list":
            return BaseScheduleSerializer(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)

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
        schedule = serializer.save(company=company, creator_id=user.id)

        if participants is not None:
            data = self._generate_chat_data(
                serializer_data.get("start_date").isoformat(),
                serializer_data.get("end_date").isoformat(),
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

    def _create_or_update_tag(self, schedule, tags):
        """
        Handle create or update tag of schedule
        """
        schedule.tags.clear()
        for tag in tags:
            schedule.tags.add(
                tag, through_defaults={"company": schedule.company}
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
        self, instance, validated_data, participants, tags, categories
    ):
        """
        Handle get field changes between instance and validated data.
        """
        changes = []
        new_start_date = validated_data.get("start_date", None)
        new_end_date = validated_data.get("end_date", None)
        if new_start_date != getattr(
            instance, "start_date"
        ) or new_end_date != getattr(instance, "end_date"):
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
            ):
                changes.append(
                    ScheduleFields.__members__[field_name.upper()].value
                )

        return changes

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

        if participants and send_to_chat:
            data = self._generate_chat_data(
                serializer_data.get("start_date").isoformat(),
                serializer_data.get("end_date").isoformat(),
                participants,
                instance.creator_id if instance.creator_id else user.id,
            )
            data["field_changes"] = self._get_field_changes(
                instance, serializer_data, participants, tags, categories
            )
            if serializer_data.get("start_date") != getattr(
                instance, "start_date"
            ) or serializer_data.get("end_date") != getattr(
                instance, "end_date"
            ):
                data["old"] = {
                    "start_date": instance.start_date.isoformat(),
                    "end_date": instance.end_date.isoformat(),
                }
        serializer.save()

        if participants is not None:
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

    @transaction.atomic()
    @extend_schema(
        parameters=[
            OpenApiParameter("send_to_chat", type=bool),
            OpenApiParameter("message", type=str),
        ]
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = self.request.user
        company = user.company
        send_to_chat = self.request.query_params.get("send_to_chat", None)
        schedule_message = self.request.query_params.get("message", None)
        participants = instance.participants.all()
        client_id = self.request.data.pop("client_id", None)

        if send_to_chat:
            data = self._generate_chat_data(
                instance.start_date.isoformat(),
                instance.end_date.isoformat(),
                participants,
                instance.creator_id if instance.creator_id else user.id,
            )

        if participants is not None:
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
                        ChatMessageTypes.REMOVE_SCHEDULE.value,
                    )
                if send_to_chat:
                    self._send_to_calendar_room(
                        participant,
                        instance,
                        data,
                        schedule_message,
                        client_id,
                        ChatMessageTypes.REMOVE_SCHEDULE.value,
                    )

        self.perform_destroy(instance)

        return self.response(status_code=status.HTTP_204_NO_CONTENT)

    def _generate_chat_data(self, start_date, end_date, users, creator_id=None):
        """
        Generate chat data for sending messages on schedule changes.
        """
        return {
            "new": {
                "start_date": start_date,
                "end_date": end_date,
            },
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
        calendar_room_participant = user.chat_rooms_participants.filter(
            chat_room__type=ChatRoomTypes.CALENDAR.value
        ).first()
        if not calendar_room_participant:
            return
        chat_room = calendar_room_participant.chat_room
        calendar_room_participant.unread_messages = (
            calendar_room_participant.unread_messages + 1
        )
        calendar_room_participant.save()

        action = WebSocketEventType.MESSAGE.value

        message_data = {
            "sender": user,
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
        chat_room_participant = participant.chat_rooms_participants.filter(
            chat_room__type=ChatRoomTypes.PRIVATE.value,
            chat_room__participants=user,
        ).first()

        action = WebSocketEventType.MESSAGE.value
        if chat_room_participant:
            chat_room = chat_room_participant.chat_room
            if chat_room_participant.hidden_at is not None:
                chat_room_participant.hidden_at = None
                chat_room_participant.save()
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
                user__id=participant.id
            ).first()

        chat_room_participant.unread_messages = (
            chat_room_participant.unread_messages + 1
        )
        chat_room_participant.save()

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
            user__id=user.id
        ).first()
        user_participant.unread_messages = user_participant.unread_messages + 1
        user_participant.hidden_at = None
        user_participant.save()
        # Send WebSocket event for real-time updates
        send_web_socket_event(
            {
                "client_id": client_id,
                "action": action,
                "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                    chat_room_participant
                ).data,
                "chat_message": ChatMessageSerializer(message_obj).data,
            },
            participant,
        )
        if user_participant:
            # Handle case realtime when send chat message to logged user
            send_web_socket_event(
                {
                    "client_id": None,
                    "action": action,
                    "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                        user_participant
                    ).data,
                    "chat_message": ChatMessageSerializer(message_obj).data,
                },
                user,
            )
        # Check if user logged hide chat room, send websocket show it
        chat_room_participant_of_user = (
            chat_room.chat_rooms_participants.filter(user=user).first()
        )
        if chat_room_participant_of_user.hidden_at is not None:
            chat_room_participant_of_user.hidden_at = None
            chat_room_participant_of_user.save()
            send_web_socket_event(
                {
                    "action": WebSocketEventType.SHOW_ROOM.value,
                    "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                        chat_room_participant_of_user
                    ).data,
                    "chat_message": ChatMessageSerializer(message_obj).data,
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
                Q(start_date__gte=start_date) | Q(end_date__gte=start_date)
            )
        if end_date:
            queryset = queryset.filter(
                Q(start_date__lte=end_date) | Q(end_date__lte=end_date)
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
            OpenApiParameter("page_size", type=int),
            OpenApiParameter("page", type=int),
            OpenApiParameter("organization_id", type=str),
            OpenApiParameter("user_ids", type=str),
            OpenApiParameter("start_date", type=datetime),
            OpenApiParameter("end_date", type=datetime),
            OpenApiParameter("search", type=str),
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
        url_path="teamdock",
        serializer_class=ScheduleTeamdockSerializer,
    )
    @transaction.atomic()
    def teamdock(self, request):
        """
        Get list of schedules in teamdock.
        """
        organization_id = self.request.query_params.get("organization_id")
        users = []

        if not organization_id:
            return self.response_pagination(
                request, users, ScheduleTeamdockSerializer
            )

        # Filter by organization id
        users = User.objects.filter(organizations__id=organization_id).order_by(
            "created_at"
        )

        # Filter by user ids
        if user_ids := self.request.query_params.get("user_ids"):
            ids = []
            for id in user_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                users = users.filter(id__in=ids)

        return self.response_pagination(
            request, users, ScheduleTeamdockSerializer
        )


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

        return queryset.filter(company=user.company)
