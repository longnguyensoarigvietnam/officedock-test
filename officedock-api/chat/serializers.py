from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from chat.models import ChatMessage, ChatRoom, ChatRoomsParticipants
from chat.constants import ChatRoomTypes
from common.serializers import (
    CreationDataOrganizationSerializer,
    CreationDataUserWithMainOrganizationSerializer,
)
from submit_levels.models import SubmitLevelHistory
from tags.serializers import BaseTagSerializer
from users.models import User
from tasks.models import Task


class CreationDataUserForChatSerializer(serializers.ModelSerializer):
    """
    Serializer for creation data user for chat.
    """

    full_name = serializers.SerializerMethodField()
    organizations = CreationDataOrganizationSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = User
        fields = ["id", "full_name", "organizations"]

    def get_full_name(self, obj):
        """
        Return full name of user.
        """
        return obj.profile.full_name


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

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "name",
            "code",
            "participants",
            "participant_ids",
            "type",
        ]
        read_only_fields = ["id", "code", "type"]

    def validate(self, data):
        """
        Validation data
        """
        request = self.context.get("request")
        participants = data.get("participant_ids")

        if participants:
            for participant in participants:
                if participant.company != request.user.company:
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
            "code",
            "participants",
            "type",
            "unread_messages",
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

    tags = BaseTagSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = ["id", "title", "deadline", "tags"]


class SubmitLevelForChatMessageSerializer(serializers.ModelSerializer):
    """
    Submit Level serializer for chat message.
    """

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


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Chat massage
    """

    message = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField(read_only=True)
    sender = CreationDataUserForChatSerializer()
    task = TaskForChatMessageSerializer()
    submit_level = SubmitLevelForChatMessageSerializer()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "uuid",
            "message",
            "sender",
            "is_edited",
            "created_at",
            "deleted_at",
            "task",
            "submit_level",
            "schedule_changes",
            "schedule",
            "type",
            "mentions",
        ]
        read_only_fields = ["id", "uuid"]

    def get_message(self, obj):
        """
        Returns none message when deteled.
        """
        return obj.message if obj.deleted_at is None else None

    def get_schedule(self, obj):
        """
        Return schedule object for given chat room.
        """
        return (
            {
                "id": obj.schedule_id,
                "title": obj.schedule.title,
            }
            if obj.schedule_id
            else None
        )


class SendMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for send message
    """

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

    class Meta:
        model = ChatMessage
        fields = [
            "uuid",
            "message",
            "type",
            "mentions",
            "mention_ids",
        ]

    def update(self, instance, validated_data):
        validated_data.pop("uuid", None)  # Remove uuid when update
        return super().update(instance, validated_data)


class ChatRoomsParticipantsSerializer(serializers.ModelSerializer):
    """
    Serializer for Chat rooms participants
    """

    code = serializers.SerializerMethodField(read_only=True)
    name = serializers.SerializerMethodField(read_only=True)
    type = serializers.SerializerMethodField(read_only=True)
    last_message_at = serializers.SerializerMethodField(read_only=True)
    participants = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatRoomsParticipants
        fields = [
            "code",
            "name",
            "type",
            "unread_messages",
            "hidden_at",
            "pin_at",
            "last_message_at",
            "participants",
        ]

    def get_code(self, obj):
        """
        Get code of chat room for given chat room
        """
        return obj.chat_room.code

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

    def get_type(self, obj):
        """
        Get type of chat room for given chat room
        """
        return obj.chat_room.type

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
            "unread_messages",
            "last_message_at",
            "pin_at",
            "participants",
        ]
