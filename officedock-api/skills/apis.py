from django.db import transaction
from django.db.models import Q, Case, When, Value, IntegerField
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES, KEYWORDS
from base.permissions import ActionPermission
from common.serializers import CreationDataUserWithMainOrganizationSerializer
from common.utils import split_id_from_string
from organizations.models import (
    OrganizationsStatisticCategories,
    OrganizationsStatisticCategoriesSkills,
    Organization,
    UsersOrganizations,
)
from organizations.serializers import (
    StatisticCategorySerializer,
)
from skills.constants import (
    SkillLevel as SkillLevelConstants,
    SkillStep,
)
from skills.models import (
    StatisticCategory,
    SkillMap,
    Skill,
    SkillLevel,
    SkillMapSkillLevel,
)
from skills.serializers import (
    SkillMapSerializer,
    ListCreateSkillMapSerializer,
    SkillSerializer,
    StepOfSkillSerializer,
    BaseOrganizationWithSkillSerializer,
    BaseOrganizationWithUserSkillMapSerializer,
    SkillReplaceSkilMapSerializer,
    GroupStepSkillMapSerializer,
    UpdateSkillMapSkillLevelSerializer,
)
from skills.filters import StatisticCategoryFilter
from skills.utils import get_lookback_time, get_next_progression
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory
from roles.constants import Screens, Actions, SelectionResultOptions
from base.filters import FilterByPermission
from submit_levels.serializers import SubmitLevelSerializer
from tasks.models import TaskDuration
from users.models import User, RoleDetail
from users.serializers import BaseUserSerializer


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


@extend_schema(tags=["System > Manage Skill Map"])
class ManageSkillMapViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
):
    """
    API endpoint for Statistic Category
    """

    queryset = SkillMap.objects.all()
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
    ]
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
        if self.action == "create":
            return ListCreateSkillMapSerializer(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Handle create, update and delete list skill map"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        items = validated_data.pop("items", None)

        for data in items:
            skill_map = data.get("skill_map", None)
            skill = data.get("skill", None)
            staff = data.get("staff", None)
            is_checked = data.get("is_checked", False)
            if skill_map is None and skill and staff:
                self._handle_create_skill_map(skill, staff, is_checked)
            elif skill_map:
                # Update skill map and child of skill map
                while skill_map:
                    SkillMap.objects.filter(id=skill_map.id).update(
                        is_valid=is_checked
                    )

                    skill_map = SkillMap.objects.filter(
                        skill_parent=skill_map.skill
                    ).first()

        return self.response_ok()

    def _handle_create_skill_map(self, skill, staff, is_checked):
        """
        Handle create skill map when have new staff added to organization
        """
        skill_map, created = SkillMap.objects.get_or_create(
            company=staff.company,
            skill=skill,
            step=skill.step,
            skill_parent=skill.parent,
            staff=staff,
            organization=skill.organization,
            is_valid=is_checked,
            is_complete=False,
        )
        if skill.parent is None and created:
            # Get skill level 1 of parent skill
            skill_level = skill.skill_levels.filter(
                level=SkillLevelConstants.LEVEL_1.value
            ).first()
            user_org = UsersOrganizations.objects.filter(
                user=staff,
                organization=skill.organization,
            ).first()
            # Set next_submit_at if skill level has look back
            next_submit_at, start_lookback_at = get_lookback_time(
                skill_level.look_back_type,
                skill_level.look_back_interval,
                user_organization=user_org,
            )
            data = []
            for item in skill_level.items:
                data.append({"item": item, "is_checked": False})
            SkillMapSkillLevel.objects.create(
                skill_level=skill_level,
                skill=skill,
                level=skill_level.level,
                skill_map=skill_map,
                company=staff.company,
                start_lookback_at=start_lookback_at,
                next_submit_at=next_submit_at,
                measure_count=skill_level.measure_count,
                measure_time=skill_level.measure_time,
                look_back_type=skill_level.look_back_type,
                look_back_interval=skill_level.look_back_interval,
                items=data,
            )

    @extend_schema(parameters=[OpenApiParameter("organization_id", type=int)])
    def list(self, request, *args, **kwargs):
        """
        Handle get list skill map
        """
        organization_id = request.query_params.get("organization_id", None)
        user = request.user
        # FIXME: Check role permissions for get list organizations
        organizations = Organization.objects.filter(
            company=user.company,
        ).order_by("-created_at")
        if organization_id:
            organizations = organizations.filter(id=organization_id).all()
        data = []
        for organization in organizations:
            data.append(
                BaseOrganizationWithUserSkillMapSerializer(organization).data
            )

        return self.response_ok(data)

    @action(detail=True, methods=["GET"], url_path="check_delete")
    def check_delete(self, request, *args, **kwargs):
        """
        Check skill map is have
        """
        skill_map = self.get_object()
        is_can_delete = skill_map.skill_map_skill_levels.filter(
            actual_measure_count__isnull=True,
            actual_measure_time__isnull=True,
            next_submit_at__isnull=True,
            level=SkillLevelConstants.LEVEL_1.value,
        ).exists()
        return self.response_ok({"is_can_delete": is_can_delete})


@extend_schema(tags=["System > Skill Map"])
class SkillMapViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
):
    """
    API endpoint for skill map
    """

    queryset = SkillMap.objects.filter(is_valid=True).all()
    serializer_class = SkillMapSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("user_id", type=int),
            OpenApiParameter("organization_id", type=int),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Handle data and response list of skill map by user
        """
        user_id = request.query_params.get("user_id", None)
        organization_id = request.query_params.get("organization_id", None)
        prev_user = None
        next_user = None
        user = get_object_or_404(User, id=user_id) if user_id else request.user
        organizations = user.organizations.all()
        if organization_id:
            # Get the single organization
            organization = get_object_or_404(Organization, id=organization_id)

            # Combine, putting the organization required one first
            organizations = user.organizations.annotate(
                priority=Case(
                    When(id=organization_id, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            ).order_by("priority")
            users = list(organization.users.all().order_by("created_at"))
            # Find the user's position in the list
            try:
                index = users.index(user)  # Get index of the requesting user
            except ValueError:
                raise NotFound(
                    {
                        "detail": ERROR_MESSAGES["staff_not_exists"].format(
                            id=user_id
                        )
                    }
                )
            # Get previous and next users safely
            prev_user = users[index - 1].id if index > 0 else None
            next_user = users[index + 1].id if index < len(users) - 1 else None
        data = {
            "user": CreationDataUserWithMainOrganizationSerializer(user).data,
            "prev_user": prev_user,
            "next_user": next_user,
            "organizations": [],
        }
        for organization in organizations:
            skill_maps = (
                self.get_queryset()
                .filter(
                    organization=organization,
                    staff=user,
                    skill_parent__isnull=True,
                )
                .all()
            )
            step = organization.steps.first()
            data_skill_maps = []
            for skill_map in skill_maps:
                group_skill_map = []
                skill = skill_map.skill
                # Loop and get child skill map
                while skill:
                    skill_map = SkillMap.objects.filter(
                        skill=skill, organization=organization, staff=user
                    ).first()
                    if skill_map:
                        group_skill_map.append(
                            SkillMapSerializer(skill_map).data
                        )
                    else:
                        group_skill_map.append(
                            SkillReplaceSkilMapSerializer(skill).data
                        )
                    skill = Skill.objects.filter(parent__id=skill.id).first()
                data_skill_maps.append(group_skill_map)
            data["organizations"].append(
                {
                    "id": organization.id,
                    "organization_name": organization.name,
                    "skill_maps": data_skill_maps,
                    "steps": {
                        "step_1": step.define_step_1 if step else None,
                        "step_2": step.define_step_2 if step else None,
                        "step_3": step.define_step_3 if step else None,
                    },
                }
            )

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int),
        ]
    )
    @action(methods=["GET"], detail=False, url_path="list-skills")
    def list_skills(self, request, *args, **kwargs):
        """
        Response all skill of user organization
        """
        user = request.user
        organization_id = request.query_params.get("organization_id", None)

        organizations = user.organizations.all().order_by("-created_at")
        if organization_id:
            organizations = organizations.filter(id=organization_id)
        data = []
        for organization in organizations:
            skills = Skill.objects.filter(
                organization=organization,
                parent__isnull=True,
            ).all()
            step = organization.steps.first()
            data_skills = []
            for skill in skills:
                group_skill = []
                # Loop and get child skill
                while skill:
                    group_skill.append(
                        SkillReplaceSkilMapSerializer(skill).data
                    )
                    skill = Skill.objects.filter(parent__id=skill.id).first()
                data_skills.append(group_skill)
            data.append(
                {
                    "id": organization.id,
                    "organization_name": organization.name,
                    "skill_maps": data_skills,
                    "steps": {
                        "step_1": step.define_step_1 if step else None,
                        "step_2": step.define_step_2 if step else None,
                        "step_3": step.define_step_3 if step else None,
                    },
                }
            )

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter("skill_id", type=int),
        ]
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="group-steps",
    )
    def get_group_steps(self, request, pk=None):
        """
        Handle get steps by organization
        """
        skill_id = request.query_params.get("skill_id")
        skill = get_object_or_404(Skill, id=skill_id)
        user = request.user
        # Get skill root (skill.parent is none)
        while skill.parent:
            skill = skill.parent

        data = []
        # Handle data from root to last child
        while skill:
            skill_map = SkillMap.objects.filter(
                skill=skill, staff=user, organization=skill.organization
            ).first()
            data.append(
                GroupStepSkillMapSerializer(
                    skill, context={"skill_map": skill_map}
                ).data
            )
            skill = Skill.objects.filter(parent__id=skill.id).first()

        return self.response_ok(data)

    @action(
        methods=["GET"],
        detail=True,
        url_path="comments",
    )
    def get_comments(self, request, pk=None):
        """
        Response comments of skill map
        """
        skill_map = self.get_object()
        submit_levels = SubmitLevelHistory.objects.filter(
            staff=skill_map.staff,
            skill=skill_map.skill,
            organization=skill_map.organization,
            status=SubmitLevelStatus.APPROVE.value,
        ).all()

        return self.response_ok(
            SubmitLevelSerializer(submit_levels, many=True).data
        )

    @action(
        methods=["GET"],
        detail=True,
        url_path="level-up",
    )
    def get_level_up(self, request, pk=None):
        """
        Response level up and approvers of skill map
        """
        skill_map = self.get_object()
        skill_map_skill_level = skill_map.skill_map_skill_levels.filter(
            is_complete=False
        ).first()
        data = {}
        if skill_map_skill_level:

            step_after_submit, level_after_submit = get_next_progression(
                skill_map.step,
                skill_map_skill_level.level,
                skill=skill_map.skill,
            )

            # Get draft submit level
            submit_level = SubmitLevelHistory.objects.filter(
                skill=skill_map.skill,
                step_before_submit=skill_map.step,
                level_before_submit=skill_map_skill_level.level,
                organization=skill_map.organization,
                staff=skill_map.staff,
                status__in=[
                    SubmitLevelStatus.DRAFT.value,
                    SubmitLevelStatus.APPLYING.value,
                ],
            ).first()
            # Get users have permission update skill map
            permission = Screens.SKILL_MAP.value + "_" + Actions.UPDATE.value
            selection_results = [SelectionResultOptions.ALLOWED.value]
            role_ids = RoleDetail.objects.filter(
                Q(permission__name=permission)
                & Q(selection_result__in=selection_results)
                & Q(Q(company=skill_map.company) | Q(role__system_role=True))
            ).values_list("role__id", flat=True)
            users = (
                User.objects.filter(
                    user_roles__role__id__in=role_ids, company=skill_map.company
                )
                .exclude(id=skill_map.staff.id)
                .all()
                .distinct()
            )
            data = {
                "organization": skill_map.organization.id,
                "skill": {
                    "id": skill_map.skill.id,
                    "name": skill_map.skill.name,
                },
                "skill_map_skill_level": skill_map_skill_level.id,
                "step_before_submit": skill_map.step,
                "level_before_submit": skill_map_skill_level.level,
                "step_after_submit": step_after_submit,
                "level_after_submit": level_after_submit,
                "items": skill_map_skill_level.items,
                "approver": BaseUserSerializer(submit_level.approver).data
                if submit_level
                else None,
                "approvers": BaseUserSerializer(users, many=True).data,
                "is_applying": submit_level.status
                == SubmitLevelStatus.APPLYING.value
                if submit_level
                else None,
                "submit_level": submit_level.id if submit_level else None,
            }

        return self.response_ok(data)

    @extend_schema(
        parameters=[
            OpenApiParameter("skill_map_level_id", type=int, required=True)
        ]
    )
    @action(
        methods=["POST"],
        detail=True,
        url_path="skill-map-level",
        serializer_class=UpdateSkillMapSkillLevelSerializer,
    )
    def update_skill_map_level(self, request, pk=None):
        """
        Handle update skill map skill level
        """
        skill_map_level_id = request.query_params.get(
            "skill_map_level_id", None
        )
        skill_map_level = get_object_or_404(
            SkillMapSkillLevel, id=skill_map_level_id
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        skill_map_level.popup = serializer.validated_data.get("popup", True)
        skill_map_level.save()

        return self.response_ok()


@extend_schema(tags=["System > Skill"])
class SkillViewSet(
    BaseAPIViewSet,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
):
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
    screen_name = Screens.SKILL.value

    def get_queryset(self):
        """
        Filtering skill by company
        """
        company = self.request.user.company
        return super().get_queryset().filter(company=company).order_by("id")

    def get_serializer_class(self, *args, **kwargs):
        """
        Get serializer
        """
        if self.action in ["create"]:
            return StepOfSkillSerializer

        return super().get_serializer_class()

    def get_serializer_context(self):
        """
        Extend the default serializer context.
        """
        context = super().get_serializer_context()
        context["user"] = self.request.user
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Handle create skill"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        step_1 = serializer_data.get("step_1", {})
        step_2 = serializer_data.get("step_2", {})
        step_3 = serializer_data.get("step_3", {})
        first_skill = None
        second_skill = None
        skills = []
        is_action_edit = False
        if step_1 and step_3 and step_2 is None:
            raise ValidationError({"detail": ERROR_MESSAGES["cannot_create"]})

        if step_1:
            levels = step_1.pop("skill_levels", None)
            skill = step_1.pop("skill", None)
            categories = step_1.pop("category_ids", None)
            is_action_edit = bool(skill)
            first_skill, _ = Skill.objects.update_or_create(
                id=skill.id if skill else None, defaults={**step_1}
            )
            skills.append(first_skill)
            self._create_or_update_skill_levels(levels, first_skill, categories)
        if step_2:
            levels = step_2.pop("skill_levels", None)
            skill = step_2.pop("skill", None)
            categories = step_2.pop("category_ids", None)
            is_action_edit = bool(skill)

            second_skill, _ = Skill.objects.update_or_create(
                id=skill.id if skill else None,
                parent=first_skill,
                defaults={**step_2},
            )
            skills.append(second_skill)
            self._create_or_update_skill_levels(
                levels, second_skill, categories
            )
        if step_3:
            levels = step_3.pop("skill_levels", None)
            skill = step_3.pop("skill", None)
            categories = step_3.pop("category_ids", None)
            is_action_edit = bool(skill)
            third_skill, _ = Skill.objects.update_or_create(
                id=skill.id if skill else None,
                parent=second_skill,
                defaults={**step_3},
            )
            skills.append(third_skill)
            self._create_or_update_skill_levels(levels, third_skill, categories)

        if is_action_edit:
            # Update skill map
            users = skills[0].organization.users.all()
            for user in users:
                for skill in skills:
                    self._update_skill_map(skill, user)
        else:
            # Create skill map
            users = skills[0].organization.users.all()
            for user in users:
                self._create_skill_map(skills[0], user)

        return self.response_ok()

    def _update_skill_map(self, skill, staff):
        """
        Handle update skill map when update skill
        """
        skill_map = SkillMap.objects.filter(
            company=staff.company,
            skill=skill,
            staff=staff,
            organization=skill.organization,
        ).first()
        if not skill_map:
            return
        skill_map_skill_levels = skill_map.skill_map_skill_levels.all()
        for skill_map_level in skill_map_skill_levels:
            # Check last status of submit level, if is reject skip update skill map skill level
            check_status_reject_exists = SubmitLevelHistory.objects.filter(
                skill=skill,
                staff=staff,
                organization=skill.organization,
                step_before_submit=skill_map.step,
                level_before_submit=skill_map_level.level,
                status=SubmitLevelStatus.REJECT.value,
            ).exists()
            # Get skill level
            skill_level = skill_map_level.skill_level
            # Transform items of skill map level to items of skill level
            skill_map_items_format = (
                [
                    item["item"] if isinstance(item, dict) else item
                    for item in skill_map_level.items
                ]
                if skill_map_level.items
                else None
            )
            # Get new skill level items if skill level items is different with skill map level items
            data = (
                [
                    {"item": item, "is_checked": False}
                    for item in skill_level.items
                ]
                if (skill_level.items != skill_map_items_format)
                else skill_map_level.items
            )

            if not check_status_reject_exists:
                # Set next_submit_at if skill level has look back
                next_submit_at, start_look_back_at = get_lookback_time(
                    skill_level.look_back_type,
                    skill_level.look_back_interval,
                    start_lookback_at=skill_map_level.start_lookback_at,
                )
                SkillMapSkillLevel.objects.filter(id=skill_map_level.id).update(
                    start_lookback_at=start_look_back_at,
                    next_submit_at=next_submit_at,
                    measure_count=skill_level.measure_count,
                    measure_time=skill_level.measure_time,
                    look_back_type=skill_level.look_back_type,
                    look_back_interval=skill_level.look_back_interval,
                    items=data,
                    popup=True,
                )
            else:
                SkillMapSkillLevel.objects.filter(id=skill_map_level.id).update(
                    items=data
                )

    def _create_skill_map(self, skill, staff):
        """
        Handle create skill map when create skill
        """
        skill_map, created = SkillMap.objects.get_or_create(
            company=staff.company,
            skill=skill,
            step=skill.step,
            skill_parent=skill.parent,
            staff=staff,
            organization=skill.organization,
            is_valid=True,
            is_complete=False,
        )
        if skill.parent is None and created:
            # Get skill level 1 of parent skill
            skill_level = skill.skill_levels.filter(
                level=SkillLevelConstants.LEVEL_1.value
            ).first()
            # Set next_submit_at if skill level has look back
            next_submit_at, start_look_back_at = get_lookback_time(
                skill_level.look_back_type,
                skill_level.look_back_interval,
            )
            data = []
            for item in skill_level.items:
                data.append({"item": item, "is_checked": False})
            SkillMapSkillLevel.objects.create(
                skill_level=skill_level,
                skill=skill,
                level=skill_level.level,
                skill_map=skill_map,
                company=staff.company,
                start_lookback_at=start_look_back_at,
                next_submit_at=next_submit_at,
                measure_count=skill_level.measure_count,
                measure_time=skill_level.measure_time,
                look_back_type=skill_level.look_back_type,
                look_back_interval=skill_level.look_back_interval,
                items=data,
            )

    def _create_or_update_skill_levels(self, levels, skill, categories):
        """
        Handle create or update skill levels
        """
        # Clear organizations_statistic_categories_skills
        skill.organizations_statistic_categories_skills.all().delete()
        if categories:
            for category in categories:
                if (
                    category["large_statistic_category"]
                    == category["medium_statistic_category"]
                    == category["small_statistic_category"]
                    is None
                ):
                    continue
                org_cat = OrganizationsStatisticCategories.objects.filter(
                    large_statistic_category=category[
                        "large_statistic_category"
                    ],
                    medium_statistic_category=category[
                        "medium_statistic_category"
                    ],
                    small_statistic_category=category[
                        "small_statistic_category"
                    ],
                    organization=skill.organization,
                ).first()
                if org_cat:
                    OrganizationsStatisticCategoriesSkills.objects.create(
                        skill=skill,
                        organization_statistic_category=org_cat,
                        organization=skill.organization,
                        company=skill.company,
                    )
        for level in levels:
            skill_level = level.pop("skill_level", None)
            SkillLevel.objects.update_or_create(
                id=skill_level.id if skill_level else None,
                skill=skill,
                company=skill.company,
                defaults={**level},
            )

    @transaction.atomic
    def perform_destroy(self, instance):
        """Handle destroy skill"""
        check_exists = (
            instance.skill_maps.exists()
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

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int),
            OpenApiParameter("filter_organization_ids", type=str),
            OpenApiParameter("filter_steps", type=str),
            OpenApiParameter("screen", type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Get list of skill
        """
        organization_id = request.query_params.get("organization_id", None)
        filter_organization_ids = request.query_params.get(
            "filter_organization_ids", None
        )
        filter_steps = request.query_params.get("filter_steps", None)
        screen = request.query_params.get("screen", None)

        user = request.user
        # FIXME: Check role permissions for get list organizations
        organizations = Organization.objects.filter(
            company=user.company,
        ).order_by("-created_at")
        if organization_id:
            organizations = organizations.filter(id=organization_id).all()
        data = []
        steps = []
        if not screen:
            # Filter step of skills per organization
            filter_organization_ids = split_id_from_string(
                filter_organization_ids
            )
            if filter_steps:
                for step in filter_steps.split(","):
                    try:
                        steps.append(step)
                    except ValueError:
                        continue
            # Response empty if filter array haven't same length
            if (
                steps
                and filter_organization_ids
                and len(steps) != len(filter_organization_ids)
            ):
                return self.response_ok(data)
        for organization in organizations:
            # Set default step is step 1
            step = SkillStep.STEP_1.value if screen is None else None
            # Handle filter by organization filter with step has same index
            if (
                filter_organization_ids
                and organization.id in filter_organization_ids
            ):
                index = filter_organization_ids.index(organization.id)
                step = steps[index]
            data.append(
                BaseOrganizationWithSkillSerializer(
                    organization, context={"step": step}
                ).data
            )
        return self.response_ok(data)

    @action(
        methods=["GET"],
        detail=True,
        url_path="group-steps",
    )
    def get_group_steps(self, request, pk=None):
        """
        Handle get steps by organization
        """
        skill = self.get_object()
        # Get skill root (skill.parent is none)
        while skill.parent:
            skill = skill.parent

        data = []
        # Handle data from root to last child
        while skill:
            data.append(SkillSerializer(skill).data)
            skill = Skill.objects.filter(parent__id=skill.id).first()

        return self.response_ok(data)
