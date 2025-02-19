from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from common.utils import compare_categories
from roles.constants import Actions, Screens
from roles.utils import has_permission
from skills.models import StatisticCategory, Skill, SkillMap
from users.models import User
from .models import (
    Organization,
    OrganizationsStatisticCategories,
    OrganizationsSkills,
)


class StatisticCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for statistic category
    """

    class Meta:
        model = StatisticCategory
        # FIXME: Check spec implement color of category
        fields = ["id", "name", "uuid", "color"]
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

        if StatisticCategory.objects.filter(
            company=company, name=name
        ).exists():
            raise ValidationError(
                {"detail": ERROR_MESSAGES["unique_category_name"]}
            )

        return attrs


class SuperiorSerializer(serializers.ModelSerializer):
    """
    Serializer for the Superior.
    """

    class Meta:
        model = Organization
        fields = ["id", "name"]


class StatisticCategoryStructionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Statistic Category Struction.
    """

    large_statistic_category = StatisticCategorySerializer()
    medium_statistic_category = StatisticCategorySerializer()
    small_statistic_category = StatisticCategorySerializer()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationsStatisticCategories
        fields = [
            "id",
            "large_statistic_category",
            "medium_statistic_category",
            "small_statistic_category",
            "index",
            "skills",
        ]

    def get_skills(self, obj):
        """
        Get list of skills based on the organization statistic category.
        """

        # Using prefetch_related for efficient skill retrieval
        skills = (
            obj.organizations_statistic_categories_skills.select_related(
                "skill"
            )
            .order_by("id")
            .distinct()
        )

        # Rename the keys to match expected output
        return [
            {"id": id, "name": name}
            for id, name in skills.values_list("skill__id", "skill__name")
        ]


class LeverSerializer(serializers.Serializer):
    """Serializer in the skill lever."""

    measurement_count = serializers.IntegerField(
        required=False, allow_null=True
    )
    measurement_time = serializers.IntegerField(required=False, allow_null=True)
    review_period = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=100
    )
    descriptions = serializers.ListField(
        child=serializers.CharField(
            required=False, allow_null=True, max_length=255
        )
    )


class SkillLeverSerializer(serializers.Serializer):
    """Serializer for the Skill lever."""

    level_1 = LeverSerializer(allow_null=True)
    level_2 = LeverSerializer(allow_null=True)
    level_3 = LeverSerializer(allow_null=True)


class OrganizationSkillSerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization Skill
    """

    skill = serializers.SerializerMethodField()
    skill_id = serializers.PrimaryKeyRelatedField(
        source="skill",
        queryset=Skill.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    organization_skill_id = serializers.PrimaryKeyRelatedField(
        source="organization_skill",
        queryset=OrganizationsSkills.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    index = serializers.IntegerField(default=1)
    levels = SkillLeverSerializer(allow_null=True)
    is_has_skill_map = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrganizationsSkills
        fields = [
            "id",
            "organization_skill_id",
            "skill_id",
            "skill",
            "define_skill",
            "levels",
            "index",
            "is_has_skill_map",
        ]

    def get_skill(self, obj):
        """Handle get skill by given obj"""
        from skills.serializers import (
            SkillSerializer,
        )  # lazy import, avoid circular import

        return SkillSerializer(obj.skill).data

    def get_is_has_skill_map(self, obj):
        """Handle check is having skill map or not"""
        return SkillMap.objects.filter(
            organization=obj.organization, skill=obj.skill
        ).exists()


class OrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization.
    """

    superior = SuperiorSerializer(read_only=True)
    superior_id = serializers.PrimaryKeyRelatedField(
        source="superior",
        queryset=Organization.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    user_count = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "superior",
            "superior_id",
            "user_count",
            "actions",
        ]

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        request = self.context.get("request")

        if request:
            has_statistic_categories = request.query_params.get(
                "has_statistic_categories"
            )
            if has_statistic_categories and has_statistic_categories != "false":
                user = self.context.get("request").user
                actions = {
                    Actions.UPDATE.value: f"{Screens.CATEGORY_HIERARCHY.value}_{Actions.UPDATE.value}",
                    Actions.DELETE.value: f"{Screens.CATEGORY_HIERARCHY.value}_{Actions.DELETE.value}",
                }
                item_org_ids = [obj.id]

                return has_permission(actions, user, item_org_ids)
        return {Actions.UPDATE.value: True, Actions.DELETE.value: True}

    def get_user_count(self, obj) -> int:
        """
        Count user in Organization
        """

        return obj.users.count()

    def validate(self, attrs):
        """
        Validate that the superior organization.
        """
        superior = attrs.get("superior")
        if (
            superior
            and self.instance
            and self._is_subordinate(superior, self.instance)
        ):
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["organization_superior_circular"]}
            )

        return attrs

    def _is_subordinate(self, superior, organization):
        """
        Check if superior is a subordinate of organization.
        """
        if superior == organization:
            return True
        if superior.superior is None:
            return False
        return self._is_subordinate(superior.superior, organization)


class OrganizationDetailSerializer(OrganizationSerializer):
    """
    Serializer for the Organization.
    """

    statistic_categories = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "superior",
            "superior_id",
            "user_count",
            "statistic_categories",
            "skills",
            "actions",
        ]

    def get_statistic_categories(self, obj):
        """
        Get and organize statistic categories for the given organization
        """
        statistic_categories = (
            obj.organizations_statistic_categories.all().order_by("index")
        )
        return StatisticCategoryStructionSerializer(
            statistic_categories, many=True
        ).data

    def get_skills(self, obj):
        """
        Get and organize skills for the given organization
        """

        skills = obj.organizations_skills.all().order_by("index")
        return OrganizationSkillSerializer(skills, many=True).data


class OrganizationStatisticCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization Statistic Category.
    """

    organization_statistic_category_id = serializers.PrimaryKeyRelatedField(
        source="organization_statistic_category",
        queryset=OrganizationsStatisticCategories.objects.all(),
        write_only=True,
        required=True,
        allow_null=True,
    )
    large_statistic_category_uuid = serializers.UUIDField(
        write_only=True,
        required=False,
        allow_null=True,
    )
    medium_statistic_category_uuid = serializers.UUIDField(
        write_only=True,
        required=False,
        allow_null=True,
    )
    small_statistic_category_uuid = serializers.UUIDField(
        write_only=True,
        required=False,
        allow_null=True,
    )
    index = serializers.IntegerField(write_only=True, default=1)
    skill_ids = serializers.PrimaryKeyRelatedField(
        source="skills",
        queryset=Skill.objects.all(),
        many=True,
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Organization
        fields = [
            "id",
            "organization_statistic_category_id",
            "large_statistic_category_uuid",
            "medium_statistic_category_uuid",
            "small_statistic_category_uuid",
            "index",
            "skill_ids",
        ]

    def validate(self, data):
        """
        Validate the Organization statistic category
        """
        large_category_uuid = data.get("large_statistic_category_uuid")
        medium_category_uuid = data.get("medium_statistic_category_uuid")
        small_category_uuid = data.get("small_statistic_category_uuid")

        if compare_categories(
            large_category_uuid, medium_category_uuid, small_category_uuid
        ):
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["cannot_create"]}
            )

        return data


class OrganizationsForCreationSerializer(serializers.Serializer):
    """
    Serializer for create a user form.
    """

    organization = OrganizationSerializer(many=True, read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
    )
    is_main = serializers.BooleanField()


class ListOrganizationStatisticSerializer(serializers.Serializer):
    """
    Serializer for a list of organization statistic categories for create or update
    """

    organization_statistic_categories = OrganizationStatisticCategorySerializer(
        many=True, write_only=True, required=False
    )


class MemberSerializer(serializers.ModelSerializer):
    """
    Serializer for user member
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


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """
    Serializer for mermber organization
    """

    users = MemberSerializer(many=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "users",
        ]


class ListOrganizationSkillSerializer(serializers.Serializer):
    """
    Serializer for a list of organization skills for create or update
    """

    organization_skills = OrganizationSkillSerializer(
        many=True, write_only=True, required=False
    )


class OrganizationSkillForGetListSerializer(serializers.ModelSerializer):
    """
    Serializer for get list Organizations Skills
    """

    skill = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()
    all_skills = serializers.SerializerMethodField(read_only=True)
    actions = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationsSkills
        fields = [
            "id",
            "organization",
            "skill",
            "all_skills",
            "actions",
        ]

    def get_skill(self, obj):
        """Handle get skill name by given obj"""
        return obj.skill.name if obj.skill else None

    def get_all_skills(self, obj):
        """Handle get all skills of organization"""
        return OrganizationDetailSerializer(obj.organization).data["skills"]

    def get_organization(self, obj):
        """Handle get organization by given obj"""

        return OrganizationSerializer(obj.organization).data

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        user = self.context.get("request").user
        actions = {
            Actions.UPDATE.value: f"{Screens.ORGANIZATION_SKILL.value}_{Actions.UPDATE.value}",
            Actions.DELETE.value: f"{Screens.ORGANIZATION_SKILL.value}_{Actions.DELETE.value}",
        }
        item_org_ids = [obj.organization.id]

        return has_permission(actions, user, item_org_ids)
