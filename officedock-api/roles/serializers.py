from collections import defaultdict
from rest_framework import serializers
from common.utils import to_camel_case
from users.models import Role
from roles.constants import SelectionResultOptions
from base.messages import ERROR_MESSAGES


# Define common choices for action permissions
NOT_ALLOWED_CHOICES = [
    (
        SelectionResultOptions.NOT_ALLOWED.value,
        SelectionResultOptions.NOT_ALLOWED.name,
    ),
]
ALLOWED_AND_NOT_ALLOWED_CHOICES = [
    (SelectionResultOptions.ALLOWED.value, SelectionResultOptions.ALLOWED.name)
] + NOT_ALLOWED_CHOICES
ONLY_DATA_ORGANIZATION_CHOICES = [
    (
        SelectionResultOptions.ONLY_DATA_ORGANIZATION.value,
        SelectionResultOptions.ONLY_DATA_ORGANIZATION.name,
    ),
]

ONLY_DATA_OWN_CHOICES = [
    (
        SelectionResultOptions.ONLY_DATA_OWN.value,
        SelectionResultOptions.ONLY_DATA_OWN.name,
    ),
]
BASE_CHOICES = (
    ALLOWED_AND_NOT_ALLOWED_CHOICES
    + ONLY_DATA_ORGANIZATION_CHOICES
    + ONLY_DATA_OWN_CHOICES
)
ALLOWED_WITHOUT_OWN_DATA_CHOICES = [
    (
        SelectionResultOptions.ALLOWED_WITHOUT_OWN_DATA.value,
        SelectionResultOptions.ALLOWED_WITHOUT_OWN_DATA.name,
    ),
]
ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA_CHOICES = [
    (
        SelectionResultOptions.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA.value,
        SelectionResultOptions.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA.name,
    ),
]


class BaseActionsSerializer(serializers.Serializer):
    """
    Serializer for base actions.
    """

    view = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )
    add = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )
    delete = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )


class UserActionsSerializer(serializers.Serializer):
    """
    Serializer for user actions.
    """

    view = serializers.ChoiceField(
        choices=BASE_CHOICES,
    )
    add = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    delete = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )


class OrganizationSkillActionsSerializer(serializers.Serializer):
    """
    Serializer for organization skill actions.
    """

    view = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )
    add = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    delete = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )


class StatisticActionsSerializer(serializers.Serializer):
    """
    Serializer for statistic actions.
    """

    view = serializers.ChoiceField(
        choices=NOT_ALLOWED_CHOICES + ONLY_DATA_OWN_CHOICES,
    )
    add = serializers.ChoiceField(
        choices=ONLY_DATA_OWN_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ONLY_DATA_OWN_CHOICES,
    )


class SkillMapActionsSerializer(serializers.Serializer):
    """
    Serializer for skill map actions.
    """

    view = serializers.ChoiceField(
        choices=BASE_CHOICES,
    )
    add = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    delete = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )


class CategoryHierarchyActionsSerializer(serializers.Serializer):
    """
    Serializer for category hierarchy actions.
    """

    view = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES,
    )
    add = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )
    delete = serializers.ChoiceField(
        choices=ALLOWED_AND_NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_CHOICES,
    )


class SubmitLevelActionsSerializer(serializers.Serializer):
    """
    Serializer for category hierarchy actions.
    """

    view = serializers.ChoiceField(
        choices=BASE_CHOICES,
    )
    update = serializers.ChoiceField(
        choices=ALLOWED_WITHOUT_OWN_DATA_CHOICES
        + NOT_ALLOWED_CHOICES
        + ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA_CHOICES,
    )


class PermissionForCreateSerializer(serializers.Serializer):
    """
    Serializer for permission.
    """

    my_task = BaseActionsSerializer()
    calendar = BaseActionsSerializer()
    chat = BaseActionsSerializer()
    organization = BaseActionsSerializer()
    category = BaseActionsSerializer()
    skill = BaseActionsSerializer()
    tag = BaseActionsSerializer()
    user = UserActionsSerializer()
    role = BaseActionsSerializer()

    category_hierarchy = CategoryHierarchyActionsSerializer()
    skill_map = SkillMapActionsSerializer()
    organization_skill = OrganizationSkillActionsSerializer()
    statistic = StatisticActionsSerializer()
    submit_level = SubmitLevelActionsSerializer()


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
        company = self.context.get("request").user.company
        instance = self.instance

        if (
            Role.objects.filter(company=company, name=value)
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
            permissions[to_camel_case(screen_name)][action] = result

        # Return formatted result using list comprehension
        return [
            {"screen_name": screen, "actions": actions}
            for screen, actions in permissions.items()
        ]
