from django.db.models import (
    F,
    Case,
    CharField,
    Q,
    Value,
    When,
)
from django.db.models.functions import Concat
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES, KEYWORDS
from common.constants import AVATAR_GCS_EXPIRATION_SECONDS
from common.utils import (
    compare_categories,
    get_deleted_name,
    get_deleted_name_skill,
    get_signed_url,
)
from roles.constants import Actions, Screens
from roles.utils import has_permission
from skills.models import StatisticCategory, Skill
from common.constants import ORGANIZATION_ICON_UPLOAD_MAX_SIZE
from organizations.constants import OrganizationTypes
from .models import (
    Organization,
    OrganizationsStatisticCategories,
)
from calendars.constants import ScheduleCategoryTypes


class BaseOrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Organization.
    """

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "icon",
            "icon_color",
            "type",
        ]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.icon:
            representation["icon"] = get_signed_url(
                instance.icon, AVATAR_GCS_EXPIRATION_SECONDS
            )
        if instance.deleted_at:
            representation["name"] = f"{instance.name}{KEYWORDS['deleted']}"

        return representation


class BaseStatisticCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for statistic category
    """

    name = serializers.SerializerMethodField()

    class Meta:
        model = StatisticCategory
        fields = ["id", "name", "uuid", "team", "deleted_at"]

    def get_name(self, obj):
        is_hidden = self.context.get("is_hidden")
        return get_deleted_name_skill(obj, is_hidden)


class StatisticCategoryForHierarchySerializer(serializers.ModelSerializer):
    """
    Serializer for statistic category
    """

    name = serializers.SerializerMethodField()

    class Meta:
        model = StatisticCategory
        fields = ["id", "name", "uuid", "team", "deleted_at"]

    def get_name(self, obj):
        return get_deleted_name(obj)


class StatisticCategorySerializer(serializers.ModelSerializer):
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
            "team",
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

        if not attrs.get("team", None):
            queryset = StatisticCategory.objects.filter(
                company=company, name=name, team__isnull=True
            )

            if instance:
                queryset = queryset.exclude(id=instance.id)

            if queryset.exists():
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["unique_category_name"]}
                )

        return attrs

    def get_organizations(self, obj):
        """Get organizations by category"""
        org_stats = (
            OrganizationsStatisticCategories.objects.filter(
                Q(large_statistic_category=obj)
                | Q(medium_statistic_category=obj)
                | Q(small_statistic_category=obj)
            )
            .order_by("id")
            .select_related("organization")
        )

        organizations = []
        for stat in org_stats:
            if stat.organization not in organizations:
                organizations.append(stat.organization)

        return BaseOrganizationSerializer(organizations, many=True).data


class StatisticCategoryStructionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Statistic Category Struction.
    """

    large_statistic_category = serializers.SerializerMethodField()
    medium_statistic_category = serializers.SerializerMethodField()
    small_statistic_category = serializers.SerializerMethodField()
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
            "deleted_type",
        ]

    def get_large_statistic_category(self, obj):
        """
        Return serialized data for the large-level statistic category.
        If the object has been deleted at the large category level,
        mark this category as hidden.
        """
        if not obj.large_statistic_category_id:
            return None

        is_hidden = obj.deleted_type == ScheduleCategoryTypes.LARGE.value

        data = BaseStatisticCategorySerializer(
            obj.large_statistic_category, context={"is_hidden": is_hidden}
        ).data
        data["is_hidden"] = is_hidden
        return data

    def get_medium_statistic_category(self, obj):
        """
        Return serialized data for the medium-level statistic category.
        Mark hidden if the category is deleted at the medium or higher level
        (medium or large), since that implies this category is no longer visible.
        """
        if not obj.medium_statistic_category_id:
            return None

        is_hidden = obj.deleted_type in [
            ScheduleCategoryTypes.MEDIUM.value,
            ScheduleCategoryTypes.LARGE.value,
        ]

        data = BaseStatisticCategorySerializer(
            obj.medium_statistic_category, context={"is_hidden": is_hidden}
        ).data
        data["is_hidden"] = is_hidden
        return data

    def get_small_statistic_category(self, obj):
        """
        Return serialized data for the small-level statistic category.
        Mark hidden if the category is deleted at the small level or above
        (small, medium, or large), meaning any parent-level deletion affects visibility.
        """
        if not obj.small_statistic_category_id:
            return None

        is_hidden = obj.deleted_type in [
            ScheduleCategoryTypes.SMALL.value,
            ScheduleCategoryTypes.MEDIUM.value,
            ScheduleCategoryTypes.LARGE.value,
        ]

        data = BaseStatisticCategorySerializer(
            obj.small_statistic_category, context={"is_hidden": is_hidden}
        ).data
        data["is_hidden"] = is_hidden
        return data

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
        ).values_list("skill")

        # Rename the keys to match expected output
        return [
            {"id": id, "name": name}
            for id, name in skills.annotate(
                name=Case(
                    When(
                        skill__deleted_at__isnull=False,
                        then=Concat(
                            F("skill__name"), Value(KEYWORDS["deleted"])
                        ),
                    ),
                    default=F("skill__name"),
                    output_field=CharField(),
                )
            ).values_list("skill__id", "name")
        ]


class OrganizationSerializer(serializers.ModelSerializer):
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
            "icon_color",
            "type",
            "deleted_at",
        ]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.icon:
            representation["icon"] = get_signed_url(
                instance.icon, AVATAR_GCS_EXPIRATION_SECONDS
            )

        return representation

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
            "parent_uuid",
            "is_hierarchy",
            "type",
        ]


class OrganizationHierarchyForCreateSerializer(serializers.Serializer):
    """
    Serializer for the Organization  hierarchy create multi.
    """

    organizations = BaseOrganizationHierarchySerializer(
        many=True, required=False
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
            "icon_color",
            "children",
            "type",
        ]

    def get_children(self, obj):
        """
        Handle get children of tag
        """
        user = self.context.get("request").user

        # Fetch the child tags of the current tag
        children = Organization.objects.filter(
            company_id=user.company_id, superior=obj
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

    def to_representation(self, instance):
        """Override representation"""
        representation = super().to_representation(instance)
        if instance.deleted_at:
            representation["name"] = f"{instance.name}{KEYWORDS['deleted']}"

        return representation


class OrganizationDetailSerializer(OrganizationSerializer):
    """
    Serializer for the Organization.
    """

    statistic_categories = serializers.SerializerMethodField()

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
            "actions",
            "icon",
            "icon_color",
            "type",
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
            "type",
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
        fields = [
            "id",
            "uuid",
            "name",
            "users",
            "icon",
            "icon_color",
            "type",
        ]

    def get_users(self, obj):
        """Get users in organization"""
        from common.serializers import CreationDataUserSerializer

        users = obj.users.filter(deleted_at__isnull=True).order_by("created_at")

        if search := self.context.get("search"):
            users = users.filter(profile__full_name__icontains=search)

        return CreationDataUserSerializer(users, many=True).data


"""
Begin handle organization category hierarchy
"""


class OrgStatisticCategoryHierarchySerializer(serializers.ModelSerializer):
    """
    Serializer for the Statistic Category Struction.
    """

    large_statistic_category = serializers.SerializerMethodField()
    medium_statistic_category = serializers.SerializerMethodField()
    small_statistic_category = serializers.SerializerMethodField()
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
            "deleted_type",
        ]

    def get_large_statistic_category(self, obj):
        """
        Return serialized data for the large-level statistic category.
        If the object has been deleted at the large category level,
        mark this category as hidden.
        """
        is_hidden = obj.deleted_type == ScheduleCategoryTypes.LARGE.value

        data = StatisticCategoryForHierarchySerializer(
            obj.large_statistic_category
        ).data
        data["is_hidden"] = is_hidden
        return data

    def get_medium_statistic_category(self, obj):
        """
        Return serialized data for the medium-level statistic category.
        Mark hidden if the category is deleted at the medium or higher level
        (medium or large), since that implies this category is no longer visible.
        """
        is_hidden = obj.deleted_type in [
            ScheduleCategoryTypes.MEDIUM.value,
            ScheduleCategoryTypes.LARGE.value,
        ]

        data = StatisticCategoryForHierarchySerializer(
            obj.medium_statistic_category
        ).data
        data["is_hidden"] = is_hidden
        return data

    def get_small_statistic_category(self, obj):
        """
        Return serialized data for the small-level statistic category.
        Mark hidden if the category is deleted at the small level or above
        (small, medium, or large), meaning any parent-level deletion affects visibility.
        """
        is_hidden = obj.deleted_type in [
            ScheduleCategoryTypes.SMALL.value,
            ScheduleCategoryTypes.MEDIUM.value,
            ScheduleCategoryTypes.LARGE.value,
        ]

        data = StatisticCategoryForHierarchySerializer(
            obj.small_statistic_category
        ).data
        data["is_hidden"] = is_hidden
        return data

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
        ).values_list("skill")

        # Rename the keys to match expected output
        return [
            {"id": id, "name": name}
            for id, name in skills.annotate(
                name=Case(
                    When(
                        skill__deleted_at__isnull=False,
                        then=Concat(
                            F("skill__name"), Value(KEYWORDS["deleted"])
                        ),
                    ),
                    default=F("skill__name"),
                    output_field=CharField(),
                )
            ).values_list("skill__id", "name")
        ]


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
            "icon_color",
            "statistic_categories",
            "type",
        ]

    def get_statistic_categories(self, obj):
        """
        Get and organize statistic categories for the given organization.
        Group by: large -> medium -> small categories
        """

        # Get all related records for the current organization
        base_qs = obj.organizations_statistic_categories.all()

        # Serialize and return the data
        return OrgStatisticCategoryHierarchySerializer(
            base_qs, many=True, context=self.context
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
        queryset=Organization.all_objects.all(),
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
            "deleted_type",
        ]


class OrganizationCategoryHierarchyForDeleteSerializer(serializers.Serializer):
    """
    Serializer for the Organization category hierarchy delete multi.
    """

    id = serializers.IntegerField()
    type = serializers.ChoiceField(
        choices=ScheduleCategoryTypes.choices(), required=False, allow_null=True
    )


class OrganizationCategoryHierarchyForCreateSerializer(serializers.Serializer):
    """
    Serializer for the Organization category hierarchy create multi.
    """

    # List items for create new or update
    items = OrgCategoryHierarchySerializer(many=True, required=False)

    # List items for delete or restore (when restore then set type is null)
    items_to_delete = OrganizationCategoryHierarchyForDeleteSerializer(
        many=True, allow_null=True, required=False
    )

    def validate_category(self, category_data, organization, company_id):
        """
        Validate that the category belongs to the same team as the organization.
        """
        if not category_data:
            return

        category_uuid = category_data.get("uuid")
        if not category_uuid:
            return

        category = StatisticCategory.objects.filter(
            company_id=company_id, uuid=category_uuid
        ).first()

        if category and category.team and category.team != organization:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["cannot_select_category_other_team"]}
            )

    def validate(self, attrs):
        request = self.context.get("request")
        company_id = request.user.company_id
        items = attrs.get("items", [])

        for item in items:
            organization = item.get("organization")

            self.validate_category(
                item.get("large_statistic_category"), organization, company_id
            )
            self.validate_category(
                item.get("medium_statistic_category"), organization, company_id
            )
            self.validate_category(
                item.get("small_statistic_category"), organization, company_id
            )

        return super().validate(attrs)


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


class StepSerializer(serializers.Serializer):
    """
    Level serializer
    """

    define_step_1 = serializers.CharField(
        max_length=255, required=False, allow_null=True
    )
    define_step_2 = serializers.CharField(
        max_length=255, required=False, allow_null=True
    )
    define_step_3 = serializers.CharField(
        max_length=255, required=False, allow_null=True
    )
