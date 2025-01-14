from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework.exceptions import ValidationError, PermissionDenied

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES
from base.permissions import ActionPermission
from roles.constants import Screens
from chat.constants import (
    ChatMessageTypes,
    ChatRoomTypes,
    ChatRoomNames,
    WebSocketEventType,
)
from chat.models import ChatRoom
from chat.serializers import (
    ChatRoomsParticipantsWebSocketSerializer,
    ChatMessageSerializer,
)
from common.utils import send_web_socket_event
from skills.constants import get_next_level
from skills.models import SkillMap
from submit_levels.constants import SubmitLevelStatus
from submit_levels.filters import SubmitLevelFilter
from submit_levels.models import SubmitLevelHistory
from submit_levels.serializers import (
    SubmitLevelSerializer,
    CreateSubmitLevelSerializer,
    UpdateSubmitLevelSerializer,
    ListSubmitLevelSerializer,
)


@extend_schema(tags=["System > Submit Level"])
class SubmitLevelViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
):
    """
    Endpoint API Submit level
    """

    queryset = SubmitLevelHistory.objects.all()
    serializer_class = SubmitLevelSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
    ]

    filterset_class = SubmitLevelFilter
    screen_name = Screens.SUBMIT_LEVEL.value

    def get_queryset(self):
        """Filtering by company"""
        company = self.request.user.company
        return super().get_queryset().filter(company=company).order_by("id")

    def get_serializer(self, *args, **kwargs):
        """Get serializer by action"""
        if self.action == "create":
            return CreateSubmitLevelSerializer(*args, **kwargs)
        elif self.action == "update":
            return UpdateSubmitLevelSerializer(*args, **kwargs)
        elif self.action == "list":
            return ListSubmitLevelSerializer(
                *args, **kwargs, context={"request": self.request}
            )

        return super().get_serializer(*args, **kwargs)

    def _send_to_chat(self, user, submit_level):
        """
        Handle send to chat of user
        """
        message_data = {
            "sender": self.request.user,
            "company": user.company,
            "submit_level": submit_level,
            "type": ChatMessageTypes.SUBMIT_LEVEL_SKILL.value,
        }

        skill_room, created = ChatRoom.objects.get_or_create(
            type=ChatRoomTypes.SKILL.value,
            chat_rooms_participants__user=user,
            defaults={
                "company": user.company,
                "type": ChatRoomTypes.SKILL.value,
                "name": ChatRoomNames.SKILL_UP.value,
            },
        )
        if created:
            skill_room.participants.set(
                {user}, through_defaults={"company": user.company}
            )
        skill_msg = skill_room.chat_messages.create(**message_data)
        chat_room_participant = skill_room.chat_rooms_participants.filter(
            user__id=user.id
        ).first()
        chat_room_participant.unread_messages = (
            chat_room_participant.unread_messages + 1
        )
        chat_room_participant.save()
        send_web_socket_event(
            {
                "client_id": None,
                "action": WebSocketEventType.MESSAGE.value,
                "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                    chat_room_participant
                ).data,
                "chat_message": ChatMessageSerializer(skill_msg).data,
            },
            chat_room_participant,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        """Handle update submit level history"""
        user = self.request.user
        instance = serializer.instance
        status = serializer.validated_data.get("status")
        # Allow to edit submit when staff isn't logged user
        if user == instance.staff:
            raise PermissionDenied(
                {"detail": ERROR_MESSAGES["permission_denied"]}
            )
        if instance.status in [
            SubmitLevelStatus.APPROVE.value,
            SubmitLevelStatus.REJECT.value,
        ]:
            raise ValidationError({"detail": ERROR_MESSAGES["cannot_updated"]})

        if status == SubmitLevelStatus.APPROVE.value:
            next_level = get_next_level(instance.level_before_submit)
            SkillMap.objects.filter(
                organization=instance.organization,
                staff=instance.staff,
                skill=instance.skill,
            ).update(
                level=next_level,
            )
            submit_level = serializer.save(level_after_submit=next_level)
        else:
            submit_level = serializer.save()

        if status in [
            SubmitLevelStatus.APPROVE.value,
            SubmitLevelStatus.REJECT.value,
        ]:
            self._send_to_chat(instance.staff, submit_level)

    @transaction.atomic()
    def perform_create(self, serializer):
        """Handle create submit level"""
        user = self.request.user
        staff = serializer.validated_data.get("staff")
        # Allow to submit when staff is logged user
        if user != staff:
            raise PermissionDenied(
                {"detail": ERROR_MESSAGES["permission_denied"]}
            )

        serializer.save()
