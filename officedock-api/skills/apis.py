from collections import defaultdict

from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.status import HTTP_204_NO_CONTENT, HTTP_404_NOT_FOUND

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES, KEYWORDS
from base.permissions import ActionPermission
from organizations.models import (
    Organization,
    UsersOrganizations,
    OrganizationsSkills,
)
from organizations.serializers import (
    BaseOrganizationSerializer,
    StatisticCategorySerializer,
)
from skills.constants import SkillLevel
from skills.models import StatisticCategory, SkillMap, Skill
from skills.serializers import (
    SkillMapSerializer,
    ListSkillMapSerializer,
    SkillMapWithSkillSerializer,
    ListCreateSkillMapSerializer,
    SkillSerializer,
)
from skills.filters import StatisticCategoryFilter, SkillMapFilter, SkillFilter
from submit_levels.models import SubmitLevelHistory
from users.models import User
from users.serializers import BaseUserSerializer, RoleSerializer
from roles.constants import Actions, Screens
from base.filters import FilterByPermission
from roles.utils import has_permission
from tasks.models import TaskDuration


@extend_schema(tags=["System > Statistic Category"])
class StatisticCategoryViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Statistic Category
    """

    queryset = StatisticCategory.objects.all()
    serializer_class = StatisticCategorySerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        DjangoFilterBackend,
    ]
    filterset_class = StatisticCategoryFilter
    screen_name = Screens.CATEGORY.value
    lookup_field = "uuid"

    def get_queryset(self):
        """
        Filtering skill by company
        """
        company = self.request.user.company
        queryset = super().get_queryset().filter(company=company)

        if self.action == "list":
            return queryset.filter(team__isnull=True).order_by("-id")

        return queryset.order_by("id")

    def get_serializer_context(self):
        """
        Extend the default serializer context.
        """
        context = super().get_serializer_context()
        context["user"] = self.request.user
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Handle create statistic category"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        uuid = serializer_data.get("uuid", None)
        company = self.request.user.company

        # Check if a category with the same uuid already exists for the company
        if uuid and (
            existing_category := StatisticCategory.objects.filter(
                uuid=uuid, company=company
            ).first()
        ):
            # Update the existing category (you can also update other fields if needed)
            existing_category.name = serializer_data.get(
                "name", existing_category.name
            )
            existing_category.save()
        else:
            # Create a new category if none exists
            existing_category = serializer.save(company=company)

        return self.response_created(
            self.get_serializer(existing_category).data
        )

    @action(
        methods=["POST"],
        detail=False,
        url_path="validation-data",
        serializer_class=StatisticCategorySerializer,
    )
    def validation_data(self, request):
        """
        Validation data before create category in hierarchy
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.response_ok()

    @transaction.atomic
    def perform_destroy(self, instance):
        """Handle destroy statistic category"""
        has_actual_durations = TaskDuration.objects.filter(
            Q(task__categories__large_statistic_category=instance)
            | Q(task__categories__medium_statistic_category=instance)
            | Q(task__categories__small_statistic_category=instance)
            | Q(schedule__categories__large_statistic_category=instance)
            | Q(schedule__categories__medium_statistic_category=instance)
            | Q(schedule__categories__small_statistic_category=instance)
        ).exists()
        if has_actual_durations:
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES[
                        "cannot_delete_category_has_actual_duration"
                    ]
                }
            )

        instance.delete()


@extend_schema(tags=["System > Skill Map"])
class SkillMapViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for Statistic Category
    """

    queryset = SkillMap.objects.all()
    serializer_class = SkillMapSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
    ]
    filterset_class = SkillMapFilter
    screen_name = Screens.SKILL_MAP.value

    def get_queryset(self):
        """
        Filtering skill by company
        """
        company = self.request.user.company
        return super().get_queryset().filter(company=company)

    def get_serializer(self, *args, **kwargs):
        """
        Handle get serializer
        """
        if self.action == "list":
            return ListSkillMapSerializer(*args, **kwargs)
        if self.action == "create":
            return ListCreateSkillMapSerializer(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Handle create, update and delete list skill map"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        skill_maps = validated_data.get("skill_maps", None)
        organization = validated_data.get("organization", None)
        staff = validated_data.get("staff", None)

        for data in skill_maps:
            skill = data.get("skill", None)
            skill_map = data.pop("skill_map", None)
            index = data.pop("index", None)

            # Check exist skill in organization or not
            if (
                skill is not None
                and not OrganizationsSkills.objects.filter(
                    organization=organization, skill=skill
                ).exists()
            ):
                raise NotFound(
                    {
                        "detail": ERROR_MESSAGES[
                            "skill_not_exists_in_organization"
                        ].format(names=skill.name)
                    }
                )

            # Check if change skill has submitted level
            if (
                skill_map
                and (skill_map.skill != skill or skill is None)
                and skill_map.level != SkillLevel.LEVEL_0.value
                and SubmitLevelHistory.objects.filter(
                    organization=organization,
                    staff=staff,
                    skill=skill_map.skill,
                ).exists()
                and OrganizationsSkills.objects.filter(
                    organization=organization,
                    skill=skill_map.skill,
                )
            ):
                raise ValidationError(
                    {
                        "detail": ERROR_MESSAGES["cannot_updated"],
                    }
                )

            if skill is None and skill_map:
                skill_map.delete()
            elif skill:
                if skill_map:
                    skill_map.skill = skill
                    skill_map.index = index
                    skill_map.save()
                else:
                    SkillMap.objects.create(
                        organization=organization,
                        staff=staff,
                        skill=skill,
                        index=index,
                    )

        return self.response_ok()

    def list(self, request, *args, **kwargs):
        """
        Handle get list skill map
        """
        queryset = (
            self.filter_queryset(self.get_queryset())
            .select_related("organization", "staff__profile")
            .order_by("id")
        )
        grouped_data = defaultdict(list)

        # Map action with screen permission
        actions = {
            Actions.UPDATE.value: f"{Screens.SKILL_MAP.value}_{Actions.UPDATE.value}",
            Actions.DELETE.value: f"{Screens.SKILL_MAP.value}_{Actions.DELETE.value}",
        }

        # Grouping skill maps by organization and staff
        for skill_map in queryset:
            key = (skill_map.organization, skill_map.staff)
            grouped_data[key].append(skill_map)

        # Create a structured response as requested
        response_data = []
        for (organization, staff), skill_maps in grouped_data.items():
            serialized_staff = BaseUserSerializer(staff).data["profile"]
            serialized_staff["id"] = staff.id  # Get id of staff
            serialized_staff["roles"] = RoleSerializer(
                staff.roles, many=True
            ).data
            permissions = (
                has_permission(actions, request.user, [organization.id])
                if organization
                else {"update": False, "delete": True}
            )
            response_data.append(
                {
                    "id": skill_maps[0].id,
                    "organization": BaseOrganizationSerializer(
                        organization
                    ).data,
                    "staff": serialized_staff,
                    "skill_maps": SkillMapWithSkillSerializer(
                        skill_maps,
                        many=True,
                        context={"organization": organization},
                    ).data,
                    # Allow to submit when staff is logged user
                    "is_can_submit": self.request.user == staff,
                    "actions": permissions,
                }
            )
        # Apply pagination to the grouped response data
        page = self.paginate_queryset(response_data)
        if page is not None:
            return self.get_paginated_response(page)

        return self.response_ok(response_data)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int),
            OpenApiParameter("staff_id", type=int),
        ]
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="detail",
        serializer_class=SkillMapWithSkillSerializer,
    )
    @transaction.atomic
    def get_skill_maps_by_organization_and_staff(self, request, pk=None):
        """
        Handle create hierarchical category statistics to each organization
        """
        user = self.request.user
        organization_id = request.query_params.get("organization_id", None)
        staff_id = request.query_params.get("staff_id", None)
        data = {}
        organization = Organization.objects.filter(id=organization_id).first()
        staff = User.objects.filter(id=staff_id).first()

        if (
            not organization
            or not staff
            or not UsersOrganizations.objects.filter(
                organization=organization, user=staff
            ).exists()
        ):
            return self.response(status_code=HTTP_404_NOT_FOUND)

        skill_maps = SkillMap.objects.filter(
            organization_id=organization_id, staff_id=staff_id
        ).all()

        data["organization"] = BaseOrganizationSerializer(organization).data
        data["staff"] = BaseUserSerializer(staff).data["profile"]
        data["staff"]["id"] = staff.id  # Get id of staff
        data["staff"]["roles"] = RoleSerializer(staff.roles, many=True).data
        data["skill_maps"] = SkillMapWithSkillSerializer(
            skill_maps, many=True, context={"organization": organization}
        ).data
        # Allow to submit when staff is logged user
        data["is_can_submit"] = user == staff

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int),
            OpenApiParameter("staff_id", type=int),
        ]
    )
    @action(
        methods=["DELETE"],
        detail=False,
        url_path="destroy",
        serializer_class=None,
    )
    @transaction.atomic
    def destroy_skill_maps(self, request, pk=None):
        """
        Handle destroy skill maps
        """
        organization_id = request.query_params.get("organization_id", None)
        staff_id = request.query_params.get("staff_id", None)
        if organization_id and staff_id:
            skill_maps = SkillMap.objects.filter(
                organization_id=organization_id, staff_id=staff_id
            )
        if organization_id is None and staff_id:
            skill_maps = SkillMap.objects.filter(
                organization__isnull=True, staff_id=staff_id
            )
        skills = skill_maps.values("skill")
        check_is_having_submit = SubmitLevelHistory.objects.filter(
            organization__id=organization_id,
            staff__id=staff_id,
            skill__in=skills,
        ).exists()

        if check_is_having_submit:
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["cannot_delete_type"].format(
                        type=KEYWORDS["skill_map"]
                    ),
                }
            )
        else:
            skill_maps.delete()

        return self.response(status_code=HTTP_204_NO_CONTENT)


@extend_schema(tags=["System > Skill"])
class SkillViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Skill
    """

    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
    ]
    filterset_class = SkillFilter
    screen_name = Screens.SKILL.value

    def get_queryset(self):
        """
        Filtering skill by company
        """
        company = self.request.user.company
        return super().get_queryset().filter(company=company).order_by("id")

    def get_serializer_context(self):
        """
        Extend the default serializer context.
        """
        context = super().get_serializer_context()
        context["user"] = self.request.user
        return context

    @transaction.atomic
    def perform_create(self, serializer):
        """Handle create skill"""
        company = self.request.user.company
        serializer.save(company=company)

    @transaction.atomic
    def perform_destroy(self, instance):
        """Handle destroy skill"""
        check_exists = (
            instance.organizations_skills.exists()
            or instance.skill_maps.exists()
            or instance.submit_level_histories.exists()
        )

        if check_exists:
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["cannot_delete_type"].format(
                        type=KEYWORDS["skill"]
                    )
                }
            )

        instance.delete()
