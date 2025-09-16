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
from organizations.models import Organization
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
from skills.constants import (
    DEFAULT_TIME,
    SkillLevel as SkillLevelEnum,
    SkillStep,
)
from skills.models import SkillMap, SkillMapSkillLevel, Skill
from skills.utils import get_lookback_time, get_next_progression
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory
from submit_levels.serializers import (
    CreateSubmitLevelSerializer,
    UpdateSubmitLevelSerializer,
    ListSubmitLevelSerializer,
    DetailSubmitLevelSerializer,
)
from users.constants import (
    COIN_SKILL_UP_STEP1,
    COIN_SKILL_UP_STEP2,
    COIN_SKILL_UP_STEP3,
    TransactionTypes,
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
    screen_name = Screens.TEAM_DOCK_SKILL_MAP.value

    def get_queryset(self):
        """Filtering by company"""
        company_id = self.request.user.company_id
        return (
            super().get_queryset().filter(company_id=company_id).order_by("id")
        )

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
            "company_id": user.company_id,
            "submit_level": submit_level,
            "type": ChatMessageTypes.CREATE_SUBMIT_LEVEL_SKILL.value
            if is_create
            else ChatMessageTypes.SUBMIT_LEVEL_SKILL.value,
        }

        skill_room, created = ChatRoom.objects.get_or_create(
            type=ChatRoomTypes.SKILL.value,
            chat_rooms_participants__user=user,
            defaults={
                "company_id": user.company_id,
                "name": ChatRoomNames.SKILL_UP.value,
            },
        )
        if created:
            skill_room.participants.set(
                {user}, through_defaults={"company_id": user.company_id}
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

        # Allow to edit submit when staff isn't logged user
        if user == instance.staff and status in [
            SubmitLevelStatus.APPROVE.value,
            SubmitLevelStatus.REJECT.value,
        ]:
            raise PermissionDenied(
                {"detail": ERROR_MESSAGES["permission_denied"]}
            )
        if instance.status in [
            SubmitLevelStatus.APPROVE.value,
            SubmitLevelStatus.REJECT.value,
        ]:
            raise ValidationError({"detail": ERROR_MESSAGES["cannot_updated"]})
        # Get current skill map
        skill_map = SkillMap.objects.filter(
            organization=instance.organization,
            skill=instance.skill,
            staff=instance.staff,
            step=instance.step_before_submit,
        ).first()
        if status == SubmitLevelStatus.APPROVE.value:
            submit_level = self._handle_approve_submit_level(
                instance,
                skill_map,
                serializer,
                serializer_data,
            )
        elif status == SubmitLevelStatus.REJECT.value:
            submit_level = self._handle_reject_submit_level(
                instance, skill_map, serializer, serializer_data
            )
        else:
            submit_level = serializer.save()
            # Send websocket to approver chat with status APPLYING
            self._send_to_chat(
                submit_level.approver, submit_level, is_create=True
            )

        if status in [
            SubmitLevelStatus.APPROVE.value,
            SubmitLevelStatus.REJECT.value,
        ]:
            self._send_to_chat(instance.staff, submit_level)

    def _award_skill_up_coins(
        self, instance, step_after_submit, level_after_submit, has_next_step
    ):
        """
        Award coins based on skill progression.

        Args:
            instance: SubmitLevelHistory instance
            step_after_submit: The step after submission
            level_after_submit: The level after submission
            has_next_step: Boolean indicating if there's a next step available
        """
        # Define coin award rules
        coin_rules = [
            # Case: No next step available
            {
                "condition": (
                    not has_next_step
                    and step_after_submit == SkillStep.STEP_1.value
                    and level_after_submit == SkillLevelEnum.LEVEL_3.value
                ),
                "coin_amount": COIN_SKILL_UP_STEP1,
                "description": "Step 1 completed (no next step)",
            },
            {
                "condition": (
                    not has_next_step
                    and step_after_submit == SkillStep.STEP_2.value
                    and level_after_submit == SkillLevelEnum.LEVEL_3.value
                ),
                "coin_amount": COIN_SKILL_UP_STEP2,
                "description": "Step 2 completed (no next step)",
            },
            {
                "condition": (
                    not has_next_step
                    and instance.step_before_submit == SkillStep.STEP_3.value
                    and instance.level_before_submit
                    == SkillLevelEnum.LEVEL_3.value
                ),
                "coin_amount": COIN_SKILL_UP_STEP3,
                "description": "Step 3 completed (no next step)",
            },
            # Case: Has next step available
            {
                "condition": (
                    has_next_step
                    and step_after_submit == SkillStep.STEP_2.value
                    and level_after_submit == SkillLevelEnum.LEVEL_1.value
                ),
                "coin_amount": COIN_SKILL_UP_STEP1,
                "description": "Step 1 completed (has next step)",
            },
            {
                "condition": (
                    has_next_step
                    and step_after_submit == SkillStep.STEP_3.value
                    and level_after_submit == SkillLevelEnum.LEVEL_1.value
                ),
                "coin_amount": COIN_SKILL_UP_STEP2,
                "description": "Step 2 completed (has next step)",
            },
            {
                "condition": (
                    has_next_step
                    and instance.step_before_submit == SkillStep.STEP_3.value
                    and instance.level_before_submit
                    == SkillLevelEnum.LEVEL_3.value
                ),
                "coin_amount": COIN_SKILL_UP_STEP3,
                "description": "Step 3 completed (has next step)",
            },
        ]

        # Find matching rule and award coins
        for rule in coin_rules:
            if rule["condition"]:
                instance.staff.received_coin(
                    rule["coin_amount"],
                    transaction_type=TransactionTypes.SKILL_UP.value,
                )
                break

    def _handle_approve_submit_level(
        self, instance, skill_map, serializer, serializer_data
    ):
        """
        Handle approve submit level.
        Update the status of skill_map and create a new skill_map if all levels have been completed.
        Also update the complete status of the current skill map level and create a new skill map for the next level.
        """
        look_back_interval = serializer_data.pop("look_back_interval", None)
        look_back_type = serializer_data.pop("look_back_type", None)
        (
            step_after_submit,
            level_after_submit,
            has_next_step,
        ) = get_next_progression(
            instance.step_before_submit, instance.level_before_submit
        )
        # Update current skill map skill level
        skill_map.skill_map_skill_levels.filter(
            level=instance.level_before_submit
        ).update(is_complete=True)
        is_not_max_level = True
        if step_after_submit != instance.step_before_submit:
            # Update current skill map
            SkillMap.objects.filter(id=skill_map.id).update(is_complete=True)
            skill = Skill.objects.filter(parent_id=instance.skill.id).first()
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
        elif (
            instance.level_before_submit == SkillLevelEnum.LEVEL_3.value
            and not Skill.objects.filter(parent_id=instance.skill.id).exists()
        ):
            # Update last skill map
            SkillMap.objects.filter(id=skill_map.id).update(is_complete=True)

        # Get next skill level
        skill_level = skill_map.skill.skill_levels.filter(
            level=level_after_submit
        ).first()
        if skill_level and is_not_max_level:
            next_submit_at, start_look_back_at = get_lookback_time(
                skill_level.look_back_type,
                skill_level.look_back_interval,
            )
            items = [
                {"item": item, "is_checked": False}
                for item in skill_level.items
            ]
            # Create new Skill Map Skill Level
            SkillMapSkillLevel.objects.create(
                skill_level=skill_level,
                level=skill_level.level,
                skill_map=skill_map,
                company=instance.company,
                start_lookback_at=start_look_back_at,
                next_submit_at=next_submit_at,
                skill=skill_level.skill,
                measure_time=skill_level.measure_time,
                measure_count=skill_level.measure_count,
                look_back_interval=look_back_interval
                if look_back_interval
                else skill_level.look_back_interval,
                look_back_type=look_back_type
                if look_back_type
                else skill_level.look_back_type,
                items=items,
            )
        (
            step_after_submit,
            level_after_submit,
            has_next_step,
        ) = get_next_progression(
            instance.step_before_submit,
            instance.level_before_submit,
            skill=instance.skill,
        )

        # Award coins based on skill progression
        self._award_skill_up_coins(
            instance, step_after_submit, level_after_submit, has_next_step
        )

        return serializer.save(
            level_after_submit=level_after_submit,
            step_after_submit=step_after_submit,
        )

    def _handle_reject_submit_level(
        self, instance, skill_map, serializer, serializer_data
    ):
        """
        Handle reject submit level and reset conditional of skill map level from serializer_data
        """
        measure_count = serializer_data.pop("measure_count", None)
        measure_time = serializer_data.pop("measure_time", None)
        look_back_interval = serializer_data.pop("look_back_interval", None)
        look_back_type = serializer_data.pop("look_back_type", None)
        items = serializer_data.pop("items", None)

        # Get next skill level
        skill_map_level = skill_map.skill_map_skill_levels.filter(
            level=instance.level_before_submit
        ).first()
        start_lookback_at = now()
        if (
            look_back_type == skill_map_level.look_back_type
            and look_back_interval == skill_map_level.look_back_interval
        ):
            start_lookback_at = skill_map_level.start_lookback_at
        next_submit_at, start_look_back_at = get_lookback_time(
            look_back_type,
            look_back_interval,
            start_lookback_at=start_lookback_at,
        )
        # Update current skill level
        skill_map.skill_map_skill_levels.filter(
            level=instance.level_before_submit
        ).update(
            measure_time=measure_time,
            actual_measure_time=DEFAULT_TIME,
            measure_count=measure_count,
            actual_measure_count=0,
            look_back_interval=look_back_interval,
            look_back_type=look_back_type,
            start_lookback_at=start_look_back_at,
            next_submit_at=next_submit_at,
            items=items,
            popup=True,
        )
        return serializer.save()

    @transaction.atomic()
    def create(self, request, *args, **kwargs):
        """Handle create submit level"""
        user = self.request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        staff = serializer_data.get("staff")
        approver = serializer_data.get("approver")
        skill_map_level = serializer_data.pop("skill_map_level", None)
        items = serializer_data.pop("items", None)
        submit_level = serializer_data.pop("submit_level", None)

        # Allow to submit when staff is logged user
        if user != staff:
            raise PermissionDenied(
                {"detail": ERROR_MESSAGES["permission_denied"]}
            )
        # Get current skill map
        if skill_map_level:
            skill_map_level.items = items
            skill_map_level.save()
        # Update if exists submit level
        if submit_level:
            submit_level.staff = serializer_data.get("staff")
            submit_level.organization = serializer_data.get("organization")
            submit_level.skill = serializer_data.get("skill")
            submit_level.step_before_submit = serializer_data.get(
                "step_before_submit"
            )
            submit_level.approver = serializer_data.get("approver")
            submit_level.level_before_submit = serializer_data.get(
                "level_before_submit"
            )
            submit_level.status = serializer_data.get("status")
            submit_level.save()
        else:
            submit_level = serializer.save()

        # Send websocket to chat
        if serializer_data.get("status") == SubmitLevelStatus.APPLYING.value:
            self._send_to_chat(approver, submit_level, is_create=True)

        return self.response_ok(ListSubmitLevelSerializer(submit_level).data)

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
        organizations = Organization.objects.filter(
            company_id=user.company_id,
        ).order_by("-created_at")
        if organization_id:
            organizations = organizations.filter(id=organization_id)

        # Handle filter data by permissions
        organizations = self.filter_queryset(organizations)

        data = []
        for organization in organizations:
            submit_levels = organization.submit_level_histories.filter(
                status=SubmitLevelStatus.APPLYING.value, approver=user
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
