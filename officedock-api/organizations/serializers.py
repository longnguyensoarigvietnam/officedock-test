from django.db.models import Max
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from common.utils import compare_categories, get_signed_url
from roles.constants import Actions, Screens
from roles.utils import has_permission
from skills.models import StatisticCategory, Skill, SkillMap
from common.constants import ORGANIZATION_ICON_UPLOAD_MAX_SIZE
from organizations.constants import OrganizationTypes
from .models import (
    Organization,
    OrganizationsStatisticCategories,
    OrganizationsSkills,
)


class BaseOrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization.
    """

    class Meta:
        model = Organization
        fields = ["id", "uuid", "name", "icon"]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.icon:
            representation["icon"] = get_signed_url(instance.icon)

        return representation


class BaseStatisticCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for statistic category
    """

    class Meta:
        model = StatisticCategory
        fields = [
            "id",
            "name",
            "uuid",
        ]


class StatisticCategorySerializer(BaseStatisticCategorySerializer):
    """
    Serializer for statistic category
    """

    uuid = serializers.UUIDField(required=False, allow_null=True)
    organizations = serializers.SerializerMethodField()

    class Meta:
        model = StatisticCategory
        fields = [
            "id",
            "name",
            "uuid",
            "organizations",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

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

    def get_organizations(self, obj):
        """Get organizations by category"""
        orgs = (
            obj.organizations.annotate(
                latest_stat_category_id=Max(
                    "organizations_statistic_categories__id"
                )
            )
            .order_by("-latest_stat_category_id")
            .distinct()
        )
        return BaseOrganizationSerializer(orgs, many=True).data


class StatisticCategoryStructionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Statistic Category Struction.
    """

    large_statistic_category = BaseStatisticCategorySerializer()
    medium_statistic_category = BaseStatisticCategorySerializer()
    small_statistic_category = BaseStatisticCategorySerializer()
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
            "color",
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


class OrganizationSerializer(BaseOrganizationSerializer):
    """
    Serializer for the Organization.
    """

    superior = BaseOrganizationSerializer(read_only=True)
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
            "uuid",
            "name",
            "superior",
            "superior_id",
            "user_count",
            "actions",
            "icon",
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
        if icon := attrs.get("icon"):
            if icon.size > ORGANIZATION_ICON_UPLOAD_MAX_SIZE:
                raise serializers.ValidationError(
                    {
                        "detail": ERROR_MESSAGES["max_file_size"].format(
                            max_size="20MB"
                        )
                    }
                )

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


class BaseOrganizationHierarchySerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization.
    """

    parent_uuid = serializers.UUIDField(
        write_only=True, allow_null=True, required=False
    )
    uuid = serializers.UUIDField(
        write_only=True, allow_null=True, required=False
    )
    is_hierarchy = serializers.BooleanField(write_only=True, default=False)

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "type",
            "name",
            "icon",
            "parent_uuid",
            "is_hierarchy",
        ]


class OrganizationHierarchyForCreateSerializer(serializers.Serializer):
    """
    Serializer for the Organization  hierarchy create multi.
    """

    organizations = BaseOrganizationHierarchySerializer(
        many=True, required=False
    )
    delete_uuids = serializers.ListField(
        child=serializers.UUIDField(), allow_null=True, required=False
    )

    def validate(self, data):
        """
        Validate that parent_uuid exists in db or is in the incoming list
        """
        organizations = data.get("organizations", [])
        incoming_uuids = {
            item.get("uuid") for item in organizations if item.get("uuid")
        }

        for org in organizations:
            parent_uuid = org.get("parent_uuid")
            if parent_uuid:
                exists_in_db = Organization.objects.filter(
                    uuid=parent_uuid
                ).exists()
                will_be_created = parent_uuid in incoming_uuids
                if not exists_in_db and not will_be_created:
                    raise serializers.ValidationError(
                        {
                            "detail": ERROR_MESSAGES[
                                "organization_uuid_not_exists"
                            ].format(parent_uuid=parent_uuid)
                        }
                    )

                type = org.get("type")
                if type and type == OrganizationTypes.PROJECT.value:
                    raise serializers.ValidationError(
                        {
                            "detail": ERROR_MESSAGES[
                                "organization_team_not_hierarchy"
                            ]
                        }
                    )

        return data


class OrganizationHierarchySerializer(serializers.ModelSerializer):
    """
    Serializer for Tag struct model
    """

    parent_uuid = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "parent_uuid",
            "type",
            "name",
            "icon",
            "children",
        ]

    def get_children(self, obj):
        """
        Handle get children of tag
        """
        user = self.context.get("request").user

        # Fetch the child tags of the current tag
        children = Organization.objects.filter(
            company=user.company, superior=obj
        ).order_by("hierarchize_at", "updated_at")

        # Serialize each child tag
        return OrganizationHierarchySerializer(
            children,
            many=True,
            context=self.context,
        ).data

    def get_parent_uuid(self, obj):
        """
        Handle get parent uuid
        """
        return obj.superior.uuid if obj.superior else None


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
            "uuid",
            "name",
            "superior",
            "superior_id",
            "user_count",
            "statistic_categories",
            "skills",
            "actions",
            "icon",
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
            "uuid",
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


class OrganizationMemberSerializer(BaseOrganizationSerializer):
    """
    Serializer for mermber organization
    """

    users = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "uuid", "name", "users", "icon"]

    def get_users(self, obj):
        """Get users in organization"""
        from common.serializers import CreationDataUserSerializer

        users = obj.users.all()

        if search := self.context.get("search"):
            users = users.filter(profile__full_name__icontains=search)

        return CreationDataUserSerializer(users, many=True).data


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


"""
Begin handle organization category hierarchy
"""


class OrganizationCategoryHierarchySerializer(BaseOrganizationSerializer):
    """
    Serializer for the Organization category hierarchy.
    """

    statistic_categories = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "icon",
            "statistic_categories",
        ]

    def get_statistic_categories(self, obj):
        """
        Get and organize statistic categories for the given organization
        """
        statistic_categories = obj.organizations_statistic_categories.order_by(
            "large_statistic_category_id",
            "medium_statistic_category_id",
            "small_statistic_category_id",
        ).distinct()
        return StatisticCategoryStructionSerializer(
            statistic_categories, many=True
        ).data


class StatisticCategoryFieldSerializer(serializers.Serializer):
    """
    Serializer for statistic category
    """

    name = serializers.CharField(required=False, allow_null=True)
    uuid = serializers.UUIDField(required=False, allow_null=True)


class OrgCategoryHierarchySerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization category hierarchy create.
    """

    organization_statistic_category_id = serializers.PrimaryKeyRelatedField(
        source="organization_statistic_category",
        queryset=OrganizationsStatisticCategories.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
    )
    large_statistic_category = StatisticCategoryFieldSerializer(
        allow_null=True, required=False
    )
    medium_statistic_category = StatisticCategoryFieldSerializer(
        allow_null=True, required=False
    )
    small_statistic_category = StatisticCategoryFieldSerializer(
        allow_null=True, required=False
    )
    skill_ids = serializers.PrimaryKeyRelatedField(
        source="skills",
        queryset=Skill.objects.all(),
        many=True,
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = OrganizationsStatisticCategories
        fields = [
            "id",
            "organization_statistic_category_id",
            "organization_id",
            "large_statistic_category",
            "medium_statistic_category",
            "small_statistic_category",
            "index",
            "color",
            "skill_ids",
        ]


class OrganizationCategoryHierarchyForCreateSerializer(serializers.Serializer):
    """
    Serializer for the Organization category hierarchy create multi.
    """

    items = OrgCategoryHierarchySerializer(many=True, required=False)
    ids = serializers.ListField(
        child=serializers.IntegerField(), allow_null=True, required=False
    )


class CheckActualDurationSerializer(serializers.Serializer):
    """
    Serializer for check actual duration.
    """

    ids = serializers.PrimaryKeyRelatedField(
        source="organizations_statistic_categories",
        queryset=OrganizationsStatisticCategories.objects.all(),
        many=True,
        write_only=True,
        required=False,
        allow_null=True,
    )


"""
End handle organization category hierarchy
"""
