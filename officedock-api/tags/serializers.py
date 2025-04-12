from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from common.serializers import CreationDataOrganizationSerializer
from organizations.models import Organization
from roles.constants import Actions, Screens
from roles.utils import has_permission
from .models import Tag


class BaseTagSerializer(serializers.ModelSerializer):
    """
    Serializer for Base Tag
    """

    class Meta:
        model = Tag
        fields = ["id", "name"]


class TagSerializer(serializers.ModelSerializer):
    """
    Serializer for Tag
    """

    organization_ids = serializers.PrimaryKeyRelatedField(
        source="organizations",
        queryset=Organization.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        many=True,
    )
    organizations = CreationDataOrganizationSerializer(
        many=True, read_only=True
    )
    actions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Tag
        fields = [
            "id",
            "name",
            "organization_ids",
            "organizations",
            "actions",
            "is_hidden",
        ]

    def validate(self, data):
        """
        Validate data
        """
        user = self.context["request"].user
        organizations = data.get("organizations")
        name = data.get("name")
        if organizations:
            for organization in organizations:
                if not user.company.organizations.filter(
                    id=organization.id
                ).exists():
                    raise serializers.ValidationError(
                        {"detail": ERROR_MESSAGES["organization_not_exists"]}
                    )
        if (
            name
            and Tag.objects.filter(name=name, company=user.company)
            .exclude(id=self.instance.id if self.instance else None)
            .exists()
        ):
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["tag_exists"]}
            )

        return data

    def to_representation(self, instance):
        """
        Custom sorting by index for list people in charge
        """
        representation = super().to_representation(instance)

        return representation

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        user = self.context.get("request").user
        actions = {
            Actions.UPDATE.value: f"{Screens.TAG.value}_{Actions.UPDATE.value}",
            Actions.DELETE.value: f"{Screens.TAG.value}_{Actions.DELETE.value}",
        }
        item_org_ids = obj.organizations.values_list("id", flat=True)
        permissions = has_permission(actions, user, item_org_ids)

        return permissions


class TagsForCreationSerializer(serializers.Serializer):
    """
    Serializer for create a user form.
    """

    tag = BaseTagSerializer(many=True, read_only=True)
    tag_id = serializers.PrimaryKeyRelatedField(
        source="tag",
        queryset=Tag.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
