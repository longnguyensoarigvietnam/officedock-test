from rest_framework import serializers

from common.utils import transform_statistic_categories
from users.models import User
from organizations.models import Organization
from organizations.serializers import (
    BaseOrganizationSerializer,
    OrganizationDetailSerializer,
)
from tags.models import Tag
from tasks.models import Task, TaskStatus
from users.serializers import OrganizationForUserSerializer, BaseUserSerializer


class CreationDataUserSerializer(BaseUserSerializer):
    """
    Serializer for creation data person in charge.
    """

    class Meta:
        model = User
        fields = ["id", "full_name", "avatar_color", "avatar", "deleted_at"]


class CreationDataOrganizationSerializer(BaseOrganizationSerializer):
    """
    Serializer for Creation data Organization
    """

    superior = BaseOrganizationSerializer(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "superior",
            "icon",
            "icon_color",
            "type",
        ]


class CreationDataOrganizationWithUserSerializer(
    CreationDataOrganizationSerializer
):
    """
    Serializer for Creation data Organization with User
    """

    users = CreationDataUserSerializer(many=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "superior",
            "users",
            "icon",
            "icon_color",
            "type",
        ]


class CreationDataTagSerializer(serializers.ModelSerializer):
    """
    Serializer for Creation data Tag
    """

    class Meta:
        model = Tag
        fields = ["id", "name"]


class CreationDataTaskListSerializer(serializers.ModelSerializer):
    """
    Serializer for Creation data Task
    """

    class Meta:
        model = Task
        fields = ["id", "title"]


class CreationDataTaskStatusSerializer(serializers.ModelSerializer):
    """
    Serializer for Creation data Task status
    """

    class Meta:
        model = TaskStatus
        fields = ["id", "name"]


class EmptySerializer(serializers.Serializer):
    """
    Empty serializers.
    """


class CreationDataUserWithMainOrganizationSerializer(
    CreationDataUserSerializer
):
    """Serializer for creation data user with main organization"""

    organizations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "avatar_color",
            "avatar",
            "organizations",
            "deleted_at",
        ]

    def get_organizations(self, obj):
        """Return main organization of user"""
        organization = obj.organizations.filter(
            usersorganizations__is_main=True
        ).first()

        return (
            CreationDataOrganizationSerializer(organization).data
            if organization
            else None
        )


class CreationDataOrganizationWithStructCategorySerializer(
    OrganizationForUserSerializer
):
    """
    Serializer for creation data organization with struct category
    """

    statistic_categories = serializers.SerializerMethodField(read_only=True)
    tags = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "icon",
            "icon_color",
            "is_main",
            "statistic_categories",
            "tags",
            "type",
        ]

    def get_statistic_categories(self, obj):
        """
        Transform statistic category list to serializer data
        """
        categories = OrganizationDetailSerializer(obj).data[
            "statistic_categories"
        ]
        return transform_statistic_categories(categories)

    def get_tags(self, obj):
        """
        Return list of tags
        """
        from tags.serializers import BaseTagSerializer

        return BaseTagSerializer(obj.tags.all(), many=True).data


class CreationDataOrganizationWithMainSerializer(OrganizationForUserSerializer):
    """
    Serializer for creation data organization with main
    """

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "superior",
            "icon",
            "icon_color",
            "type",
            "is_main",
        ]
