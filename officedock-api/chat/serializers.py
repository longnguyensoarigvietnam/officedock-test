import uuid
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from base.messages import ERROR_MESSAGES
from chat.models import ChatMessage, ChatRoom, ChatRoomsParticipants
from chat.constants import FILE_UPLOAD_MAX_SIZE, ChatRoomTypes
from common.serializers import (
    CreationDataOrganizationSerializer,
    CreationDataUserWithMainOrganizationSerializer,
)
from organizations.serializers import BaseOrganizationSerializer
from submit_levels.models import SubmitLevelHistory
from users.models import User
from tasks.models import Task
from chat.models import ChatFile, ChunkFile
from skills.serializers import SkillSerializer
from common.utils import generate_file_name, get_signed_url
from common.constants import AVATAR_GCS_EXPIRATION_SECONDS
from users.serializers import BaseUserSerializer


class CreationDataUserForChatSerializer(BaseUserSerializer):
    """
    Serializer for creation data user for chat.
    """

    full_name = serializers.SerializerMethodField()
    organizations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "avatar_color", "avatar", "organizations"]

    def get_full_name(self, obj):
        """
        Return full name of user.
        """
        return obj.profile.full_name

    def get_organizations(self, obj):
        """
        Get the main organization.
        """
        organization = obj.organizations.filter(
            usersorganizations__is_main=True
        ).first()
        return CreationDataOrganizationSerializer(organization).data


class ChatRoomSerializer(serializers.ModelSerializer):
    """
    Serializer for Chat room
    """

    participants = CreationDataUserForChatSerializer(many=True, read_only=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        required=True,
    )
    is_muted = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "name",
            "code",
            "avatar",
            "avatar_color",
            "participants",
            "participant_ids",
            "type",
            "select_organizations",
            "is_muted",
        ]
        read_only_fields = ["id", "code", "type", "avatar_color"]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.avatar:
            representation["avatar"] = get_signed_url(
                instance.avatar, AVATAR_GCS_EXPIRATION_SECONDS
            )

        return representation

    def get_is_muted(self, obj):
        """
        Get chatroom is muted or not
        """
        participant = obj.chat_rooms_participants.filter(
            user=self.context["request"].user
        ).first()
        return participant.is_muted if participant else False

    def validate(self, data):
        """
        Validation data
        """
        request = self.context.get("request")
        participants = data.get("participant_ids")
        avatar = data.get("avatar")

        if avatar:
            # Gen new file name
            file_name = avatar.name
            avatar.name = generate_file_name(file_name)

        if participants:
            for participant in participants:
                if participant.company_id != request.user.company_id:
                    raise serializers.ValidationError(
                        {
                            "participant_ids": {
                                participant.id: ERROR_MESSAGES[
                                    "company_not_match"
                                ]
                            }
                        }
                    )

        return data


class ChatRoomDetailSerializer(ChatRoomSerializer):
    """
    Serializer for Chat room
    """

    name = serializers.SerializerMethodField()
    unread_messages = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "name",
            "avatar",
            "avatar_color",
            "code",
            "participants",
            "memo",
            "type",
            "unread_messages",
            "is_muted",
            "select_organizations",
        ]
        read_only_fields = ["id", "code", "type"]

    def get_unread_messages(self, obj):
        """
        Get unread messages of current user.
        """
        return (
            obj.chat_rooms_participants.filter(
                user=self.context["request"].user
            )
            .first()
            .unread_messages
        )

    def get_name(self, obj):
        """
        Get name of chat room for given chat room
        """
        user = self.context.get("request").user
        match obj.type:
            case ChatRoomTypes.SELF.value:
                room_name = user.profile.full_name
            case ChatRoomTypes.PRIVATE.value:
                receive_user = obj.participants.exclude(id=user.id).first()
                room_name = (
                    receive_user.profile.full_name if receive_user else None
                )
            case __:
                room_name = obj.name

        return room_name


class TaskForChatMessageSerializer(serializers.ModelSerializer):
    """
    Task serializer for chat message.
    """

    class Meta:
        model = Task
        fields = ["id", "title"]


class SubmitLevelForChatMessageSerializer(serializers.ModelSerializer):
    """
    Submit Level serializer for chat message.
    """

    skill = SkillSerializer(read_only=True)

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "id",
            "staff",
            "organization",
            "skill",
            "status",
            "comment",
        ]
        read_only_fields = ["id"]


class ChatFileSerializer(serializers.ModelSerializer):
    """Serializer for chat file"""

    class Meta:
        model = ChatFile
        fields = [
            "id",
            "uuid",
            "file_name",
            "compressed_file",
            "file_type",
            "file_size",
            "created_at",
        ]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.compressed_file:
            representation["compressed_file"] = get_signed_url(
                instance.compressed_file, AVATAR_GCS_EXPIRATION_SECONDS
            )

        return representation


class BaseChatFileDetailSerializer(serializers.ModelSerializer):
    """Serializer for chat file detail"""

    chat_messages = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatFile
        fields = [
            "id",
            "uuid",
            "file_name",
            "original_file",
            "file_type",
            "file_size",
            "created_at",
            "chat_messages",
        ]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.original_file:
            representation["original_file"] = get_signed_url(
                instance.original_file, AVATAR_GCS_EXPIRATION_SECONDS
            )

        return representation

    def get_chat_messages(self, obj):
        """Get list chat messages of file"""
        return obj.chat_messages.values("id", "uuid")


class ChatFileDetailSerializer(BaseChatFileDetailSerializer):
    """Serializer for chat file detail"""

    files = serializers.SerializerMethodField()

    class Meta:
        model = ChatFile
        fields = [
            "id",
            "uuid",
            "file_name",
            "original_file",
            "file_type",
            "file_size",
            "created_at",
            "files",
            "chat_messages",
        ]

    def get_files(self, obj):
        """Get next or previous file preview"""

        chat_files = ChatFile.objects.filter(
            Q(file_type__icontains="image") | Q(file_type__icontains="pdf"),
            chat_room=obj.chat_room,
        ).order_by("id")
        next_file = chat_files.filter(id__gt=obj.id).first()
        previous_file = chat_files.filter(id__lt=obj.id).last()

        return {
            "next_file": BaseChatFileDetailSerializer(next_file).data
            if next_file
            else None,
            "previous_file": BaseChatFileDetailSerializer(previous_file).data
            if previous_file
            else None,
        }


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Chat massage
    """

    is_bookmark = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField(read_only=True)
    sender = CreationDataUserWithMainOrganizationSerializer()
    task = TaskForChatMessageSerializer()
    submit_level = SubmitLevelForChatMessageSerializer()
    tasks = serializers.SerializerMethodField(read_only=True)
    reactions = serializers.SerializerMethodField(read_only=True)
    chat_files = serializers.SerializerMethodField(read_only=True)
    organization = BaseOrganizationSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "uuid",
            "message",
            "sender",
            "is_edited",
            "is_bookmark",
            "created_at",
            "deleted_at",
            "task",
            "submit_level",
            "schedule_changes",
            "schedule",
            "type",
            "mentions",
            "tasks",
            "quote",
            "reply",
            "reactions",
            "chat_files",
            "organization",
        ]
        read_only_fields = ["id", "uuid"]

    def to_representation(self, instance):
        """To representation field"""
        representation = super().to_representation(instance)

        # Handle quote messages
        representation["quote"] = self._get_quote_messages(instance)

        if instance.reply:
            representation["reply"] = ChatMessageSerializer(instance.reply).data
        if instance.task and instance.task.deleted_at is not None:
            representation["task"] = None
        if instance.schedule and instance.schedule.deleted_at is not None:
            representation["schedule"] = None
        return representation

    def _get_quote_messages(self, instance):
        """Helper to fetch and serialize quote messages."""
        quote_list = instance.quote
        if not quote_list:
            return []
        data_quote = []
        quote_list = (
            quote_list if isinstance(quote_list, list) else [quote_list]
        )
        for message_uuid in quote_list:
            try:
                if isinstance(message_uuid, str):
                    message_uuid_obj = uuid.UUID(message_uuid)
                elif isinstance(message_uuid, uuid.UUID):
                    message_uuid_obj = message_uuid
                else:
                    continue
                message = ChatMessage.objects.filter(
                    uuid=message_uuid_obj
                ).first()
                if message:
                    data_quote.append(
                        ChatMessageSerializer(
                            message, context={"is_quote": True}
                        ).data
                    )
            except (ValueError, TypeError):
                continue
        return data_quote

    def get_chat_files(self, obj):
        """
        Handle get list chat_files of message
        """
        if self.context.get("is_quote", False):
            return ChatFileSerializer(obj.chat_files.all(), many=True).data

        if obj.deleted_at is not None:
            return []

        return ChatFileSerializer(obj.chat_files.all(), many=True).data

    def get_tasks(self, obj):
        """
        Handle get list tasks of message
        """
        if not obj.tasks:
            return []

        tasks = obj.tasks.filter(deleted_at__isnull=True).all()
        return TaskForChatMessageSerializer(tasks, many=True).data

    def get_message(self, obj):
        """
        Returns none message when deleted.
        """
        if self.context.get("is_quote", False):
            return obj.message

        return obj.message if not obj.deleted_at else None

    def get_schedule(self, obj):
        """
        Return schedule object for given chat room.
        """
        return (
            {
                "id": obj.schedule_id,
                "title": obj.schedule.title,
                "is_all_day": obj.schedule.is_all_day,
            }
            if obj.schedule_id
            else None
        )

    def get_reactions(self, obj):
        """
        Returns reactions of message
        """
        reacts = (
            obj.reactions.values("icon")
            .annotate(users=Count("user"))
            .order_by("icon")
        )

        response_data = []
        for react in reacts:
            users = obj.reactions.filter(icon=react["icon"]).values_list(
                "user", flat=True
            )
            response_data.append({"icon": react["icon"], "users": list(users)})

        return response_data

    def get_is_bookmark(self, obj):
        """Get is bookmark"""
        request = self.context.get("request")
        if not request:
            return False

        bookmark = obj.bookmarks.filter(user=request.user).first()
        return bool(bookmark and bookmark.bookmark_at)


class ChatMessageBookMarkSerializer(ChatMessageSerializer):
    """
    Chat message bookmark serializer
    """

    chat_room = serializers.SerializerMethodField()
    bookmark_at = serializers.SerializerMethodField()
    is_bookmark = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "uuid",
            "chat_room",
            "message",
            "sender",
            "is_edited",
            "created_at",
            "deleted_at",
            "bookmark_at",
            "is_bookmark",
            "type",
            "task",
            "submit_level",
            "schedule_changes",
            "schedule",
            "mentions",
            "tasks",
            "quote",
            "reply",
            "reactions",
            "chat_files",
        ]

    def get_chat_room(self, obj):
        """
        Get chat room of chat message
        """
        chat_room = obj.chat_room
        return {
            "id": chat_room.id,
            "name": chat_room.name,
            "code": chat_room.code,
            "type": chat_room.type,
        }

    def get_bookmark_at(self, obj):
        """Get bookmark_at"""
        return obj.bookmark_at

    def get_is_bookmark(self, obj):
        """Get is bookmark"""
        return obj.is_bookmark


class BookMarkSerializer(serializers.Serializer):
    """
    Bookmark serializer
    """

    bookmark_at = serializers.DateTimeField(allow_null=True, required=False)


class ReactionSerializer(serializers.Serializer):
    """
    Reaction serializer
    """

    icon = serializers.CharField(max_length=255, required=True)


class SendMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for send message
    """

    file_uuids = serializers.ListField(
        required=False, child=serializers.UUIDField()
    )
    mentions = CreationDataUserWithMainOrganizationSerializer(
        many=True, read_only=True
    )
    mention_ids = serializers.PrimaryKeyRelatedField(
        source="mentions",
        queryset=User.objects.all(),
        write_only=True,
        many=True,
        required=False,
        allow_null=False,
    )
    tasks = TaskForChatMessageSerializer(many=True, read_only=True)
    task_ids = serializers.PrimaryKeyRelatedField(
        source="tasks",
        queryset=Task.objects.all(),
        write_only=True,
        many=True,
        required=False,
        allow_null=False,
    )
    quote = serializers.ListField(
        required=False, allow_null=True, child=serializers.UUIDField()
    )
    reply_uuid = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = ChatMessage
        fields = [
            "uuid",
            "message",
            "type",
            "mentions",
            "mention_ids",
            "tasks",
            "task_ids",
            "quote",
            "reply_uuid",
            "file_uuids",
        ]

    def validate(self, attrs):
        """Validate send message"""
        reply_uuid = attrs.pop("reply_uuid", None)
        if reply_uuid:
            if message := ChatMessage.objects.filter(uuid=reply_uuid).first():
                attrs["reply"] = message
            else:
                raise NotFound({"detail": ERROR_MESSAGES["message_not_exists"]})

        quote = attrs.get("quote")
        if quote:
            quote_list = []
            for uuid in quote:
                if uuid:
                    if message := ChatMessage.objects.filter(uuid=uuid).first():
                        quote_list.append(str(uuid))
                    else:
                        raise NotFound(
                            {"detail": ERROR_MESSAGES["message_not_exists"]}
                        )
            attrs["quote"] = quote_list

        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("uuid", None)  # Remove uuid when update
        return super().update(instance, validated_data)


class ChatRoomsParticipantsSerializer(serializers.ModelSerializer):
    """
    Serializer for Chat rooms participants
    """

    code = serializers.CharField(source="chat_room.code", read_only=True)
    type = serializers.CharField(source="chat_room.type", read_only=True)
    name = serializers.SerializerMethodField(read_only=True)
    last_message_at = serializers.SerializerMethodField(read_only=True)
    participants = serializers.SerializerMethodField(read_only=True)
    chat_room = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatRoomsParticipants
        fields = [
            "user",
            "code",
            "name",
            "chat_room",
            "type",
            "unread_messages",
            "pin_at",
            "last_message_at",
            "participants",
            "is_muted",
        ]

    def get_name(self, obj):
        """
        Get name of chat room for given chat room
        """
        chat_room = obj.chat_room

        match chat_room.type:
            case ChatRoomTypes.SELF.value:
                room_name = obj.user.profile.full_name
            case ChatRoomTypes.PRIVATE.value:
                receive_user = chat_room.participants.exclude(
                    id=obj.user.id
                ).first()
                room_name = (
                    receive_user.profile.full_name if receive_user else None
                )
            case __:
                room_name = chat_room.name

        return room_name

    def get_chat_room(self, obj):
        """
        Get chat room of chat room participants
        """
        chat_room = obj.chat_room

        avatar = chat_room.avatar
        avatar_color = chat_room.avatar_color
        room_name = chat_room.name

        match chat_room.type:
            case ChatRoomTypes.SELF.value:
                room_name = obj.user.profile.full_name
                avatar = obj.user.avatar
                avatar_color = obj.user.avatar_color
            case ChatRoomTypes.PRIVATE.value:
                receive_user = chat_room.participants.exclude(
                    id=obj.user.id
                ).first()
                room_name = (
                    receive_user.profile.full_name if receive_user else None
                )
                avatar = receive_user.avatar
                avatar_color = receive_user.avatar_color

        return {
            "id": chat_room.id,
            "code": chat_room.code,
            "type": chat_room.type,
            "name": room_name,
            "avatar": get_signed_url(avatar, AVATAR_GCS_EXPIRATION_SECONDS)
            if avatar
            else None,
            "avatar_color": avatar_color,
        }

    def get_last_message_at(self, obj):
        """
        Get last message of chat room for given chat room
        """
        try:
            latest_message = obj.chat_room.chat_messages.latest("created_at")
            latest_created_at = latest_message.created_at
        except ObjectDoesNotExist:
            latest_created_at = obj.chat_room.created_at

        return latest_created_at.isoformat()

    def get_participants(self, obj):
        """
        Get participants of chat room for given chat room
        """
        participants = obj.chat_room.participants.all()
        return CreationDataUserWithMainOrganizationSerializer(
            participants, many=True
        ).data


class ChatRoomsParticipantsWebSocketSerializer(ChatRoomsParticipantsSerializer):
    """
    Serializer for Chat rooms participants
    """

    class Meta:
        model = ChatRoomsParticipants
        fields = [
            "code",
            "name",
            "type",
            "chat_room",
            "unread_messages",
            "last_message_at",
            "pin_at",
            "participants",
        ]


class ChatRoomMemoSerializer(serializers.Serializer):
    """Serializer for chat room memo"""

    memo = serializers.CharField(required=False, allow_null=True)


class ChunkFileSerializer(serializers.ModelSerializer):
    """
    Serializer for chunk file upload
    """

    class Meta:
        model = ChunkFile
        fields = [
            "file_uuid",
            "file_name",
            "file_type",
            "file_size",
            "chunk_index",
            "total_chunks",
            "chunk_file",
        ]

    def validate(self, attrs):
        """Validate send file size"""
        file_size = attrs.get("file_size", None)
        if file_size:
            if file_size > FILE_UPLOAD_MAX_SIZE:
                raise serializers.ValidationError(
                    {
                        "detail": ERROR_MESSAGES["max_file_size"].format(
                            max_size="5GB"
                        )
                    }
                )

        return attrs
