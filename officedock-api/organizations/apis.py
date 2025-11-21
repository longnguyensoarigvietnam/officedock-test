from datetime import datetime
from django.db import transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import (
    Count,
    Q,
)
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
from common.utils import (
    to_camel_case,
    to_snake_case,
    generate_file_name,
    transform_statistic_categories,
    transform_statistic_categories_for_skill_map,
)
from roles.constants import Screens
from organizations.utils import get_high_level_organizations
from organizations.constants import OrganizationTypes
from tasks.models import TaskDuration
from users.serializers import OrganizationForUserSerializer
from skills.models import StatisticCategory
from .filters import OrganizationFilter
from .serializers import (
    CheckActualDurationSerializer,
    OrganizationCategoryHierarchyForCreateSerializer,
    OrganizationCategoryHierarchySerializer,
    OrganizationHierarchyForCreateSerializer,
    OrganizationHierarchySerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
    OrganizationDetailSerializer,
    ListOrganizationStatisticSerializer,
    StepSerializer,
)
from .models import (
    Organization,
    OrganizationsStatisticCategories,
)


@extend_schema(tags=["System > Organization"])
class OrganizationViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Organization by UUID.
    """

    queryset = (
        Organization.all_objects.annotate(user_count=Count("users"))
        .order_by("-created_at")
        .all()
    )
    serializer_class = OrganizationSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        DjangoFilterBackend,
        CustomOrderFilter,
        FilterByPermission,
    ]
    ordering_fields = {
        "id": "id",
        "name": "name",
        "superior_name": "superior__name",
        "user_count": "user_count",
    }
    filterset_class = OrganizationFilter
    screen_name = None
    lookup_field = "uuid"

    def get_permissions(self):
        """
        Switch screen name by query params
        """
        screen_name = self.request.query_params.get(
            "current_screen", Screens.ORGANIZATION.value
        )
        if screen_name and to_camel_case(screen_name) in [
            to_camel_case(item.value) for item in Screens
        ]:
            self.screen_name = to_snake_case(screen_name)

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
        company_id = user.company_id
        if self.action in ["members", "list"]:
            return (
                Organization.objects.filter(company_id=company_id)
                .annotate(user_count=Count("users"))
                .order_by("-created_at")
                .all()
            )

        return super().get_queryset().filter(company_id=company_id)

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
        serializer.save(company_id=self.request.user.company_id)

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
        screen_name=Screens.ORGANIZATION_HIERARCHY.value,
    )
    @transaction.atomic()
    def hierarchy(self, request):
        """
        Handle hierarchy organization
        """
        if request.method == "GET":
            has_children = (
                request.query_params.get("has_children", "").lower() == "true"
            )
            order_file = "hierarchize_at" if has_children else "-id"
            queryset = self.get_queryset().order_by(order_file, "updated_at")
            orgs = queryset.filter(
                type=OrganizationTypes.NORMAL.value
            ).values_list("id", "superior_id")
            org_has_children, org_no_children = get_high_level_organizations(
                orgs
            )

            if not has_children:
                return self.response_ok(
                    {
                        "organization_not_hierarchies": OrganizationHierarchySerializer(
                            org_no_children,
                            many=True,
                            context={"request": request},
                        ).data,
                    }
                )

            project_organizations = queryset.filter(
                type=OrganizationTypes.PROJECT.value
            ).all()

            return self.response_ok(
                {
                    "organization_hierarchies": OrganizationHierarchySerializer(
                        org_has_children,
                        many=True,
                        context={"request": request},
                    ).data,
                    "project_organizations": OrganizationHierarchySerializer(
                        project_organizations,
                        many=True,
                        context={"request": request},
                    ).data,
                }
            )

        elif request.method == "POST":

            def _create_or_update(uuid):
                """
                Handle create or update organization
                """
                if uuid in updated_map:
                    return updated_map[uuid]  # Already processed

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

                # Check hierarchy assigned at
                is_hierarchy = org_data.pop("is_hierarchy", False)
                if is_hierarchy:
                    org_data["hierarchize_at"] = datetime.now()
                else:
                    org_data["hierarchize_at"] = None

                if org_instance:
                    for key, value in org_data.items():
                        setattr(org_instance, key, value)
                    org_instance.superior = parent
                    org_instance.save()
                    updated_map[uuid] = org_instance
                return org_instance

            # Handle logic create organization hierarchy
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            organizations = validated_data.get("organizations", [])

            # Build a map of uuid to data
            org_map = {
                org["uuid"]: org for org in organizations if "uuid" in org
            }

            # Clear hierarchy for organization
            Organization.objects.filter(
                company_id=request.user.company_id
            ).exclude(uuid__in=list(org_map.keys())).update(
                superior=None,
                hierarchize_at=None,
                type=OrganizationTypes.NORMAL.value,
            )

            updated_map = {}  # Track created/updated objects by uuid

            for uuid in org_map:
                _create_or_update(uuid)

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
        if (
            instance.users.count() > 0
            or instance.tasks.count() > 0
            or instance.schedules.count() > 0
        ):
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["cannot_delete_type"].format(
                        type=KEYWORDS["organization"]
                    )
                }
            )

        # Handle remove hierarchy in children
        descendant_ids = []

        def _get_children(instance):
            children = instance.organizations.all()
            for child in children:
                descendant_ids.append(child.id)
                _get_children(child)

        _get_children(instance)
        Organization.objects.filter(id__in=descendant_ids).update(
            superior=None, hierarchize_at=None
        )

        # Remove icon
        if instance.icon:
            instance.icon.delete()

        return super().perform_destroy(instance)

    @extend_schema(
        parameters=[
            OpenApiParameter("search", type=str),
            OpenApiParameter("screen_name", type=str, required=False),
        ]
    )
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
        queryset = self.filter_queryset(self.get_queryset())
        search = request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                users__profile__full_name__icontains=search
            )

        return self.response_ok(
            self.get_serializer(
                queryset.distinct(), many=True, context={"search": search}
            ).data
        )


@extend_schema(tags=["System > Organization"])
class OrganizationByIDViewSet(BaseAPIViewSet):
    """
    API endpoint for Organization by ID.
    """

    queryset = Organization.all_objects.order_by("-created_at")
    serializer_class = OrganizationSerializer
    permission_classes = [ActionPermission]
    screen_name = None

    def get_permissions(self):
        """Filter data by current screen"""
        screen_name = self.request.query_params.get(
            "screen_name", Screens.ORGANIZATION.value
        )
        if screen_name and to_camel_case(screen_name) in [
            to_camel_case(item.value) for item in Screens
        ]:
            self.screen_name = to_snake_case(screen_name)
        return super().get_permissions()

    def get_queryset(self):
        """
        Filtering users by company.
        """

        user = self.request.user
        return super().get_queryset().filter(company_id=user.company_id)

    def _check_category_exists(self, category_uuid):
        """Check category exists"""
        category = StatisticCategory.objects.filter(uuid=category_uuid).first()

        if not category:
            raise NotFound(
                {"detail": ERROR_MESSAGES["statistic_category_not_exists"]}
            )

        return category

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
        company = request.user.company
        calendar_org = company.get_calendar_organization()
        instance = self.get_object()
        if request.method == "GET":
            current_screen = request.query_params.get("current_screen")
            categories = OrganizationDetailSerializer(instance).data[
                "statistic_categories"
            ]
            if current_screen == to_camel_case(Screens.SKILL_MAP.value):
                return self.response_ok(
                    transform_statistic_categories_for_skill_map(categories)
                )
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
                            | Q(schedule__organization=calendar_org)
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
                                | Q(schedule__organization=calendar_org)
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
        methods=["POST"],
        detail=True,
        url_path="define-steps",
        serializer_class=StepSerializer,
        screen_name=Screens.SKILL_MAP_MANAGEMENT.value,
    )
    @transaction.atomic
    def define_steps(self, request, pk=None):
        """
        Define step by organization
        """
        instance = self.get_object()
        serializer = StepSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        instance.steps.update_or_create(
            defaults=validated_data,
        )

        return self.response_ok()


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

    queryset = Organization.all_objects.all()
    serializer_class = OrganizationCategoryHierarchySerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
    ]
    pagination_class = None
    screen_name = Screens.CATEGORY_HIERARCHY.value

    def get_queryset(self):
        """
        Filtering orgs by company.
        """

        user = self.request.user
        queryset = super().get_queryset()

        if (
            self.request.query_params.get("is_only_calendar", "").lower()
            == "true"
        ):
            queryset = queryset.filter(type=OrganizationTypes.CALENDAR.value)
        else:
            queryset = queryset.exclude(type=OrganizationTypes.CALENDAR.value)

        return queryset.filter(company_id=user.company_id).order_by("-id")

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

    @extend_schema(
        parameters=[
            OpenApiParameter("is_only_calendar", type=bool, required=False),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(
        methods=["POST"],
        detail=False,
        url_path="check-actual-duration",
        serializer_class=CheckActualDurationSerializer,
    )
    def check_has_actual_duration(self, request):
        """
        Check if any TaskDuration exists for given categories and organization.
        """
        company = request.user.company
        calendar_org = company.get_calendar_organization()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        organizations_statistic_categories = validated_data.get(
            "organizations_statistic_categories", []
        )

        # Check data delete is delete_all_large or delete_all_medium
        (
            delete_all_large,
            delete_all_medium,
        ) = self.check_statistic_category_deletion_impact(
            company, organizations_statistic_categories
        )

        # Detect data delete has actual duration
        exists_actual_duration = False
        filter_q = Q()

        for item in organizations_statistic_categories:
            org = item.organization
            large_stat = item.large_statistic_category or None
            medium_stat = item.medium_statistic_category or None
            small_stat = item.small_statistic_category or None

            if not large_stat and not medium_stat and not small_stat:
                continue

            # Build base Q filter
            category_q = Q(
                task__categories__large_statistic_category=large_stat,
                task__categories__medium_statistic_category=medium_stat,
                task__categories__small_statistic_category=small_stat,
            ) | Q(
                schedule__categories__large_statistic_category=large_stat,
                schedule__categories__medium_statistic_category=medium_stat,
                schedule__categories__small_statistic_category=small_stat,
            )

            # Handle delete_all_large and delete_all_medium
            if delete_all_large and large_stat:
                delete_all_medium = True
                filter_q |= Q(
                    task__categories__large_statistic_category=large_stat,
                    task__categories__medium_statistic_category=None,
                    task__categories__small_statistic_category=None,
                ) | Q(
                    schedule__categories__large_statistic_category=large_stat,
                    schedule__categories__medium_statistic_category=None,
                    schedule__categories__small_statistic_category=None,
                )

            if delete_all_medium and large_stat and medium_stat:
                filter_q |= Q(
                    task__categories__large_statistic_category=large_stat,
                    task__categories__medium_statistic_category=medium_stat,
                    task__categories__small_statistic_category=None,
                ) | Q(
                    schedule__categories__large_statistic_category=large_stat,
                    schedule__categories__medium_statistic_category=medium_stat,
                    schedule__categories__small_statistic_category=None,
                )

            combined_q = (
                Q(company=company)
                & (
                    Q(task__organization=org)
                    | Q(schedule__organization=calendar_org)
                )
                & (category_q | filter_q)
            )

            if TaskDuration.objects.filter(combined_q).exists():
                exists_actual_duration = True
                break

        return self.response_ok({"has_actual_duration": exists_actual_duration})

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        company = request.user.company
        calendar_org = company.get_calendar_organization()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        data_to_create = serializer_data.pop("items", [])
        ids_to_delete = serializer_data.pop("ids", [])

        if data_to_create:
            for item in data_to_create:
                organization = item.get("organization", None)
                organization_statistic_category = item.pop(
                    "organization_statistic_category", None
                )
                large_statistic_category = (
                    self._get_statistic_category_instance(
                        item.pop("large_statistic_category", None),
                        company,
                        organization,
                    )
                )
                medium_statistic_category = (
                    self._get_statistic_category_instance(
                        item.pop("medium_statistic_category", None),
                        company,
                        organization,
                    )
                )
                small_statistic_category = (
                    self._get_statistic_category_instance(
                        item.pop("small_statistic_category", None),
                        company,
                        organization,
                    )
                )
                color = item.get("color", None)
                skills = item.pop("skills", [])

                if organization_statistic_category:

                    # Update statistic category to task/event
                    categories = Category.objects.filter(
                        Q(company=company)
                        & Q(
                            Q(task__organization=organization)
                            | Q(schedule__organization=calendar_org)
                        )
                    ).all()

                    l_stat_cate = (
                        organization_statistic_category.large_statistic_category
                    )
                    m_stat_cate = (
                        organization_statistic_category.medium_statistic_category
                    )
                    s_stat_cate = (
                        organization_statistic_category.small_statistic_category
                    )

                    # Case selected large/medium/small statistic category
                    if l_stat_cate and m_stat_cate and s_stat_cate:
                        categories.filter(
                            large_statistic_category=l_stat_cate,
                            medium_statistic_category=m_stat_cate,
                            small_statistic_category=s_stat_cate,
                        ).update(
                            large_statistic_category=large_statistic_category,
                            medium_statistic_category=medium_statistic_category,
                            small_statistic_category=small_statistic_category,
                        )

                    # Case selected large/medium statistic category
                    if l_stat_cate and m_stat_cate:
                        categories.filter(
                            large_statistic_category=l_stat_cate,
                            medium_statistic_category=m_stat_cate,
                            small_statistic_category=None,
                        ).update(
                            large_statistic_category=large_statistic_category,
                            medium_statistic_category=medium_statistic_category,
                        )

                    # Case selected large statistic category
                    categories.filter(
                        large_statistic_category=l_stat_cate,
                        medium_statistic_category=None,
                        small_statistic_category=None,
                    ).update(
                        large_statistic_category=large_statistic_category,
                    )

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
                first_records = records.first()
                ids = records.exclude(
                    id=first_records.id if first_records else None
                ).values_list("id", flat=True)
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

        # Handle deletion of organization statistic categories and their associated data
        if ids_to_delete:
            # Get all organization statistic categories that need to be deleted
            org_sta_cates = OrganizationsStatisticCategories.objects.filter(
                id__in=ids_to_delete
            )

            # Check if deleting these categories would remove all large or medium categories
            # This is important because it affects how we handle the deletion of associated categories
            (
                delete_all_large,
                delete_all_medium,
            ) = self.check_statistic_category_deletion_impact(
                company, org_sta_cates
            )

            # Process each organization statistic category for deletion
            for item in org_sta_cates:
                org = item.organization
                # Get the statistic category values, defaulting to None if not set
                large_stat = item.large_statistic_category or None
                medium_stat = item.medium_statistic_category or None
                small_stat = item.small_statistic_category or None

                # Skip if no statistic categories are set
                if not large_stat and not medium_stat and not small_stat:
                    continue

                # Get all categories in the company that are associated with either:
                # 1. Tasks in the current organization
                # 2. Schedules in the calendar organization
                categories = Category.objects.filter(
                    Q(company=company)
                    & Q(
                        Q(task__organization=org)
                        | Q(schedule__organization=calendar_org)
                    )
                ).all()

                # Delete categories that exactly match the large/medium/small statistic categories
                # This handles the case where all three levels are specified
                categories.filter(
                    large_statistic_category=large_stat,
                    medium_statistic_category=medium_stat,
                    small_statistic_category=small_stat,
                ).delete()

                # Special handling for when deleting all large categories
                # This also implies deleting all medium categories
                if delete_all_large and large_stat:
                    delete_all_medium = True
                    # Delete categories that only have the large category set
                    categories.filter(
                        large_statistic_category=large_stat,
                        medium_statistic_category=None,
                        small_statistic_category=None,
                    ).delete()

                # Special handling for when deleting all medium categories
                # This only applies when both large and medium categories are specified
                if delete_all_medium and large_stat and medium_stat:
                    # Delete categories that have both large and medium categories set
                    categories.filter(
                        large_statistic_category=large_stat,
                        medium_statistic_category=medium_stat,
                        small_statistic_category=None,
                    ).delete()

            # Finally, delete the organization statistic categories themselves
            org_sta_cates.delete()

        return self.response_created()

    def _get_statistic_category_instance(self, obj, company, org):
        """Get instance"""
        large_statistic_category = None

        if obj:
            try:
                (
                    large_statistic_category,
                    created,
                ) = StatisticCategory.objects.get_or_create(
                    company=company,
                    name=obj.get("name"),
                    uuid=obj.get("uuid"),
                )
            except Exception:
                # Handle case UUID duplicate - try to create with new UUID
                created = True
                large_statistic_category = StatisticCategory.objects.create(
                    company=company,
                    name=obj.get("name"),
                )

            if created:
                large_statistic_category.team = org
                large_statistic_category.save(update_fields=["team"])

        return large_statistic_category

    def check_statistic_category_deletion_impact(
        self, company, organizations_statistic_categories
    ):
        """
        Determines if deleting the specified statistic categories would result in removing all large or medium
        categories for any organization.
        """
        # Get all other statistic categories in the company that are not being deleted
        org_sta_cates = OrganizationsStatisticCategories.objects.filter(
            company=company
        ).exclude(
            id__in=[item.id for item in organizations_statistic_categories]
        )

        delete_all_large = False
        delete_all_medium = False

        # Check each category being deleted to see if it's the last one of its kind
        for item in organizations_statistic_categories:
            org = item.organization
            large_stat = item.large_statistic_category
            medium_stat = item.medium_statistic_category

            # Check if there are any other large categories for this organization
            has_other_large = org_sta_cates.filter(
                organization=org, large_statistic_category=large_stat
            ).exists()

            # If no other large categories exist, this deletion would remove all large categories
            # which also means it would remove all medium categories
            if not has_other_large:
                delete_all_large = True
                delete_all_medium = True
                break

            # If we haven't found a case of deleting all medium categories yet,
            # check if this would be the last medium category for this large category
            if not delete_all_medium:
                has_other_medium = org_sta_cates.filter(
                    organization=org,
                    large_statistic_category=large_stat,
                    medium_statistic_category=medium_stat,
                ).exists()
                if not has_other_medium:
                    delete_all_medium = True

        return delete_all_large, delete_all_medium


@extend_schema(tags=["System > Team"])
class TeamViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint for Organization
    """

    queryset = (
        Organization.objects.annotate(user_count=Count("users"))
        .order_by("-created_at")
        .all()
    )
    serializer_class = OrganizationForUserSerializer
    permission_classes = [ActionPermission]
    filter_backends = [FilterByPermission]
    screen_name = None

    def get_permissions(self):
        """Filter data by current screen"""
        screen_name = self.request.query_params.get(
            "screen_name", Screens.TEAMDOCK.value
        )
        if screen_name and to_camel_case(screen_name) in [
            to_camel_case(item.value) for item in Screens
        ]:
            self.screen_name = to_snake_case(screen_name)
        return super().get_permissions()

    def get_queryset(self):
        """
        Filtering users by company.
        """

        user = self.request.user
        return super().get_queryset().filter(company_id=user.company_id)

    def get_serializer_context(self):
        """
        Add request to context
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @extend_schema(
        parameters=[
            OpenApiParameter("screen_name", type=str, required=False),
            OpenApiParameter("is_with_users", type=bool, required=False),
        ],
    )
    def list(self, request, *args, **kwargs):
        """
        Return list of team
        """
        is_with_users = request.query_params.get("is_with_users", False)
        queryset = self.filter_queryset(self.get_queryset())

        if is_with_users:
            data = OrganizationMemberSerializer(queryset, many=True).data
        else:
            data = self.get_serializer(queryset, many=True).data
        return self.response_ok(data)
