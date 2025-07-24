from collections import defaultdict
from rest_framework import serializers
from common.utils import to_camel_case
from users.models import Role
from roles.constants import (
    SKILL_MAP_ACTION_PERMISSION_BY_OPTIONS,
    TEAMDOCK_ROLE_PERMISSION_BY_OPTIONS,
    PermissionOptions,
    ROLE_PERMISSION_BY_OPTIONS,
    Screens,
)
from base.messages import ERROR_MESSAGES


class BaseActionsSerializer(serializers.Serializer):
    """
    Serializer for base actions.
    """

    actions = serializers.ChoiceField(
        choices=PermissionOptions.choices(),
    )


class PermissionForCreateSerializer(serializers.Serializer):
    """
    Serializer for permission.
    """

    my_task = BaseActionsSerializer()
    calendar = BaseActionsSerializer()
    calendar_management = BaseActionsSerializer()
    chat = BaseActionsSerializer()
    organization = BaseActionsSerializer()
    category = BaseActionsSerializer()
    skill = BaseActionsSerializer()
    tag = BaseActionsSerializer()
    user = BaseActionsSerializer()
    role = BaseActionsSerializer()
    category_hierarchy = BaseActionsSerializer()
    skill_map = BaseActionsSerializer()
    organization_skill = BaseActionsSerializer()
    submit_level = BaseActionsSerializer()
    statistic = BaseActionsSerializer()
    daily_report = BaseActionsSerializer()
    actual_duration = BaseActionsSerializer()
    list_member = BaseActionsSerializer()
    organization_hierarchy = BaseActionsSerializer()
    teamdock = BaseActionsSerializer()
    team_daily_report = BaseActionsSerializer()


class RolePermissionForCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for create role.
    """

    permissions = PermissionForCreateSerializer(write_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "permissions"]
        read_only_fields = ["id"]

    def validate_name(self, value):
        company_id = self.context.get("request").user.company_id
        instance = self.instance

        if (
            Role.objects.filter(company_id=company_id, name=value)
            .exclude(id=instance.id if instance else None)
            .exists()
        ):
            raise serializers.ValidationError(ERROR_MESSAGES["role_exists"])

        return value


class RolePermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for create role.
    """

    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ["id", "name", "system_role", "permissions"]
        read_only_fields = ["id"]

    def get_permissions(self, obj):
        """
        Get role permissions and format them into a structured response.
        """
        # Fetch and process permissions
        raw_permissions = obj.permissions.order_by("id").values_list(
            "name", "role_details__selection_result"
        )

        permissions = defaultdict(dict)
        for name, result in raw_permissions:
            screen_name, action = name.rsplit("_", 1)
            permissions[screen_name][action] = result

        # Return formatted result using list comprehension
        data = []
        has_get_skill_map = False
        for screen, actions in permissions.items():
            # Compare and get action
            if screen in [
                Screens.MY_TASK_SKILL_MAP.value,
                Screens.TEAM_DOCK_SKILL_MAP.value,
                Screens.SKILL_MAP_MANAGEMENT.value,
                Screens.SKILL_MAP_OTHER.value,
                Screens.SKILL_MAP.value,
            ]:
                # Handle get option data for skill-map
                if (
                    not has_get_skill_map
                    and screen == Screens.TEAM_DOCK_SKILL_MAP.value
                ):
                    for (
                        permission,
                        base_actions,
                    ) in SKILL_MAP_ACTION_PERMISSION_BY_OPTIONS.items():
                        if base_actions == actions:
                            data.append(
                                {
                                    "screen_name": to_camel_case(
                                        Screens.SKILL_MAP.value
                                    ),
                                    "actions": permission,
                                }
                            )
                            has_get_skill_map = True
                            break
            elif screen == Screens.TEAMDOCK.value:
                # Handle get option data for team dock
                for (
                    permission,
                    base_actions,
                ) in TEAMDOCK_ROLE_PERMISSION_BY_OPTIONS.items():
                    if base_actions == actions:
                        data.append(
                            {
                                "screen_name": to_camel_case(screen),
                                "actions": permission,
                            }
                        )
                        break
            else:
                # Handle get option data for other screens
                for (
                    permission,
                    base_actions,
                ) in ROLE_PERMISSION_BY_OPTIONS.items():
                    if base_actions == actions:
                        data.append(
                            {
                                "screen_name": to_camel_case(screen),
                                "actions": permission,
                            }
                        )
                        break
        return data
