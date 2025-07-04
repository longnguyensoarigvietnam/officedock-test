from django.db.models import Q
from rest_framework import serializers

from common.utils import transform_statistic_categories
from users.models import User
from organizations.models import Organization
from organizations.serializers import (
    BaseOrganizationSerializer,
    StatisticCategoryStructionSerializer,
)
from tags.models import Tag
from tasks.models import Task, TaskStatus
from users.serializers import OrganizationForUserSerializer, BaseUserSerializer


class CreationDataUserSerializer(BaseUserSerializer):
    """
    Serializer for creation data person in charge.
    """

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "avatar_color", "avatar"]

    def get_full_name(self, obj):
        """
        Return full name of user.
        """
        return obj.profile.full_name


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


class OrganizationWithUserNotHaveSkillMapSerializer(
    CreationDataOrganizationSerializer
):
    """
    Serializer for Creation data Organization with User
    """

    users = serializers.SerializerMethodField()

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

    def get_users(self, obj):
        """Get user have not skill map"""
        users = obj.users.filter(~Q(skill_maps__organization=obj)).all()

        return CreationDataUserSerializer(users, many=True).data


class CreationDataTagSerializer(serializers.ModelSerializer):
    """
    Serializer for Creation data Tag
    """

    class Meta:
        model = Tag
        fields = ["id", "name"]


class CreationDataOrganizationWithTagSerializer(
    CreationDataOrganizationSerializer
):
    """
    Serializer for Creation data Organization with User
    """

    tags = CreationDataTagSerializer(many=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "superior",
            "tags",
            "icon",
            "icon_color",
            "type",
        ]


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


class CreationDataTaskSerializer(serializers.Serializer):
    """
    Serializer for Creation data Task
    """

    tags = CreationDataTagSerializer(many=True)
    status = CreationDataTaskStatusSerializer(many=True)
    types = serializers.ListField(child=serializers.CharField())
    priorities = serializers.ListField(child=serializers.CharField())


class EmptySerializer(serializers.Serializer):
    """
    Empty serializers.
    """


class CreationDataUserWithOrganizationSerializer(CreationDataUserSerializer):
    """Creation date user with organization"""

    organizations = CreationDataOrganizationSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = User
        fields = ["id", "full_name", "organizations"]


class CreationDataUserWithMainOrganizationSerializer(
    CreationDataUserSerializer
):
    """Serializer for creation data user with main organization"""

    organizations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "avatar_color", "avatar", "organizations"]

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
        statistic_categories = (
            obj.organizations_statistic_categories.all().order_by("index")
        )
        statistic_categories = StatisticCategoryStructionSerializer(
            statistic_categories, many=True
        ).data

        return transform_statistic_categories(statistic_categories)

    def get_tags(self, obj):
        """
        Return list of tags
        """
        from tags.serializers import BaseTagSerializer

        return BaseTagSerializer(obj.tags.all(), many=True).data
