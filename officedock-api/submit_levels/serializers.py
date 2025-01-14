from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from organizations.models import Organization
from organizations.serializers import OrganizationSerializer
from roles.constants import Actions, Screens
from roles.utils import has_permission
from skills.constants import SkillLevel
from skills.models import Skill
from skills.serializers import SkillSerializer
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
    skill = SkillSerializer(read_only=True)

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
        ]

    def validate(self, data):
        """Validate submit level"""
        organization = data.get("organization")
        staff = data.get("staff")
        skill = data.get("skill")
        level_before_submit = data.get("level_before_submit")

        # Check if company not match
        if organization.company != skill.company != staff.company:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["company_not_match"]}
            )

        # Check if exists submit level with same input data
        if SubmitLevelHistory.objects.filter(
            organization=organization,
            staff=staff,
            skill=skill,
            level_before_submit=level_before_submit,
            status=SubmitLevelStatus.APPLYING.value,
        ).exists():
            raise ValidationError(
                {"detail": ERROR_MESSAGES["submit_level_exists"]}
            )

        return data


class UpdateSubmitLevelSerializer(SubmitLevelSerializer):
    """Serializer for update SubmitLevel model"""

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "status",
            "comment",
        ]


class ListSubmitLevelSerializer(SubmitLevelSerializer):
    """Serializer for list SubmitLevel model"""

    is_edited = serializers.SerializerMethodField(read_only=True)
    actions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SubmitLevelHistory
        fields = [
            "id",
            "staff",
            "organization",
            "skill",
            "status",
            "is_edited",
            "comment",
            "created_at",
            "actions",
        ]

    def get_is_edited(self, obj):
        """Handle check is edited or not"""
        user = self.context.get("request").user
        return (
            obj.status
            in [
                SubmitLevelStatus.APPROVE.value,
                SubmitLevelStatus.REJECT.value,
            ]
            or obj.staff == user
        )

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        user = self.context.get("request").user
        actions = {
            Actions.UPDATE.value: f"{Screens.SUBMIT_LEVEL.value}_{Actions.UPDATE.value}",
            Actions.DELETE.value: f"{Screens.SUBMIT_LEVEL.value}_{Actions.DELETE.value}",
        }
        item_org_ids = [obj.organization.id]
        return has_permission(actions, user, item_org_ids)
