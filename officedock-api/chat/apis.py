from datetime import datetime
from django.db import transaction
from django.db.models import (
    DateTimeField,
    OuterRef,
    Subquery,
    Value,
    Case,
    When,
    CharField,
    F,
    Q,
    Count,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiResponse,
)

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from base.apis import BaseAPIViewSet
from base.constants import REPLACE_NULL_DATE
from base.messages import ERROR_MESSAGES
from base.paginations import BasePagination
from chat.constants import (
    ChatMessageTypes,
    ChatRoomTypes,
    WebSocketEventType,
    TypeChatGroup,
)
from chat.models import (
    ChatMessage,
    ChatRoom,
    ChatRoomsParticipants,
    ChatFile,
    Bookmark,
)
from chat.serializers import (
    BookMarkSerializer,
    ChatFileDetailSerializer,
    ChatMessageSerializer,
    ChatMessageBookMarkSerializer,
    ChatRoomDetailSerializer,
    ChatRoomMemoSerializer,
    ChatRoomSerializer,
    ChatRoomsParticipantsSerializer,
    ChatRoomsParticipantsWebSocketSerializer,
    ChunkFileSerializer,
    SendMessageSerializer,
    ReactionSerializer,
)
from chat.utils import remove_chat_files
from common.utils import (
    StripTags,
    generate_file_name,
    send_web_socket_event,
    delete_file,
)
from base.permissions import ActionPermission
from roles.constants import Screens


@extend_schema(tags=["System > Chat Room"])
class ChatRoomViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Chat Room
    """

    queryset = ChatRoom.objects.order_by("created_at").all()
    serializer_class = ChatRoomSerializer
    permission_classes = [ActionPermission]
    lookup_field = "code"
    screen_name = Screens.CHAT.value

    def get_queryset(self):
        """
        Filtering chat rooms by company.
        """

        user = self.request.user
        return super().get_queryset().filter(company_id=user.company_id)

    def get_serializer(self, *args, **kwargs):
        if self.action == "retrieve":
            return ChatRoomDetailSerializer(
                *args, **kwargs, context={"request": self.request}
            )
        return super().get_serializer(*args, **kwargs)

    @action(
        methods=["POST"],
        detail=False,
        url_path="chunk-files",
        serializer_class=ChunkFileSerializer,
    )
    def chunk_files_upload(self, request):
        """
        Handle chunk file upload
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        chunk_file = validated_data.get("chunk_file")
        chunk_file.name = generate_file_name(None)
        serializer.save()
        return self.response_ok()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a chat room.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        company = user.company
        validated_data = serializer.validated_data
        participants = validated_data.pop("participant_ids", [])
        # Unique element in list participants
        unique_participants = list(set(participants))

        # Determine chat room type based on the number of unique participants
        chat_room_type = ChatRoomTypes.GROUP.value
        if len(unique_participants) == 1:
            if user in unique_participants:
                chat_room_type = ChatRoomTypes.SELF.value
            else:
                chat_room_type = ChatRoomTypes.PRIVATE.value

        # Remove element is login user
        unique_participants = [
            item for item in unique_participants if item != user
        ]
        # Check if not create self chat
        if user not in unique_participants:
            unique_participants.append(user)

        if (
            chat_room_type == ChatRoomTypes.SELF.value
            or chat_room_type == ChatRoomTypes.PRIVATE.value
        ):
            validated_data.pop(
                "name", None
            )  # Remove room name when chat private

            chat_rooms_participants = user.chat_rooms_participants.filter(
                chat_room__type=chat_room_type
            ).all()
            for participant in chat_rooms_participants:
                chat_room = participant.chat_room
                # Check case is private chat with another user
                if chat_room.chat_rooms_participants.filter(
                    user=unique_participants[0]
                ).exists():
                    data = ChatRoomsParticipantsSerializer(participant).data
                    data["is_existed"] = True
                    if participant.hidden_at is not None:
                        participant.hidden_at = None
                        participant.unread_messages = 0
                        participant.save()
                        # Handle websocket for sync data while chat room is hidden
                        send_web_socket_event(
                            {
                                "action": WebSocketEventType.SHOW_ROOM.value,
                                "chat_room": ChatRoomsParticipantsSerializer(
                                    participant
                                ).data,
                                "chat_message": None,
                            },
                            user,
                        )

                        return self.response_ok(data)

                    # Handle case existed chat room
                    send_web_socket_event(
                        {
                            "action": WebSocketEventType.CREATE_CHAT_ROOM.value,
                            "chat_room": data,
                            "chat_message": None,
                        },
                        user,
                    )

                    return self.response_ok(data)
        else:
            if not validated_data.get("name"):
                raise ValidationError(
                    {"name": [ERROR_MESSAGES["name_of_chat_room_required"]]}
                )

        chat_room = serializer.save(company=company, type=chat_room_type)
        chat_room.participants.set(
            unique_participants, through_defaults={"company": company}
        )

        # Handle websocket for sync data to participants in new chat room
        for user in unique_participants:
            send_web_socket_event(
                {
                    "action": WebSocketEventType.CREATE_CHAT_ROOM.value,
                    "chat_room": ChatRoomsParticipantsSerializer(
                        chat_room.chat_rooms_participants.filter(
                            user=user
                        ).first()
                    ).data,
                    "chat_message": None,
                },
                user,
            )

        return self.response_ok(
            ChatRoomsParticipantsSerializer(
                chat_room.chat_rooms_participants.filter(user=user).first(),
            ).data
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update a chat room.
        """
        instance = self.get_object()
        current_participant = instance.participants.all()

        if (
            instance.type == ChatRoomTypes.SELF.value
            or instance.type == ChatRoomTypes.PRIVATE.value
        ):
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["cannot_updated"]]}
            )
        serializer = self.get_serializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        company_id = request.user.company_id
        validated_data = serializer.validated_data
        participants = validated_data.pop("participant_ids", None)

        name = validated_data.get("name")

        if "name" in validated_data and (name is None or name == ""):
            raise ValidationError(
                {"name": [ERROR_MESSAGES["name_of_chat_room_required"]]}
            )

        chat_room = serializer.save(company_id=company_id)

        if participants is not None:
            # Unique element in list participants
            unique_participants = list(set(participants))
            # Check if not create self chat
            if request.user not in unique_participants:
                unique_participants.append(request.user)
            # Handle websocket to removed participants
            delete_participants = list(
                set(current_participant) - set(unique_participants)
            )
            # Determine participants to be added
            add_participants = list(
                set(unique_participants) - set(current_participant)
            )
            # Determine participants to be updated (existing participants)
            current_participant = list(
                set(unique_participants)
                - set(delete_participants)
                - set(add_participants)
            )

            chat_room.participants.set(
                unique_participants, through_defaults={"company_id": company_id}
            )

            # Handle websocket to delete participants
            for user in delete_participants:
                send_web_socket_event(
                    {
                        "action": WebSocketEventType.REMOVE_PARTICIPANT.value,
                        "chat_room": {"code": chat_room.code},
                        "chat_message": None,
                    },
                    user,
                )

            # Handle websocket to add participants
            for user in add_participants:
                send_web_socket_event(
                    {
                        "action": WebSocketEventType.ADD_PARTICIPANT.value,
                        "chat_room": ChatRoomsParticipantsSerializer(
                            user.chat_rooms_participants.filter(
                                chat_room=chat_room
                            ).first()
                        ).data,
                        "chat_message": None,
                    },
                    user,
                )

        # Handle websocket to update chat room
        for user in current_participant:
            send_web_socket_event(
                {
                    "action": WebSocketEventType.UPDATE_CHAT_ROOM.value,
                    "chat_room": ChatRoomsParticipantsSerializer(
                        user.chat_rooms_participants.filter(
                            chat_room=chat_room
                        ).first()
                    ).data,
                    "chat_message": None,
                },
                user,
            )

        return self.response_ok(self.serializer_class(chat_room).data)

    @extend_schema(
        parameters=[
            OpenApiParameter("name", type=str),
            OpenApiParameter("last_message_at", type=str),
            OpenApiParameter("pin_at", type=str),
            OpenApiParameter(
                "type",
                type=str,
                enum=[
                    TypeChatGroup.GROUP.value,
                    TypeChatGroup.PRIVATE.value,
                    TypeChatGroup.UNREAD.value,
                ],
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Get a list of chat rooms.
        """
        user = request.user

        # Use select_related to load related ForeignKey relationships
        chat_rooms_participants = (
            user.chat_rooms_participants.select_related("chat_room")
            .annotate(
                participant_count=Count("chat_room__chat_rooms_participants")
            )
            .filter(hidden_at__isnull=True)
            .exclude(
                chat_room__type=ChatRoomTypes.PRIVATE.value, participant_count=1
            )
        )

        # Subquery to get the latest message
        latest_message_subquery = Subquery(
            chat_rooms_participants.filter(chat_room=OuterRef("chat_room"))
            .order_by("-chat_room__chat_messages__created_at")
            .values("chat_room__chat_messages__created_at")[:1]
        )

        # Subquery to get the chat room's creation time
        chat_room_created_at_subquery = Subquery(
            chat_rooms_participants.filter(chat_room=OuterRef("chat_room"))
            .order_by("-chat_room__created_at")
            .values("chat_room__created_at")[:1]
        )

        # Filter chat rooms and order by the subquery results
        chat_rooms = chat_rooms_participants.annotate(
            latest_message_created_at=Coalesce(
                latest_message_subquery,
                chat_room_created_at_subquery,
                output_field=DateTimeField(),
            ),
            coalesced_pin_at=Coalesce(
                "pin_at",
                Value(REPLACE_NULL_DATE),
                output_field=DateTimeField(),
            ),
        )
        # Handle filter when pagination
        if last_message_at := request.query_params.get("last_message_at"):
            if pin_at := request.query_params.get("pin_at"):
                chat_rooms = chat_rooms.filter(
                    Q(pin_at__lt=pin_at)
                    | Q(
                        latest_message_created_at__isnull=False,
                        pin_at__isnull=True,
                    )
                )
            else:
                chat_rooms = chat_rooms.filter(
                    latest_message_created_at__lt=last_message_at,
                    pin_at__isnull=True,
                )

        # Filter by name if the "name" query parameter is provided
        if name := request.query_params.get("name"):
            chat_rooms = chat_rooms.annotate(
                chat_room_name=Case(
                    When(
                        chat_room__type=ChatRoomTypes.SELF.value,
                        then=Value(user.profile.full_name),
                    ),
                    When(
                        chat_room__type=ChatRoomTypes.PRIVATE.value,
                        then=Subquery(
                            ChatRoomsParticipants.objects.filter(
                                chat_room=OuterRef("chat_room")
                            )
                            .exclude(user=user)
                            .values("user__profile__full_name")[:1]
                        ),
                    ),
                    default=F("chat_room__name"),
                    output_field=CharField(),
                )
            ).filter(chat_room_name__icontains=name)

        # Sort by pin_at and last_message_at
        chat_rooms = chat_rooms.order_by(
            "-coalesced_pin_at", "-latest_message_created_at"
        )

        # Use prefetch_related to optimize loading of related data
        chat_rooms = chat_rooms.prefetch_related(
            "chat_room__participants",
            "chat_room__chat_messages",
        )
        if request.query_params.get("type") == TypeChatGroup.PRIVATE.value:
            updated_chat_rooms = chat_rooms.filter(
                chat_room__type=ChatRoomTypes.PRIVATE.value
            )
        elif request.query_params.get("type") == TypeChatGroup.GROUP.value:
            updated_chat_rooms = chat_rooms.filter(
                chat_room__type=ChatRoomTypes.GROUP.value
            )
        elif request.query_params.get("type") == TypeChatGroup.UNREAD.value:
            updated_chat_rooms = chat_rooms.filter(unread_messages__gt=0)
        else:
            updated_chat_rooms = chat_rooms
        # Return the response with the serialized data
        return self.response_pagination(
            request, updated_chat_rooms, ChatRoomsParticipantsSerializer
        )

    @action(
        methods=["POST"],
        detail=True,
        url_path="pin",
        serializer_class=None,
    )
    def pin(self, request, code=None):
        """
        Pin a chat room
        """
        instance = self.get_object()
        current_user = request.user
        participant = instance.chat_rooms_participants.filter(
            user=current_user
        ).first()

        if participant is None:
            raise ValidationError(
                {
                    "chat_room_participant": [
                        ERROR_MESSAGES["participant_does_not_exist"]
                    ]
                }
            )

        if participant.pin_at:
            action = WebSocketEventType.UNPIN_ROOM.value
            participant.pin_at = None
        else:
            action = WebSocketEventType.PIN_ROOM.value
            participant.pin_at = timezone.now()
        participant.save()

        # Handle case realtime when pin/unpin chat room
        send_web_socket_event(
            {
                "action": action,
                "user": current_user.id,
                "chat_room": ChatRoomsParticipantsSerializer(participant).data,
            },
            current_user,
        )

        return self.response_ok(
            ChatRoomsParticipantsSerializer(participant).data
        )

    @action(
        methods=["PUT"],
        detail=True,
        url_path="hide",
        serializer_class=None,
    )
    def hide(self, request, code=None):
        """
        Hide a chat room
        """
        instance = self.get_object()
        current_user = request.user
        participant = instance.chat_rooms_participants.filter(
            user=current_user
        ).first()

        if instance.type == ChatRoomTypes.GROUP.value:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["cannot_hide_room"]]}
            )

        if participant is None:
            raise ValidationError(
                {
                    "chat_room_participant": [
                        ERROR_MESSAGES["participant_does_not_exist"]
                    ]
                }
            )

        if participant.hidden_at:
            participant.hidden_at = None
            participant.save()
        else:
            participant.hidden_at = timezone.now()
            participant.save()
            # Handle case realtime when hide chat
            send_web_socket_event(
                {
                    "action": WebSocketEventType.HIDE_ROOM.value,
                    "user": current_user.id,
                    "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                        participant
                    ).data,
                },
                current_user,
            )

        return self.response_ok()

    @extend_schema(
        methods=["GET"],
        parameters=[
            OpenApiParameter("is_read", type=bool, required=False),
        ],
    )
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a chat room
        """
        instance = self.get_object()
        user = request.user
        if request.query_params.get("is_read", None):
            user_chat_room = instance.chat_rooms_participants.filter(user=user)
            if not user_chat_room.exists():
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["permission_denied"]}
                )
            user_chat_room.update(unread_messages=0)
            # Handle case realtime when send chat message
            send_web_socket_event(
                {
                    "action": WebSocketEventType.UPDATE_CHAT_ROOM.value,
                    "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                        user_chat_room.first()
                    ).data,
                    "chat_message": None,
                },
                user,
            )

        return self.response_ok(
            ChatRoomDetailSerializer(
                instance, context={"request": self.request}
            ).data
        )

    @extend_schema(
        methods=["GET"],
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
            OpenApiParameter("message_id", type=int, required=False),
            OpenApiParameter("message", type=str, required=False),
            OpenApiParameter("sorting", type=str, required=False),
            OpenApiParameter(
                "chatroom_type",
                type=str,
                enum=[
                    ChatRoomTypes.CALENDAR.value,
                    ChatRoomTypes.TASK.value,
                    ChatRoomTypes.SKILL.value,
                ],
            ),
            OpenApiParameter("bookmark_message_id", type=int, required=False),
        ],
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                response=ChatMessageSerializer(many=True)
            )
        },
    )
    @action(
        methods=["GET", "POST"],
        detail=True,
        url_path="messages",
        serializer_class=SendMessageSerializer,
    )
    def messages(self, request, code=None):
        """
        Get list messages for chat room or send a new message.
        """
        chat_room = self.get_object()
        user = request.user
        user_chat_room = chat_room.chat_rooms_participants.filter(user=user)
        if not user_chat_room.exists():
            raise ValidationError(
                {"detail": ERROR_MESSAGES["permission_denied"]}
            )

        if request.method == "GET":
            page_size = request.query_params.get("page_size", 20)
            sorting = request.query_params.get("sorting")
            message_id = request.query_params.get("message_id")
            message = request.query_params.get("message")
            chatroom_type = request.query_params.get("chatroom_type")
            bookmark_message_id = request.query_params.get(
                "bookmark_message_id"
            )

            # Sorting message by asc or desc create_at
            order_by_field = "created_at" if sorting else "-created_at"
            chat_messages = chat_room.chat_messages.order_by(
                order_by_field
            ).all()

            # Filter message_id or bookmark_message_id
            if bookmark_message_id:
                bookmark_message_id = int(bookmark_message_id)
                page_size = int(page_size)

                # Check if list has more than page_size items
                if len(chat_messages) > page_size:
                    # Find the position of bookmark_message_id in the list
                    bookmark_index = next(
                        (
                            i
                            for i, msg in enumerate(chat_messages)
                            if msg.id == bookmark_message_id
                        ),
                        None,
                    )

                    if bookmark_index is not None:
                        start_index = max(bookmark_index - 5, 0)
                        chat_messages_result = chat_messages[start_index:]

                        # If the number of messages is not enough for page_size, get more from before
                        if len(chat_messages_result) < page_size:
                            remaining_items = page_size - len(
                                chat_messages_result
                            )
                            extra_start = max(start_index - remaining_items, 0)
                            chat_messages_result = chat_messages[extra_start:]

                        chat_messages = chat_messages_result
            elif message_id:
                filter_field = "id__gt" if sorting else "id__lt"
                chat_messages = chat_messages.filter(
                    **{filter_field: message_id}
                )
            elif message:
                if chatroom_type == ChatRoomTypes.TASK.value:
                    chat_messages = chat_messages.filter(
                        task__title__icontains=message
                    )
                elif chatroom_type == ChatRoomTypes.CALENDAR.value:
                    chat_messages = chat_messages.filter(
                        Q(schedule__title__icontains=message)
                        | Q(message__icontains=message)
                    )
                elif chatroom_type == ChatRoomTypes.SKILL.value:
                    chat_messages = chat_messages.filter(
                        Q(submit_level__skill__name__icontains=message)
                    )
                else:
                    chat_messages = chat_messages.annotate(
                        clean_message=StripTags(F("message"))
                    ).filter(Q(clean_message__icontains=message))
                chat_messages = chat_messages.filter(
                    deleted_at__isnull=True
                ).order_by("-created_at")
            return self.response_pagination(
                request, chat_messages, ChatMessageSerializer
            )

        elif request.method == "POST":
            client_id = request.data.pop("client_id", None)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer_data = serializer.validated_data
            file_uuids = serializer_data.pop("file_uuids", [])
            message = serializer.save(
                sender=user, chat_room=chat_room, company_id=user.company_id
            )

            if file_uuids:
                # Create chat files
                ChatFile.create_files(
                    company_id=chat_room.company_id,
                    room=chat_room,
                    message=message,
                    uuids=file_uuids,
                )

            chat_room_participants = chat_room.chat_rooms_participants.all()
            for participant in chat_room_participants:
                if participant.user_id != user.id:
                    participant.unread_messages = (
                        participant.unread_messages + 1
                    )
                participant.hidden_at = None
                participant.save()
                if participant.user_id != user.id:
                    # Handle case realtime when send chat message
                    send_web_socket_event(
                        {
                            "client_id": client_id,
                            "action": WebSocketEventType.MESSAGE.value,
                            "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                                participant
                            ).data,
                            "chat_message": ChatMessageSerializer(message).data,
                        },
                        participant,
                    )

            return self.response_created(ChatMessageSerializer(message).data)

        return self.response(status_code=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(
        methods=["PATCH"],
        detail=True,
        url_path="memo",
        serializer_class=ChatRoomMemoSerializer,
    )
    def memo(self, request, code=None):
        """
        Update memo for chat room
        """
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        instance.memo = serializer_data.pop("memo", None)
        instance.save()

        return self.response_ok()

    @action(
        methods=["PUT"],
        detail=True,
        url_path="mute",
        serializer_class=None,
    )
    def mute(self, request, code=None):
        """
        Mute a chat room
        """
        instance = self.get_object()
        current_user = request.user
        participant = instance.chat_rooms_participants.filter(
            user=current_user
        ).first()

        if participant is None:
            raise ValidationError(
                {
                    "chat_room_participant": [
                        ERROR_MESSAGES["participant_does_not_exist"]
                    ]
                }
            )

        if participant.is_muted:
            participant.is_muted = False
        else:
            participant.is_muted = True
        participant.save()

        return self.response_ok()


@extend_schema(tags=["System > Chat Message"])
class ChatMessageViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for Chat Message
    """

    queryset = ChatMessage.objects.order_by("-created_at").all()
    serializer_class = SendMessageSerializer
    permission_classes = [ActionPermission]
    lookup_field = "uuid"
    screen_name = Screens.CHAT.value

    def get_queryset(self):
        """
        Filtering chat messages by user.
        """

        queryset = super().get_queryset()
        user = self.request.user

        if self.action in ["destroy", "perform_update"]:
            return queryset.filter(sender=user)

        return queryset.filter(company_id=user.company_id)

    def get_serializer_class(self):
        """
        Serializer classification by action
        """
        if self.action == "list":
            return ChatMessageBookMarkSerializer

        return super().get_serializer_class()

    @extend_schema(
        parameters=[
            OpenApiParameter("is_bookmark", type=bool, required=False),
            OpenApiParameter("message", type=str, required=False),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Get a list of chat rooms.
        """
        user = request.user
        messages = self.get_queryset().filter(deleted_at__isnull=True)
        is_bookmark = request.query_params.get("is_bookmark")

        if is_bookmark:
            messages = (
                messages.filter(bookmark_users=user)
                .order_by("bookmarks__bookmark_at")
                .distinct()
            )
        else:
            messages = messages.order_by("-created_at")

        if message := request.query_params.get("message"):
            if is_bookmark:
                messages = (
                    messages.filter(
                        Q(task__title__icontains=message)
                        | Q(
                            Q(schedule__title__icontains=message)
                            | Q(message__icontains=message)
                        )
                        | Q(Q(submit_level__skill__name__icontains=message))
                    )
                    .order_by("bookmarks__bookmark_at")
                    .distinct()
                )
            else:
                messages = (
                    messages.annotate(clean_message=StripTags(F("message")))
                    .filter(clean_message__icontains=message)
                    .order_by("-created_at")
                )

        return self.response_pagination(
            request, messages, ChatMessageBookMarkSerializer
        )

    @action(
        methods=["POST"],
        detail=True,
        url_path="bookmark",
        serializer_class=BookMarkSerializer,
    )
    def bookmark(self, request, uuid=None):
        """
        Bookmark message
        """
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        bookmark_at = serializer_data.pop("bookmark_at", None)
        if bookmark_at:
            Bookmark.objects.get_or_create(
                chat_message=instance,
                user=request.user,
                defaults={"bookmark_at": datetime.now()},
            )
        else:
            Bookmark.objects.filter(
                chat_message=instance, user=request.user
            ).delete()

        return self.response_ok()

    @action(
        methods=["POST"],
        detail=True,
        url_path="reaction",
        serializer_class=ReactionSerializer,
    )
    @transaction.atomic()
    def reaction(self, request, uuid=None):
        """
        Bookmark message
        """
        user = request.user
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        icon = serializer_data.pop("icon")
        if instance.reactions.filter(user=user, icon=icon).exists():
            instance.reactions.filter(user=user, icon=icon).delete()
        else:
            instance.reactions.create(
                company_id=user.company_id, user=user, icon=icon
            )
        participants = instance.chat_room.chat_rooms_participants.all()
        for participant in participants:
            if participant.user.id != user.id:
                send_web_socket_event(
                    {
                        "action": WebSocketEventType.EDIT_MESSAGE.value,
                        "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                            participant
                        ).data,
                        "chat_message": ChatMessageSerializer(instance).data,
                    },
                    participant.user,
                )

        return self.response_ok()

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Handle update message.
        """

        instance = serializer.instance
        serializer_data = serializer.validated_data
        file_uuids = serializer_data.pop("file_uuids", [])

        if (
            instance.type != ChatMessageTypes.MESSAGE.value
            or instance.deleted_at is not None
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["cannot_updated"]})

        if not isinstance(file_uuids, list):
            file_uuids = [file_uuids]

        # Get uuids not exists in files
        uuids_exists = instance.chat_files.filter(
            uuid__in=file_uuids
        ).values_list("uuid", flat=True)
        uuids_to_create = []
        for uuid in file_uuids:
            if uuid not in uuids_to_create and uuid not in uuids_exists:
                uuids_to_create.append(uuid)

        # Delete chat files
        chat_files = instance.chat_files.exclude(uuid__in=file_uuids).all()
        remove_chat_files(chat_files)

        # Perform the update operation
        instance = serializer.save()

        chat_room = instance.chat_room
        if uuids_to_create:
            # Create chat files
            ChatFile.create_files(
                company_id=instance.company_id,
                room=chat_room,
                message=instance,
                uuids=uuids_to_create,
            )

        # Handle case realtime when edit chat message
        send_web_socket_event(
            {
                "action": WebSocketEventType.EDIT_MESSAGE.value,
                "chat_room": {"code": chat_room.code},
                "chat_message": ChatMessageSerializer(instance).data,
            },
            chat_room=chat_room,
        )

    def destroy(self, request, *args, **kwargs):
        """
        Handle soft delete message
        """

        message = self.get_object()
        message.soft_delete()

        # Delete chat files
        remove_chat_files(message.chat_files.all())

        # Handle case realtime when delete chat message
        chat_room = message.chat_room
        send_web_socket_event(
            {
                "action": WebSocketEventType.DELETE_MESSAGE.value,
                "chat_room": {"code": chat_room.code},
                "chat_message": ChatMessageSerializer(message).data,
            },
            chat_room=chat_room,
        )

        return self.response_ok()


@extend_schema(tags=["System > Chat Message > File"])
class ChatFileViewSet(
    BaseAPIViewSet,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for chat file.
    """

    queryset = ChatFile.objects.order_by("-created_at")
    serializer_class = ChatFileDetailSerializer
    permission_classes = [ActionPermission]
    screen_name = Screens.CHAT.value
    lookup_field = "uuid"

    def get_queryset(self):
        queryset = (
            super()
            .get_queryset()
            .filter(company_id=self.request.user.company_id)
        )

        if chat_room_code := self.request.query_params.get("chat_room_code"):
            queryset = queryset.filter(chat_room__code=chat_room_code)

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("chat_room_code", type=str, required=False),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Handle delete file
        """

        instance = self.get_object()

        if instance.original_file:
            delete_file(instance.original_file.name)

        if instance.compressed_file:
            delete_file(instance.compressed_file.name)

        instance.delete()

        return self.response_ok()
