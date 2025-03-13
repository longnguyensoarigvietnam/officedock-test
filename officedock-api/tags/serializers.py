from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from common.serializers import CreationDataOrganizationSerializer
from organizations.models import Organization
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

    class Meta:
        model = Tag
        fields = [
            "id",
            "name",
            "organization_ids",
            "organizations",
            "is_hidden",
        ]

    def validate(self, data):
        """
        Validate data
        """
        user = self.context["request"].user
        organizations = data.get("organizations")
        if organizations:
            for organization in organizations:
                if not user.company.organizations.filter(
                    id=organization.id
                ).exists():
                    raise serializers.ValidationError(
                        {"detail": ERROR_MESSAGES["organization_not_exists"]}
                    )

        return data

    def to_representation(self, instance):
        """
        Custom sorting by index for list people in charge
        """
        representation = super().to_representation(instance)

        return representation


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
