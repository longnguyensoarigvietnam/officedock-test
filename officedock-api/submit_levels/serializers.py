from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from organizations.models import Organization
from organizations.serializers import OrganizationSerializer
from skills.constants import SkillLevel, LookBackTypes
from skills.models import Skill, SkillMapSkillLevel, SkillMap
from skills.serializers import (
    BaseSkillHierarchySerializer,
    SkillMapSkillLevelSerializer,
)
from skills.utils import get_next_progression
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory
from users.models import User
from users.serializers import BaseUserSerializer


class SubmitLevelSerializer(serializers.ModelSerializer):
    """Serializer for SubmitLevel model"""

    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
    )
    staff_id = serializers.PrimaryKeyRelatedField(
        source="staff",
        queryset=User.objects.all(),
        write_only=True,
    )
    skill_id = serializers.PrimaryKeyRelatedField(
        source="skill",
        queryset=Skill.objects.all(),
        write_only=True,
    )
    level_before_submit = serializers.ChoiceField(
        required=True, choices=SkillLevel.choices()
    )
    status = serializers.ChoiceField(
        required=True, choices=SubmitLevelStatus.choices()
    )
    organization = OrganizationSerializer(read_only=True)
    staff = BaseUserSerializer(read_only=True)
    skill = BaseSkillHierarchySerializer(read_only=True)

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "id",
            "staff_id",
            "organization_id",
            "skill_id",
            "staff",
            "organization",
            "skill",
            "level_before_submit",
            "level_after_submit",
            "step_before_submit",
            "step_after_submit",
            "status",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CreateSubmitLevelSerializer(SubmitLevelSerializer):
    """Serializer for create SubmitLevel model"""

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "staff_id",
            "organization_id",
            "skill_id",
            "staff",
            "organization",
            "skill",
            "level_before_submit",
            "step_before_submit",
            "approver",
        ]

    def validate(self, data):
        """Validate submit level"""
        organization = data.get("organization")
        staff = data.get("staff")
        skill = data.get("skill")
        level_before_submit = data.get("level_before_submit")
        step_before_submit = data.get("step_before_submit")

        # Check if company not match
        if organization.company != skill.company != staff.company:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["company_not_match"]}
            )
        skill_map_exists = SkillMap.objects.filter(
            organization=organization,
            skill=skill,
            staff=staff,
            step=step_before_submit,
            skill_map_skill_levels__level=level_before_submit,
        ).exists()
        if not skill_map_exists:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["skill_not_exists"]}
            )
        # Check if exists submit level with same input data
        if SubmitLevelHistory.objects.filter(
            organization=organization,
            staff=staff,
            skill=skill,
            level_before_submit=level_before_submit,
            step_before_submit=step_before_submit,
            status__in=[
                SubmitLevelStatus.APPLYING.value,
                SubmitLevelStatus.APPROVE.value,
            ],
        ).exists():
            raise ValidationError(
                {"detail": ERROR_MESSAGES["submit_level_exists"]}
            )

        return data


class ItemsOfSubmitLevel(serializers.Serializer):
    item = serializers.CharField()
    is_checked = serializers.BooleanField()


class UpdateSubmitLevelSerializer(SubmitLevelSerializer):
    """Serializer for update SubmitLevel model"""

    measure_count = serializers.IntegerField(required=False, allow_null=True)
    measure_time = serializers.IntegerField(required=False, allow_null=True)
    look_back_interval = serializers.IntegerField(
        required=False, allow_null=True
    )
    look_back_type = serializers.ChoiceField(
        choices=LookBackTypes.choices(), required=False, allow_null=True
    )
    items = ItemsOfSubmitLevel(many=True, required=False, allow_null=True)

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "status",
            "comment",
            "items",
            "measure_count",
            "measure_time",
            "look_back_interval",
            "look_back_type",
        ]


class ListSubmitLevelSerializer(SubmitLevelSerializer):
    """Serializer for list SubmitLevel model"""

    progression = serializers.SerializerMethodField()

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "id",
            "staff",
            "skill",
            "status",
            "created_at",
            "progression",
        ]

    def get_progression(self, obj):
        """
        Return progression of skill
        """
        step_before_submit = obj.step_before_submit
        level_before_submit = obj.level_before_submit
        step_after_submit, level_after_submit = get_next_progression(
            step_before_submit,
            level_before_submit,
            skill=obj.skill,
            organization=obj.organization,
            staff=obj.staff,
        )

        return {
            "step_before_submit": step_before_submit,
            "level_before_submit": level_before_submit,
            "step_after_submit": step_after_submit,
            "level_after_submit": level_after_submit,
        }


class DetailSubmitLevelSerializer(ListSubmitLevelSerializer):
    """Serializer for detail SubmitLevel model"""

    skill_map_skill_level = serializers.SerializerMethodField()

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "id",
            "staff",
            "skill",
            "status",
            "created_at",
            "progression",
            "skill_map_skill_level",
            "comment",
        ]

    def get_skill_map_skill_level(self, obj):
        """
        Return skill map skill level
        """
        skill_map_skill_level = SkillMapSkillLevel.objects.filter(
            skill=obj.skill,
            level=obj.level_before_submit,
            skill_map__staff=obj.staff,
            is_complete=False,
        ).first()
        data = SkillMapSkillLevelSerializer(skill_map_skill_level).data
        data["items"] = (
            skill_map_skill_level.items if skill_map_skill_level else None
        )
        return data
