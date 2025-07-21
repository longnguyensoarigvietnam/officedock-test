from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from rest_framework.permissions import IsAuthenticated

from chat.constants import WebSocketEventType
from roles.constants import (
    Screens,
    ROLE_PERMISSION_BY_OPTIONS,
    SKILL_MAP_ROLE_PERMISSION_BY_OPTIONS,
)
from roles.filters import RoleFilter
from common.utils import send_web_socket_event
from roles.serializers import (
    RolePermissionForCreateSerializer,
    RolePermissionSerializer,
)
from roles.utils import create_role_with_permissions
from users.constants import RoleTypes
from users.models import LoginToken, Role
from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES


@extend_schema(tags=["System > Role"])
class RoleViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for role.
    """

    queryset = Role.objects.order_by("id").all()
    serializer_class = RolePermissionSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = RoleFilter

    def get_queryset(self):
        """
        Filter roles in company
        """
        return (
            super()
            .get_queryset()
            .filter(
                Q(system_role=True) | Q(company_id=self.request.user.company_id)
            )
        )

    def get_serializer_context(self):
        """
        Add request to context
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_serializer_class(self):
        """
        Serializer classification by action
        """
        if self.action == "retrieve":
            return RolePermissionSerializer

        if self.action != "list":
            return RolePermissionForCreateSerializer

        return super().get_serializer_class()

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Custom logic create
        """
        validated_data = serializer.validated_data
        permissions = validated_data.pop("permissions")
        permissions_to_create = {}

        for key, action in permissions.items():
            # ======== This code is update permission ADD, DELETE base on UPDATE  =======
            if key == Screens.SKILL_MAP.value:
                skillmap_permisions = SKILL_MAP_ROLE_PERMISSION_BY_OPTIONS[
                    action["actions"]
                ]
                for k, ac in skillmap_permisions.items():
                    permissions_to_create[k] = ac
            else:
                permissions_to_create[key] = ROLE_PERMISSION_BY_OPTIONS[
                    action["actions"]
                ]
            # ======== End update permission =======

        role = serializer.save(
            company_id=self.request.user.company_id, system_role=False
        )

        create_role_with_permissions(role, permissions_to_create)

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Custom logic update
        """
        role = self.get_object()
        if role.system_role:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["cannot_edit_system_role"]}
            )

        validated_data = serializer.validated_data
        permissions = validated_data.pop("permissions")
        before_role_details = sorted(
            list(
                role.role_details.values("selection_result", "permission__name")
            ),
            key=lambda x: (x["permission__name"], x["selection_result"]),
        )
        serializer.save()

        # Compare specified permissions with request data
        permissions_to_update = {}
        for key, action in permissions.items():
            if key == Screens.SKILL_MAP.value:
                skillmap_permisions = SKILL_MAP_ROLE_PERMISSION_BY_OPTIONS[
                    action["actions"]
                ]
                for k, ac in skillmap_permisions.items():
                    permissions_to_update[k] = ac
            else:
                permissions_to_update[key] = ROLE_PERMISSION_BY_OPTIONS[
                    action["actions"]
                ]

        create_role_with_permissions(role, permissions_to_update)

        after_role_details = sorted(
            list(
                role.role_details.values("selection_result", "permission__name")
            ),
            key=lambda x: (x["permission__name"], x["selection_result"]),
        )

        if before_role_details != after_role_details:
            for user in role.users.all():
                # Block access token for logged user
                LoginToken.objects.filter(user=user).update(is_block=True)
                send_web_socket_event(
                    {
                        "is_change_role": True,
                        "action": WebSocketEventType.CHANGE_ROLE.value,
                    },
                    user=user,
                )

    def perform_destroy(self, instance):
        """
        Check related model before delete role.
        """
        if instance.system_role:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["cannot_delete_system_role"]}
            )

        if instance.users.exists():
            normal_role = Role.objects.filter(
                name=RoleTypes.GENERAL.value
            ).first()
            for user in instance.users.all():
                if user.roles.count() == 1:
                    user.roles.add(
                        normal_role,
                        through_defaults={"company_id": user.company_id},
                    )
                # Block access token for logged user
                LoginToken.objects.filter(user=user).update(is_block=True)
                send_web_socket_event(
                    {
                        "is_change_role": True,
                        "action": WebSocketEventType.CHANGE_ROLE.value,
                    },
                    user=user,
                )

        return super().perform_destroy(instance)
