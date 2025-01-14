from django.db.models import Q
from rest_framework import serializers
from users.models import User
from organizations.models import Organization
from organizations.serializers import SuperiorSerializer
from tags.models import Tag
from tasks.models import TaskStatus


class CreationDataUserSerializer(serializers.ModelSerializer):
    """
    Serializer for creation data person in charge.
    """

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name"]

    def get_full_name(self, obj):
        """
        Return full name of user.
        """
        return obj.profile.full_name


class CreationDataOrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer for Creation data Organization
    """

    superior = SuperiorSerializer(read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "superior"]


class CreationDataOrganizationWithUserSerializer(
    CreationDataOrganizationSerializer
):
    """
    Serializer for Creation data Organization with User
    """

    users = CreationDataUserSerializer(many=True)

    class Meta:
        model = Organization
        fields = ["id", "name", "superior", "users"]


class OrganizationWithUserNotHaveSkillMapSerializer(
    CreationDataOrganizationSerializer
):
    """
    Serializer for Creation data Organization with User
    """

    users = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "name", "superior", "users"]

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
    organizations = CreationDataOrganizationSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = User
        fields = ["id", "full_name", "organizations"]
