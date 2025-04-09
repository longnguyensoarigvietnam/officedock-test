from django.db import transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.status import (
    HTTP_204_NO_CONTENT,
    HTTP_405_METHOD_NOT_ALLOWED,
)

from base.apis import BaseAPIViewSet
from base.filters import FilterByPermission
from base.messages import ERROR_MESSAGES, KEYWORDS
from base.permissions import ActionPermission

from common.filters import CustomOrderFilter
from common.models import Category
from common.utils import transform_statistic_categories, generate_file_name
from skills.models import StatisticCategory, SkillMap
from submit_levels.models import SubmitLevelHistory
from roles.constants import Screens
from organizations.utils import get_high_level_organizations
from .filters import OrganizationFilter, OrganizationSkillFilter
from .serializers import (
    OrganizationCategoryHierarchyForCreateSerializer,
    OrganizationCategoryHierarchySerializer,
    OrganizationHierarchyForCreateSerializer,
    OrganizationHierarchySerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
    OrganizationDetailSerializer,
    ListOrganizationStatisticSerializer,
    ListOrganizationSkillSerializer,
    OrganizationSkillForGetListSerializer,
)
from .models import (
    Organization,
    OrganizationsSkills,
    OrganizationsStatisticCategories,
)


@extend_schema(tags=["System > Organization"])
class OrganizationViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Organization.
    """

    queryset = (
        Organization.objects.annotate(user_count=Count("users"))
        .order_by("-created_at")
        .all()
    )
    serializer_class = OrganizationSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        DjangoFilterBackend,
        CustomOrderFilter,
    ]
    ordering_fields = {
        "id": "id",
        "name": "name",
        "superior_name": "superior__name",
        "user_count": "user_count",
    }
    filterset_class = OrganizationFilter
    screen_name = Screens.ORGANIZATION.value
    lookup_field = "uuid"

    def get_permissions(self):
        """
        Switch screen name by query params
        """
        has_statistic_categories = self.request.query_params.get(
            "has_statistic_categories"
        )
        if has_statistic_categories and has_statistic_categories != "false":
            self.screen_name = Screens.CATEGORY_HIERARCHY.value

        return super().get_permissions()

    def get_queryset(self):
        """
        Filtering users by company.
        """

        user = self.request.user
        company = user.company

        return super().get_queryset().filter(company=company)

    def get_serializer_context(self):
        """
        Add request to context
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_serializer(self, *args, **kwargs):
        """
        Get serializer by action
        """
        has_statistic_categories = self.request.query_params.get(
            "has_statistic_categories"
        )

        if (
            self.action == "retrieve"
            or self.action == "list"
            and has_statistic_categories
        ):
            return OrganizationDetailSerializer(
                *args, **kwargs, context={"request": self.request}
            )

        return super().get_serializer(*args, **kwargs)

    def perform_create(self, serializer):
        """
        Custom logic for creating a new Organization instance.
        """
        serializer_data = serializer.validated_data
        icon = serializer_data.get("icon")

        if icon:
            # Gen new file name
            file_name = icon.name
            icon.name = generate_file_name(file_name)

        # Get the company from the logged in user and assign it to the organization
        serializer.save(company=self.request.user.company)

    @extend_schema(
        parameters=[
            OpenApiParameter("has_children", type=bool, required=False),
        ],
    )
    @action(
        methods=["GET", "POST"],
        detail=False,
        url_path="hierarchy",
        serializer_class=OrganizationHierarchyForCreateSerializer,
    )
    def hierarchy(self, request):
        """
        Handle hierarchy organization
        """
        if request.method == "GET":
            has_children = (
                request.query_params.get("has_children", "").lower() == "true"
            )
            orgs = (
                self.get_queryset()
                .order_by("updated_at")
                .values_list("id", "superior_id")
            )
            org_has_children, org_no_children = get_high_level_organizations(
                orgs
            )
            return self.response_ok(
                OrganizationHierarchySerializer(
                    org_has_children if has_children else org_no_children,
                    many=True,
                    context={"request": request},
                ).data
            )

        elif request.method == "POST":

            def _create_or_update(uuid):
                """
                Handle create or update organization
                """
                if uuid in created_map:
                    return created_map[uuid]  # Already processed

                org_data = org_map.get(uuid)
                if not org_data:
                    return Organization.objects.filter(
                        uuid=uuid
                    ).first()  # already exists

                parent_uuid = org_data.pop("parent_uuid", None)
                parent = None

                if parent_uuid:
                    parent = _create_or_update(
                        parent_uuid
                    )  # Recursive: create parent first

                # Update if exists
                org_instance = Organization.objects.filter(uuid=uuid).first()
                if org_instance:
                    for key, value in org_data.items():
                        setattr(org_instance, key, value)
                    org_instance.superior = parent
                    org_instance.save()
                else:
                    org_instance = Organization.objects.create(
                        **org_data,
                        superior=parent,
                        company=request.user.company,
                    )

                created_map[uuid] = org_instance
                return org_instance

            # Handle logic create organization hierarchy
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            organizations = validated_data.get("organizations", [])
            delete_uuids = validated_data.get("delete_uuids", [])

            # Build a map of uuid to data
            org_map = {
                org["uuid"]: org for org in organizations if "uuid" in org
            }
            created_map = {}  # Track created/updated objects by uuid

            for uuid in org_map:
                _create_or_update(uuid)

            # Handle delete
            if delete_uuids:
                if not isinstance(delete_uuids, list):
                    delete_uuids = [delete_uuids]

                orgs = Organization.objects.filter(uuid__in=delete_uuids).all()
                for org in orgs:
                    if org.icon:
                        org.icon.delete()
                orgs.delete()

            return self.response_ok()

        return self.response(status_code=HTTP_405_METHOD_NOT_ALLOWED)

    def perform_update(self, serializer):
        """
        Custom logic for updating an existing Organization instance.
        """

        instance = self.get_object()
        validated_data = serializer.validated_data
        superior = validated_data.get("superior", None)

        # Check if the superior organization belongs to the same company
        if superior and instance.company != superior.company:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["organization_not_exists"]}
            )

        if icon := validated_data.get("icon", None):
            # Remove old icon
            instance.icon.delete()

            # Gen new file name
            file_name = icon.name
            icon.name = generate_file_name(file_name)

        serializer.save()

    def perform_destroy(self, instance):
        """
        Method to perform destruction of an instance.
        """

        # Checking if there are any users associated with the organization
        if instance.users.count() > 0 or instance.tasks.count() > 0:
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["cannot_delete_type"].format(
                        type=KEYWORDS["organization"]
                    )
                }
            )

        # Remove icon
        instance.icon.delete()

        return super().perform_destroy(instance)

    def _check_category_exists(self, category_uuid):
        """Check category exists"""
        category = StatisticCategory.objects.filter(uuid=category_uuid).first()

        if not category:
            raise NotFound(
                {"detail": ERROR_MESSAGES["statistic_category_not_exists"]}
            )

        return category

    @extend_schema(parameters=[OpenApiParameter("search", type=str)])
    @action(
        methods=["GET"],
        detail=False,
        url_path="members",
        serializer_class=OrganizationMemberSerializer,
    )
    def members(self, request):
        """
        Get list of member in organization
        """
        queryset = self.get_queryset()
        search = request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                users__profile__full_name__icontains=search
            )

        return self.response_ok(
            self.get_serializer(
                queryset, many=True, context={"search": search}
            ).data
        )

    @action(
        methods=["GET", "POST", "DELETE"],
        detail=True,
        url_path="statistic-categories",
        serializer_class=ListOrganizationStatisticSerializer,
        screen_name=Screens.CATEGORY_HIERARCHY.value,
    )
    @transaction.atomic
    def statistic_categories(self, request, pk=None):
        """
        Handle create hierarchical category statistics to each organization
        """

        instance = self.get_object()
        if request.method == "GET":
            categories = OrganizationDetailSerializer(instance).data[
                "statistic_categories"
            ]
            return self.response_ok(transform_statistic_categories(categories))
        elif request.method == "DELETE":
            instance.organizations_statistic_categories.all().delete()

            return self.response(status_code=HTTP_204_NO_CONTENT)
        else:
            serializer = self.get_serializer(
                data=request.data, instance=instance
            )
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data
            organization_statistic_categories = validated_data.get(
                "organization_statistic_categories", None
            )
            invalid_skill_names = []

            for i, data in enumerate(organization_statistic_categories):
                # Extract current category UUIDs to compare
                large_statistic_category_uuid = data.get(
                    "large_statistic_category_uuid", None
                )
                medium_statistic_category_uuid = data.get(
                    "medium_statistic_category_uuid", None
                )
                small_statistic_category_uuid = data.get(
                    "small_statistic_category_uuid", None
                )
                if (
                    large_statistic_category_uuid
                    == medium_statistic_category_uuid
                    == small_statistic_category_uuid
                    is None
                ):
                    continue
                skills = data.get("skills", None)

                # Validate that the skills belong to the specified organization
                if skills:
                    valid_skill_ids = set(
                        OrganizationsSkills.objects.filter(
                            organization=instance
                        ).values_list("skill", flat=True)
                    )

                    # Iterate through each skill in the provided list
                    for skill in skills:
                        invalid_skill_names.append(
                            skill.name
                        ) if skill.id not in valid_skill_ids and skill.name not in invalid_skill_names else None

                # Check against all subsequent elements in organization_statistic_categories
                for next_data in organization_statistic_categories[i + 1 :]:
                    # Extract UUIDs for comparison from the next elements
                    next_large_uuid = next_data.get(
                        "large_statistic_category_uuid", None
                    )
                    next_medium_uuid = next_data.get(
                        "medium_statistic_category_uuid", None
                    )
                    next_small_uuid = next_data.get(
                        "small_statistic_category_uuid", None
                    )

                    # Check if all category UUIDs match, indicating a duplicate
                    if (
                        large_statistic_category_uuid == next_large_uuid
                        and medium_statistic_category_uuid == next_medium_uuid
                        and small_statistic_category_uuid == next_small_uuid
                    ):
                        raise ValidationError(
                            {"detail": ERROR_MESSAGES["exists_struct"]}
                        )

            # If there are any invalid skill name, raise a validation error
            if invalid_skill_names:
                raise ValidationError(
                    {
                        "detail": ERROR_MESSAGES[
                            "skill_not_exists_in_organization"
                        ].format(
                            names=KEYWORDS["comma"].join(invalid_skill_names)
                        )
                    }
                )

            # Remove all organization category skills
            instance.organizations_statistic_categories_skills.all().delete()

            for data in organization_statistic_categories:
                organization_statistic_category = data.get(
                    "organization_statistic_category", None
                )
                large_statistic_category_uuid = data.get(
                    "large_statistic_category_uuid", None
                )
                medium_statistic_category_uuid = data.get(
                    "medium_statistic_category_uuid", None
                )
                small_statistic_category_uuid = data.get(
                    "small_statistic_category_uuid", None
                )
                index = data.get("index", None)
                skills = data.get("skills", None)

                # Validate exists large Statistic Category
                large_statistic_category = None
                if large_statistic_category_uuid:
                    large_statistic_category = self._check_category_exists(
                        large_statistic_category_uuid
                    )

                # Validate exists medium Statistic Category
                medium_statistic_category = None
                if medium_statistic_category_uuid:
                    medium_statistic_category = self._check_category_exists(
                        medium_statistic_category_uuid
                    )

                # Validate exists small Statistic Category
                small_statistic_category = None
                if small_statistic_category_uuid:
                    small_statistic_category = self._check_category_exists(
                        small_statistic_category_uuid
                    )

                if (
                    large_statistic_category is None
                    and small_statistic_category is None
                    and medium_statistic_category is None
                    and organization_statistic_category
                ):
                    # Delete related task/schedule categories
                    Category.objects.filter(
                        Q(
                            large_statistic_category=organization_statistic_category.large_statistic_category,
                            medium_statistic_category=organization_statistic_category.medium_statistic_category,
                            small_statistic_category=organization_statistic_category.small_statistic_category,
                        )
                        & Q(
                            Q(task__organization=instance)
                            | Q(schedule__organization=instance)
                        )
                    ).all().delete()
                    organization_statistic_category.delete()
                elif any(
                    [
                        large_statistic_category,
                        small_statistic_category,
                        medium_statistic_category,
                    ]
                ):

                    if organization_statistic_category:
                        # Update related task/schedule categories
                        categories = Category.objects.filter(
                            Q(
                                large_statistic_category=organization_statistic_category.large_statistic_category,
                                medium_statistic_category=organization_statistic_category.medium_statistic_category,
                                small_statistic_category=organization_statistic_category.small_statistic_category,
                            )
                            & Q(
                                Q(task__organization=instance)
                                | Q(schedule__organization=instance)
                            )
                        ).all()
                        for cat in categories:
                            cat.large_statistic_category = (
                                large_statistic_category
                            )
                            cat.medium_statistic_category = (
                                medium_statistic_category
                            )
                            cat.small_statistic_category = (
                                small_statistic_category
                            )
                            cat.save()
                        # Update the existing record
                        organization_statistic_category.large_statistic_category = (
                            large_statistic_category
                        )
                        organization_statistic_category.medium_statistic_category = (
                            medium_statistic_category
                        )
                        organization_statistic_category.small_statistic_category = (
                            small_statistic_category
                        )
                        organization_statistic_category.index = index
                        organization_statistic_category.save()
                    else:
                        # Create a new record since no matching record was found
                        organization_statistic_category = instance.organizations_statistic_categories.create(
                            index=index,
                            large_statistic_category=large_statistic_category,
                            medium_statistic_category=medium_statistic_category,
                            small_statistic_category=small_statistic_category,
                        )

                    # Create new organization category skills
                    if organization_statistic_category and skills:
                        for skill in skills:
                            instance.organizations_statistic_categories_skills.get_or_create(
                                organization_statistic_category=organization_statistic_category,
                                skill=skill,
                            )

        return self.response_ok()

    @action(
        methods=["GET", "POST", "DELETE"],
        detail=True,
        url_path="skills",
        serializer_class=ListOrganizationSkillSerializer,
        screen_name=Screens.ORGANIZATION_SKILL.value,
    )
    @transaction.atomic
    def skills(self, request, pk=None):
        """
        Handle skills to each organization by method
        """

        instance = self.get_object()
        if request.method == "GET":
            return self.response_ok(
                OrganizationDetailSerializer(instance).data["skills"]
            )
        elif request.method == "DELETE":
            instance.organizations_skills.all().delete()

            return self.response(status_code=HTTP_204_NO_CONTENT)
        else:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data
            organization_skills = validated_data.get(
                "organization_skills", None
            )

            for data in organization_skills:
                organization_skill = data.pop("organization_skill", None)
                skill = data.get("skill", None)

                # Check if change skill has submitted level
                if (
                    organization_skill
                    and (organization_skill.skill != skill or skill is None)
                    and SubmitLevelHistory.objects.filter(
                        organization=organization_skill.organization,
                        skill=organization_skill.skill,
                    ).exists()
                ):
                    raise ValidationError(
                        {
                            "detail": ERROR_MESSAGES["cannot_updated"],
                        }
                    )

                if skill is None and organization_skill:
                    organization_skill.delete()
                elif skill:
                    organization_skill_id = (
                        organization_skill.id if organization_skill else None
                    )
                    data["skill"] = skill
                    instance.organizations_skills.update_or_create(
                        id=organization_skill_id, defaults=data
                    )

        return self.response_ok()


@extend_schema(tags=["System > Organization > Skill"])
class OrganizationSkillViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API for organization skill
    """

    queryset = OrganizationsSkills.objects.all()
    serializer_class = OrganizationSkillForGetListSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
        CustomOrderFilter,
    ]
    ordering_fields = {"id": "id", "name": "name"}
    filterset_class = OrganizationSkillFilter
    screen_name = Screens.ORGANIZATION_SKILL.value

    def get_queryset(self):
        """
        Filtering users by company.
        """

        user = self.request.user
        company = user.company

        return super().get_queryset().filter(company=company).order_by("id")

    def perform_destroy(self, instance):
        """Handle destroy organization skill"""
        # Check if change skill has submitted level
        if (
            SkillMap.objects.filter(
                organization=instance.organization,
                skill=instance.skill,
            ).exists()
            or SubmitLevelHistory.objects.filter(
                organization=instance.organization,
                skill=instance.skill,
            ).exists()
        ):
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["cannot_delete"],
                }
            )

        instance.delete()

        return self.response(status_code=HTTP_204_NO_CONTENT)


@extend_schema(tags=["System > Organization > Statistic Category hierarchy"])
class OrganizationCategoryHierarchyViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for Organization Category.
    """

    queryset = Organization.objects.all()
    serializer_class = OrganizationCategoryHierarchySerializer
    permission_classes = [ActionPermission]
    pagination_class = None
    screen_name = Screens.CATEGORY_HIERARCHY.value

    def get_queryset(self):
        """
        Filtering orgs by company.
        """

        user = self.request.user
        company = user.company

        return super().get_queryset().filter(company=company).order_by("-id")

    def get_serializer_class(self):
        """Custom serializer class"""
        if self.action == "create":
            return OrganizationCategoryHierarchyForCreateSerializer

        return super().get_serializer_class()

    def get_serializer_context(self):
        """
        Add request to context
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        company = request.user.company
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        data_to_create = serializer_data.pop("items", [])
        ids_to_delete = serializer_data.pop("ids", [])

        if data_to_create:
            for item in data_to_create:
                organization_statistic_category = item.pop(
                    "organization_statistic_category", None
                )
                large_statistic_category = (
                    self._get_statistic_category_instance(
                        item.pop("large_statistic_category", None), company
                    )
                )
                medium_statistic_category = (
                    self._get_statistic_category_instance(
                        item.pop("medium_statistic_category", None), company
                    )
                )
                small_statistic_category = (
                    self._get_statistic_category_instance(
                        item.pop("small_statistic_category", None), company
                    )
                )
                color = item.get("color", None)
                organization = item.get("organization", None)
                skills = item.pop("skills", [])

                if organization_statistic_category:
                    # Handle to create new organization_statistic_category
                    organization_statistic_category.large_statistic_category = (
                        large_statistic_category
                    )
                    organization_statistic_category.medium_statistic_category = (
                        medium_statistic_category
                    )
                    organization_statistic_category.small_statistic_category = (
                        small_statistic_category
                    )
                    if color:
                        organization_statistic_category.color = color
                    organization_statistic_category.save()

                    # Remove skills
                    organization_statistic_category.organizations_statistic_categories_skills.all().delete()

                else:
                    # Handle to update organization_statistic_category
                    organization_statistic_category = (
                        OrganizationsStatisticCategories.objects.create(
                            **item,
                            large_statistic_category=large_statistic_category,
                            medium_statistic_category=medium_statistic_category,
                            small_statistic_category=small_statistic_category,
                        )
                    )

                # Remove duplicate record
                records = OrganizationsStatisticCategories.objects.filter(
                    organization=organization,
                    large_statistic_category=large_statistic_category,
                    medium_statistic_category=medium_statistic_category,
                    small_statistic_category=small_statistic_category,
                ).order_by("-updated_at")
                ids = records.exclude(id=records.first().id).values_list(
                    "id", flat=True
                )
                ids_to_delete = set(ids_to_delete) | set(
                    ids
                )  # Merge ids to delete

                # Create new organization category skills
                if organization_statistic_category and skills:
                    for skill in skills:
                        organization_statistic_category.organizations_statistic_categories_skills.get_or_create(
                            organization=organization_statistic_category.organization,
                            skill=skill,
                        )

        if ids_to_delete:
            OrganizationsStatisticCategories.objects.filter(
                id__in=ids_to_delete
            ).delete()

        return self.response_created()

    def _get_statistic_category_instance(self, obj, company):
        """Get instance"""
        large_statistic_category = None

        if obj:
            (
                large_statistic_category,
                _,
            ) = StatisticCategory.objects.get_or_create(
                company=company,
                name=obj.get("name"),
                defaults={"uuid": obj.get("uuid")},
            )
        return large_statistic_category
