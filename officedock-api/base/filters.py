from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from common.utils import to_camel_case
from roles.constants import Actions, SelectionResultOptions, Screens
from submit_levels.models import SubmitLevelHistory
from tasks.models import TaskDuration
from users.models import RoleDetail, User
from skills.models import Skill, SkillMap, StatisticCategory
from organizations.models import Organization


class FilterByPermission(DjangoFilterBackend):
    """
    Custom filter backend to filter querysets based on user permissions.
    """

    def filter_queryset(self, request, queryset, view):
        screen_name = getattr(view, "screen_name", None)
        current_screen = request.query_params.get("current_screen")

        if not screen_name:
            return queryset

        # Allow `GET` requests if fetching data for a screen different from the current screen
        if (
            current_screen
            and request.method == "GET"
            and to_camel_case(current_screen) != to_camel_case(screen_name)
        ):
            return queryset

        # Map HTTP methods to actions
        method_action = {
            "GET": Actions.VIEW.value,
            "POST": Actions.ADD.value,
            "PATCH": Actions.UPDATE.value,
            "PUT": Actions.UPDATE.value,
            "DELETE": Actions.DELETE.value,
        }

        action = method_action.get(request.method)
        if not action:
            return queryset

        permission_name = f"{screen_name}_{action}"

        # Retrieve the role permission
        role_permissions = RoleDetail.objects.filter(
            role__users=request.user, permission__name=permission_name
        ).all()

        if not role_permissions:
            return queryset.none()

        org_ids = list(request.user.organizations.values_list("id", flat=True))
        if screen_name != Screens.ORGANIZATION_HIERARCHY.value:
            # Handle get hierarchy
            def _get_children(instance):
                children = instance.organizations.all()
                for child in children:
                    org_ids.append(child.id)
                    _get_children(child)

            _get_children(request.user)
            org_ids = set(org_ids)

        selection_results = [item.selection_result for item in role_permissions]
        if SelectionResultOptions.ALLOWED.value in selection_results:
            return queryset
        elif (
            SelectionResultOptions.ONLY_DATA_ORGANIZATION.value
            in selection_results
        ):
            # Filter queryset by organization
            if queryset.model in [User, StatisticCategory, Skill]:
                return queryset.filter(organizations__in=org_ids)
            elif queryset.model in [
                SkillMap,
                SubmitLevelHistory,
            ]:
                return queryset.filter(organization__in=org_ids)
            elif queryset.model in [Organization]:
                return queryset.filter(id__in=org_ids)
            elif queryset.model in [TaskDuration]:
                return queryset.filter(
                    Q(task__organization__in=org_ids)
                    | Q(schedule__organization__in=org_ids)
                )
        elif SelectionResultOptions.ONLY_DATA_OWN.value in selection_results:
            # Filter queryset by own data
            if queryset.model is User:
                return queryset.filter(id=request.user.id)
            elif queryset.model in [SkillMap, SubmitLevelHistory]:
                return queryset.filter(staff=request.user.id)
        elif (
            SelectionResultOptions.ALLOWED_WITHOUT_OWN_DATA.value
            in selection_results
        ):
            # Filter queryset by exclude own data
            if queryset.model is SubmitLevelHistory:
                return queryset.exclude(staff__id=request.user.id)
        elif (
            SelectionResultOptions.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA.value
            in selection_results
        ):
            # Filter queryset by exclude own data
            if queryset.model is SubmitLevelHistory:
                return queryset.filter(organization__in=org_ids).exclude(
                    staff__id=request.user.id
                )
        else:
            return queryset if current_screen else queryset.none()

        return queryset
