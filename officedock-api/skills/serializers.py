from datetime import datetime

from rest_framework import serializers

from common.serializers import CreationDataUserWithMainOrganizationSerializer
from common.utils import get_common_categories
from organizations.models import Organization, OrganizationsStatisticCategories
from organizations.serializers import (
    OrganizationSerializer,
    BaseOrganizationSerializer,
)
from skills.models import (
    SkillMap,
    Skill,
    SkillLevel,
    SkillMapSkillLevel,
    StatisticCategory,
)
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory
from users.models import User


class SkillLevelSerializer(serializers.ModelSerializer):
    """
    Skill level serializer
    """

    items = serializers.ListField(
        child=serializers.CharField(
            required=False, allow_null=True, max_length=255
        )
    )
    skill_level_id = serializers.PrimaryKeyRelatedField(
        source="skill_level",
        queryset=SkillLevel.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = SkillLevel
        fields = [
            "id",
            "skill_level_id",
            "organization",
            "skill",
            "level",
            "measure_count",
            "measure_time",
            "look_back_interval",
            "look_back_type",
            "items",
        ]
        read_only_fields = ["skill"]


class CategorySerializer(serializers.Serializer):
    """Serializer of category"""

    large_statistic_category_id = serializers.PrimaryKeyRelatedField(
        source="large_statistic_category",
        queryset=StatisticCategory.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    medium_statistic_category_id = serializers.PrimaryKeyRelatedField(
        source="medium_statistic_category",
        queryset=StatisticCategory.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    small_statistic_category_id = serializers.PrimaryKeyRelatedField(
        source="small_statistic_category",
        queryset=StatisticCategory.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )


class SkillSerializer(serializers.ModelSerializer):
    """
    Serializer for skill
    """

    organization_id = serializers.PrimaryKeyRelatedField(
        source="organization",
        queryset=Organization.objects.all(),
        write_only=True,
    )
    organization = OrganizationSerializer(read_only=True)
    skill_levels = SkillLevelSerializer(many=True)
    skill_id = serializers.PrimaryKeyRelatedField(
        source="skill",
        queryset=Skill.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    category_ids = CategorySerializer(
        write_only=True, many=True, required=False
    )
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = [
            "id",
            "skill_id",
            "name",
            "organization_id",
            "organization",
            "description",
            "step",
            "skill_levels",
            "category_ids",
            "categories",
            "created_at",
        ]
        read_only_fields = ["id"]

    def get_skill_levels(self, obj):
        """
        Handle get skill levels
        """
        skill_levels = obj.skill_levels.all()
        return SkillLevelSerializer(skill_levels, many=True).data

    def get_categories(self, obj):
        """
        Return categories of skill
        """
        org_cat_ids = obj.organizations_statistic_categories_skills.values_list(
            "organization_statistic_category", flat=True
        )
        categories = OrganizationsStatisticCategories.objects.filter(
            id__in=org_cat_ids
        ).all()
        transformed_categories = []
        for category in categories:
            transformed_categories.append(get_common_categories(category))

        return transformed_categories


class StepOfSkillSerializer(serializers.Serializer):
    """
    Step of skill serializer
    """

    step_1 = SkillSerializer(allow_null=True, required=False)
    step_2 = SkillSerializer(allow_null=True, required=False)
    step_3 = SkillSerializer(allow_null=True, required=False)


class BaseSkillHierarchySerializer(SkillSerializer):
    """
    Serializer for skill without organization
    """

    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "description",
            "step",
        ]
        read_only_fields = ["id"]


class SkillMapSkillLevelSerializer(serializers.ModelSerializer):
    """
    Serializer for skill map skill level
    """

    items = serializers.SerializerMethodField()

    class Meta:
        model = SkillMapSkillLevel
        fields = [
            "id",
            "skill_map",
            "level",
            "measure_count",
            "actual_measure_count",
            "measure_time",
            "actual_measure_time",
            "start_lookback_at",
            "next_submit_at",
            "look_back_interval",
            "look_back_type",
            "items",
            "is_complete",
        ]

    def get_items(self, obj):
        """
        Handle object item to text array item
        """
        data = []
        if obj.items:
            for item in obj.items:
                data.append(item["item"])
        return data


class SkillMapSerializer(serializers.ModelSerializer):
    """
    Serializer for Skill Map
    """

    skill = BaseSkillHierarchySerializer(read_only=True)
    is_locked = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    is_have_comment = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = SkillMap
        fields = [
            "id",
            "skill",
            "is_complete",
            "step",
            "level",
            "is_locked",
            "progress_percent",
            "is_have_comment",
        ]
        read_only_fields = ["id"]

    def get_progress_percent(self, obj):
        """
        Return progress percentage
        """
        if obj.is_complete:
            return 0
        skill_map_skill_level = obj.skill_map_skill_levels.filter(
            is_complete=False
        ).first()
        if skill_map_skill_level:
            skill_level = SkillMapSkillLevelSerializer(
                skill_map_skill_level
            ).data
            percent = 0
            if skill_level["measure_count"]:
                percent = (
                    skill_level["actual_measure_count"]
                    / skill_level["measure_count"]
                ) * 100
            elif skill_level["measure_time"]:
                hours, minutes, seconds = map(
                    int, skill_level["actual_measure_time"].split(":")
                )
                percent = (hours / skill_level["measure_time"]) * 100
            elif skill_level["start_lookback_at"]:
                start = datetime.fromisoformat(skill_level["start_lookback_at"])
                end = datetime.fromisoformat(skill_level["next_submit_at"])
                elapsed = (datetime.now() - start).total_seconds()
                total = (end - start).total_seconds()

                percent = (elapsed / total) * 100

            return max(0, min(round(percent), 100))
        else:
            return 0

    def get_is_locked(self, obj):
        """
        Return status of skill map
        """
        return not obj.skill_map_skill_levels.exists()

    def get_is_have_comment(self, obj):
        """
        Check comment of skill map
        """
        return SubmitLevelHistory.objects.filter(
            staff=obj.staff,
            skill=obj.skill,
            organization=obj.organization,
            status=SubmitLevelStatus.APPROVE.value,
        ).exists()

    def get_level(self, obj):
        """
        Return current level of skill map
        """
        skill_map_skill_level = obj.skill_map_skill_levels.filter(
            is_complete=False
        ).first()
        if not skill_map_skill_level:
            skill_map_skill_level = obj.skill_map_skill_levels.filter(
                is_complete=True
            ).last()
        return (
            SkillMapSkillLevelSerializer(skill_map_skill_level).data
            if skill_map_skill_level
            else None
        )


class SkillReplaceSkilMapSerializer(BaseSkillHierarchySerializer):
    """Skill replace skill map"""

    is_locked = serializers.SerializerMethodField()
    skill = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = [
            "id",
            "skill",
            "is_locked",
        ]

    def get_skill(self, obj):
        """
        Return skill field
        """
        return BaseSkillHierarchySerializer(obj).data

    def get_is_locked(self, obj):
        return True


class SkillMapWithSkillSerializer(serializers.Serializer):
    """Serializer for update skill map"""

    id = serializers.PrimaryKeyRelatedField(
        source="skill_map",
        queryset=SkillMap.objects.all(),
        write_only=True,
        required=True,
        allow_null=True,
    )
    is_checked = serializers.BooleanField(required=False)


class ListCreateSkillMapSerializer(serializers.Serializer):
    """
    Serializer for a list of organizations for reset index, returning an array directly.
    """

    items = SkillMapWithSkillSerializer(many=True)


class SkillWithoutOrganizationSerializer(SkillSerializer):
    """
    Serializer for skill without organization
    """

    skill_levels = SkillLevelSerializer(many=True)

    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "description",
            "step",
            "skill_levels",
        ]
        read_only_fields = ["id"]


class BaseOrganizationWithSkillSerializer(BaseOrganizationSerializer):
    """Serializer for base organization with skill"""

    skills = serializers.SerializerMethodField(read_only=True)
    steps = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "uuid", "name", "icon", "icon_color", "skills", "steps"]

    def get_steps(self, obj):
        """Return steps of organization"""
        step = obj.steps.first()

        return {
            "step_1": step.define_step_1 if step else None,
            "step_2": step.define_step_2 if step else None,
            "step_3": step.define_step_3 if step else None,
        }

    def get_skills(self, obj):
        """
        Handle group skills of organization by step
        """
        step = self.context.get("step", None)
        data = []
        skills = obj.skills.all()
        # Return list skill of organization by step
        if step:
            grouped_skills = skills.filter(step=step).all().order_by("id")
            data = SkillWithoutOrganizationSerializer(
                grouped_skills, many=True
            ).data
        # Return list skill hierarchy
        elif step is None:
            grouped_skills = (
                skills.filter(parent__isnull=True).all().order_by("id")
            )
            for skill in grouped_skills:
                group_data = {
                    "parent_name": skill.name,
                    "id": skill.id,
                    "detail": [],
                }
                while skill:
                    group_data["detail"].append(
                        BaseSkillHierarchySerializer(skill).data
                    )
                    skill = Skill.objects.filter(parent__id=skill.id).first()
                data.append(group_data)
        return data


class BaseOrganizationWithUserSkillMapSerializer(BaseOrganizationSerializer):
    """Serializer for base organization with skill"""

    users = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = ["id", "uuid", "name", "icon", "icon_color", "users"]

    def get_users(self, obj):
        """
        Handle check user with skill map
        """
        data = []
        skills = obj.skills.filter(parent__isnull=True).all()
        users = obj.users.all()
        for user in users:
            user_data = CreationDataUserWithMainOrganizationSerializer(
                user
            ).data
            user_data["skills"] = {}
            for skill in skills:
                skill_map = SkillMap.objects.filter(
                    skill=skill, staff=user, organization=obj
                ).first()
                user_data["skills"][skill.id] = {
                    "skill_map": skill_map.id if skill_map else None,
                    "is_checked": skill_map.is_valid if skill_map else False,
                }
            data.append(user_data)

        return data


# ========= Handle skill model for group step skill map =========


class SkillLevelForSkillMapSerializer(serializers.ModelSerializer):
    """
    Serializer for detail my skill map skill level
    """

    measure_count = serializers.SerializerMethodField()
    measure_time = serializers.SerializerMethodField()
    look_back_interval = serializers.SerializerMethodField()
    look_back_type = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    class Meta:
        model = SkillLevel
        fields = [
            "level",
            "measure_count",
            "measure_time",
            "look_back_interval",
            "look_back_type",
            "items",
        ]

    def _get_skill_map_value(self, obj, attr):
        """
        Retrieve an attribute value from the related skill_map_skill_level if available,
        otherwise fallback to the attribute value from the main SkillLevel instance.
        """
        skill_map = self.context.get("skill_map")
        skill_map_skill_level = obj.skill_map_skill_levels.filter(
            skill_map=skill_map
        ).first()
        if skill_map_skill_level:
            return getattr(skill_map_skill_level, attr)
        else:
            return getattr(obj, attr)

    def get_measure_count(self, obj):
        return self._get_skill_map_value(obj, "measure_count")

    def get_measure_time(self, obj):
        return self._get_skill_map_value(obj, "measure_time")

    def get_look_back_interval(self, obj):
        return self._get_skill_map_value(obj, "look_back_interval")

    def get_look_back_type(self, obj):
        return self._get_skill_map_value(obj, "look_back_type")

    def get_items(self, obj):
        """
        Handle object item to text array item
        """
        items = self._get_skill_map_value(obj, "items")
        data = []
        if items:
            for item in items:
                if isinstance(item, dict):
                    # Change items of skill map level to items of skill level
                    data.append(item.get("item"))
                else:
                    data.append(item)
        return data


class GroupStepSkillMapSerializer(SkillSerializer):
    """
    Serializer for skill map group step
    """

    organization = OrganizationSerializer(read_only=True)
    skill_levels = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "organization",
            "description",
            "step",
            "skill_levels",
            "categories",
            "created_at",
        ]

    def get_skill_levels(self, obj):
        """
        Return skill level and skill map skill level if have
        """
        skill_map = self.context.get("skill_map")
        skill_levels = obj.skill_levels.all()
        return SkillLevelForSkillMapSerializer(
            skill_levels, many=True, context={"skill_map": skill_map}
        ).data

    def get_categories(self, obj):
        """
        Return categories of skill
        """
        org_cat_ids = obj.organizations_statistic_categories_skills.values_list(
            "organization_statistic_category", flat=True
        )
        categories = OrganizationsStatisticCategories.objects.filter(
            id__in=org_cat_ids
        ).all()
        transformed_categories = []
        for category in categories:
            transformed_categories.append(get_common_categories(category))

        return transformed_categories


class DraftLevelUpSerializer(serializers.Serializer):
    """Serializer for draft level up"""

    from submit_levels.serializers import ItemsOfSubmitLevel

    items = ItemsOfSubmitLevel(many=True, required=False)
    approver = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
    )
