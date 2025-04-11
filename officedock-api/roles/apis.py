from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from rest_framework.permissions import IsAuthenticated

from chat.constants import WebSocketEventType
from roles.constants import ROLE_PERMISSION_BY_OPTIONS
from roles.filters import RoleFilter
from common.utils import send_web_socket_event
from roles.serializers import (
    RolePermissionForCreateSerializer,
    RolePermissionSerializer,
)
from roles.utils import create_role_with_permissions
from users.constants import RoleTypes
from users.models import Role
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
            .filter(Q(system_role=True) | Q(company=self.request.user.company))
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
        role = serializer.save(
            company=self.request.user.company, system_role=False
        )
        for key, action in permissions.items():
            # ======== This code is update permission ADD, DELETE base on UPDATE  =======
            permissions[key] = ROLE_PERMISSION_BY_OPTIONS[action["actions"]]
            # ======== End update permission =======

        create_role_with_permissions(role, permissions)

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

        role = self.get_object()
        validated_data = serializer.validated_data
        permissions = validated_data.pop("permissions")
        serializer.save()
        role_details = role.role_details.values(
            "selection_result", "permission__name"
        )
        parsed_queryset = {}
        is_matching = True
        for item in role_details:
            permission = item["permission__name"].split("_")
            group, action = "_".join(permission[:-1]), permission[-1]
            if group not in parsed_queryset:
                parsed_queryset[group] = {}
            parsed_queryset[group][action] = item["selection_result"]

        for key, action in permissions.items():
            if key not in parsed_queryset:
                is_matching = False
                break
            # ======== This code is update permission ADD, DELETE base on UPDATE  =======
            permissions[key] = ROLE_PERMISSION_BY_OPTIONS[action["actions"]]
            # ======== End update permission =======

            for action, expected_value in ROLE_PERMISSION_BY_OPTIONS[
                action["actions"]
            ].items():
                if parsed_queryset[key].get(action, None) != expected_value:
                    is_matching = False
                    break
        if not is_matching:
            for user in role.users.all():
                send_web_socket_event(
                    {
                        "is_change_role": True,
                        "action": WebSocketEventType.CHANGE_ROLE.value,
                    },
                    user=user,
                )
        create_role_with_permissions(role, permissions)

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
                        normal_role, through_defaults={"company": user.company}
                    )
                send_web_socket_event(
                    {
                        "is_change_role": True,
                        "action": WebSocketEventType.CHANGE_ROLE.value,
                    },
                    user=user,
                )

        return super().perform_destroy(instance)
