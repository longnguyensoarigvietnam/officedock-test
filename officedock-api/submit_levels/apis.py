from django.db import transaction
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.exceptions import PermissionDenied, ValidationError

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
from skills.constants import get_next_progression
from skills.models import SkillMap, SkillMapSkillLevel, Skill
from skills.utils import get_lookback_time
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory
from submit_levels.serializers import (
    CreateSubmitLevelSerializer,
    UpdateSubmitLevelSerializer,
    ListSubmitLevelSerializer,
    DetailSubmitLevelSerializer,
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
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
    ]
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
        elif self.action == "retrieve":
            return DetailSubmitLevelSerializer(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)

    def _send_to_chat(self, user, submit_level, is_create=False):
        """
        Handle send to chat of user
        """
        message_data = {
            "sender": self.request.user,
            "company": user.company,
            "submit_level": submit_level,
            "type": ChatMessageTypes.CREATE_SUBMIT_LEVEL_SKILL.value
            if is_create
            else ChatMessageTypes.SUBMIT_LEVEL_SKILL.value,
        }

        skill_room, created = ChatRoom.objects.get_or_create(
            type=ChatRoomTypes.SKILL.value,
            chat_rooms_participants__user=user,
            defaults={
                "company": user.company,
                "name": ChatRoomNames.SKILL_UP.value,
            },
        )
        if created:
            skill_room.participants.set(
                {user}, through_defaults={"company": user.company}
            )
        skill_msg = skill_room.chat_messages.create(**message_data)
        chat_room_participant = skill_room.chat_rooms_participants.filter(
            user_id=user.id
        ).first()
        chat_room_participant.unread_messages = (
            chat_room_participant.unread_messages + 1
        )
        chat_room_participant.save()

        # Send web socket to user role admin
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
        serializer_data = serializer.validated_data
        status = serializer_data.get("status")
        measure_count = serializer_data.pop("measure_count", None)
        measure_time = serializer_data.pop("measure_time", None)
        look_back_interval = serializer_data.pop("look_back_interval", None)
        look_back_type = serializer_data.pop("look_back_type", None)
        items = serializer_data.pop("items", None)

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
            step_after_submit, level_after_submit = get_next_progression(
                instance.step_before_submit, instance.level_before_submit
            )
            # Get current skill map
            skill_map = SkillMap.objects.filter(
                organization=instance.organization,
                skill=instance.skill,
                staff=instance.staff,
                step=instance.step_before_submit,
            ).first()
            # Update current skill map skill level
            skill_map.skill_map_skill_levels.filter(
                level=instance.level_before_submit
            ).update(is_complete=True)
            is_not_max_level = True
            if step_after_submit != instance.step_before_submit:
                # Update current skill map
                SkillMap.objects.filter(
                    organization=instance.organization,
                    staff=instance.staff,
                    step=instance.step_before_submit,
                    skill=instance.skill,
                ).update(is_complete=True)
                skill = Skill.objects.filter(
                    parent__id=instance.skill.id
                ).first()
                if skill:
                    # Get next skill map
                    skill_map = SkillMap.objects.create(
                        company=instance.company,
                        skill=skill,
                        step=step_after_submit,
                        skill_parent=skill.parent,
                        staff=instance.staff,
                        organization=skill.organization,
                        is_valid=True,
                        is_complete=False,
                    )
                else:
                    is_not_max_level = False

            # Get next skill level
            skill_level = skill_map.skill.skill_levels.filter(
                level=level_after_submit
            ).first()
            next_submit_at = None
            start_look_back_at = None
            if skill_level and is_not_max_level:
                if skill_level.look_back_type:
                    next_submit_at = get_lookback_time(
                        skill_level.look_back_type,
                        skill_level.look_back_interval,
                    )
                    start_look_back_at = now()
                # Create new Skill Map Skill Level
                SkillMapSkillLevel.objects.create(
                    skill_level=skill_level,
                    level=skill_level.level,
                    skill_map=skill_map,
                    company=instance.company,
                    start_lookback_at=start_look_back_at,
                    next_submit_at=next_submit_at,
                )
            submit_level = serializer.save(
                level_after_submit=level_after_submit,
                step_after_submit=step_after_submit,
            )
        else:
            # Get current skill map
            skill_map = SkillMap.objects.filter(
                organization=instance.organization,
                staff=instance.staff,
                step=instance.step_before_submit,
                skill=instance.skill,
            ).first()
            next_submit_at = None
            if look_back_type and look_back_interval:
                next_submit_at = get_lookback_time(
                    look_back_type, look_back_interval
                )
            # Update current skill level
            skill_map_level = skill_map.skill_map_skill_levels.filter(
                level=instance.level_before_submit
            ).update(
                measure_time=measure_time,
                measure_count=measure_count,
                look_back_interval=look_back_interval,
                look_back_type=look_back_type,
                start_lookback_at=now(),
                next_submit_at=next_submit_at,
            )
            submit_level = serializer.save(items=items)

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
        approver = serializer.validated_data.get("approver")
        # Allow to submit when staff is logged user
        if user != staff:
            raise PermissionDenied(
                {"detail": ERROR_MESSAGES["permission_denied"]}
            )

        submit_level = serializer.save()

        # Send websocket to chat
        self._send_to_chat(approver, submit_level, is_create=True)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int, required=False)
        ]
    )
    def list(self, request):
        """
        Response list of submit levels
        """
        user = request.user
        organization_id = request.query_params.get("organization_id")
        # FIXME: Check role permissions for get list organizations
        organizations = user.organizations.all()
        if organization_id:
            organizations = organizations.filter(id=organization_id)
        data = []
        for organization in organizations:
            submit_levels = organization.submit_level_histories.filter(
                status=SubmitLevelStatus.APPLYING.value
            ).all()
            data.append(
                {
                    "organization_name": organization.name,
                    "submit_levels": ListSubmitLevelSerializer(
                        submit_levels, many=True
                    ).data,
                }
            )

        return self.response_ok(data)
