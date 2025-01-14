from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from organizations.models import Organization
from organizations.serializers import (
    OrganizationSerializer,
)
from skills.models import SkillMap, Skill
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory
from users.models import User
from users.serializers import BaseUserSerializer


class SkillSerializer(serializers.ModelSerializer):
    """
    Serializer for skill
    """

    class Meta:
        model = Skill
        fields = ["id", "name"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        """Handle validate"""
        instance = self.instance
        company = (
            self.context.get("user").company
            if not instance
            else instance.company
        )
        name = attrs.get("name")
        if instance and instance.name == name:
            return attrs

        if Skill.objects.filter(company=company, name=name).exists():
            raise ValidationError(
                {"detail": ERROR_MESSAGES["unique_skill_name"]}
            )

        return attrs


class SkillMapSerializer(serializers.ModelSerializer):
    """
    Serializer for Skill Map
    """

    skill_id = serializers.PrimaryKeyRelatedField(
        source="skill",
        queryset=Skill.objects.all(),
        write_only=True,
        allow_null=True,
    )
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
    )
    organization = OrganizationSerializer(read_only=True)
    skill = SkillSerializer(read_only=True)
    staff_id = serializers.PrimaryKeyRelatedField(
        source="staff",
        queryset=User.objects.all(),
        write_only=True,
    )
    staff = BaseUserSerializer(read_only=True)
    index = serializers.IntegerField(default=1)
    level = serializers.CharField(read_only=True)

    class Meta:
        model = SkillMap
        fields = [
            "id",
            "organization",
            "organization_id",
            "staff",
            "staff_id",
            "skill_id",
            "skill",
            "index",
            "point",
            "level",
        ]
        read_only_fields = ["id"]


class ListSkillMapSerializer(serializers.ModelSerializer):
    """
    Serializer for list skill map
    """

    organization = OrganizationSerializer()
    staff = BaseUserSerializer(read_only=True)

    class Meta:
        model = SkillMap
        fields = ["id", "organization", "staff"]


class SkillMapWithSkillSerializer(SkillMapSerializer):
    """Serializer for update skill map"""

    index = serializers.IntegerField()
    skill_map_id = serializers.PrimaryKeyRelatedField(
        source="skill_map",
        queryset=SkillMap.objects.all(),
        write_only=True,
        required=True,
        allow_null=True,
    )
    is_applying = serializers.SerializerMethodField(read_only=True)
    is_submitted = serializers.SerializerMethodField(read_only=True)
    skill_levels = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SkillMap
        fields = [
            "id",
            "skill_map_id",
            "skill_id",
            "skill",
            "index",
            "level",
            "is_applying",
            "is_submitted",
            "skill_levels",
        ]

    def get_is_applying(self, obj):
        """Handle get status of submit level is apply or not"""

        return SubmitLevelHistory.objects.filter(
            organization=obj.organization,
            staff=obj.staff,
            skill=obj.skill,
            status=SubmitLevelStatus.APPLYING.value,
        ).exists()

    def get_is_submitted(self, obj):
        """Check is having submitted level or not"""

        return SubmitLevelHistory.objects.filter(
            organization=obj.organization, staff=obj.staff, skill=obj.skill
        ).exists()

    def get_skill_levels(self, obj):
        """Get skill levels in"""
        organization = self.context.get("organization")
        if organization:
            organization_skill = organization.organizations_skills.filter(
                skill=obj.skill
            ).first()
            if organization_skill:
                return organization_skill.levels

        return None


class ListCreateSkillMapSerializer(serializers.Serializer):
    """
    Serializer for a list of organizations for reset index, returning an array directly.
    """

    skill_maps = SkillMapWithSkillSerializer(many=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
    )
    organization = OrganizationSerializer(read_only=True)
    staff_id = serializers.PrimaryKeyRelatedField(
        source="staff",
        queryset=User.objects.all(),
        write_only=True,
    )

    def validate(self, attrs):
        """Validate data"""
        staff = attrs.get("staff")
        organization = attrs.get("organization")

        check_staff = organization.users.filter(id=staff.id).exists()
        if not check_staff:
            raise serializers.ValidationError(
                {
                    "detail": ERROR_MESSAGES["staff_not_exists"].format(
                        id=staff.id
                    )
                }
            )

        return attrs
