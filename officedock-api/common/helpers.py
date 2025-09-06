from django.db.models import Q
from calendars.serializers import EventLocationSerializer
from common.serializers import (
    CreationDataOrganizationSerializer,
    CreationDataOrganizationWithMainSerializer,
    CreationDataOrganizationWithStructCategorySerializer,
    CreationDataOrganizationWithUserSerializer,
    CreationDataTagSerializer,
    CreationDataTaskStatusSerializer,
    CreationDataUserSerializer,
    CreationDataUserWithMainOrganizationSerializer,
)
from common.utils import transform_statistic_categories
from organizations.models import Organization
from organizations.serializers import (
    BaseStatisticCategorySerializer,
    OrganizationDetailSerializer,
)
from roles.constants import Actions, Screens, SelectionResultOptions
from skills.models import Skill, StatisticCategory
from stat_data.constants import ALL_TEAM
from tags.serializers import BaseTagSerializer
from tasks.constants import TaskCategoryTypes
from tasks.models import TaskStatus
from users.models import Role, RoleDetail
from users.serializers import RoleSerializer, SettingSerializer


def get_all_organizations(company, organizations):
    """
    Get list organization without calendar organization
    """
    if organizations:
        return organizations
    org_ids = company.organizations.order_by("created_at")
    return Organization.objects.filter(id__in=org_ids)  # TODO: prefetch DB here


def get_roles(company):
    """
    Get list roles by company
    """
    roles = (
        Role.objects.filter(Q(system_role=True) | Q(company_id=company.id))
        .order_by("id")
        .all()
    )

    return RoleSerializer(roles, many=True).data


def get_members(company, organization=None):
    """
    Get list users of company
    """
    if organization:
        users = organization.users.order_by("created_at")
    else:
        users = company.users.order_by("created_at")

    return CreationDataUserWithMainOrganizationSerializer(users, many=True).data


def get_tags(company, organization=None):
    """
    Get list tags by company and filter by organization
    """
    tags = company.tags.order_by("-created_at")
    if organization:
        tags = tags.filter(organizations=organization)

    return BaseTagSerializer(tags.filter(is_hidden=False), many=True).data


def get_task_status():
    """
    Get list task status
    """
    status = TaskStatus.objects.order_by("created_at").all()
    return CreationDataTaskStatusSerializer(status, many=True).data


def get_event_locations(company):
    """
    Get list locations of event
    """
    event_locations = company.event_locations.order_by("created_at").all()
    return EventLocationSerializer(event_locations, many=True).data


def get_organization_skills(orgs, organization_id):
    """
    Get all organization skills
    """
    if organization_id:
        orgs = orgs.filter(id=organization_id)
    results = []
    for org in orgs:
        skills = Skill.objects.filter(organization_id=org.id).order_by("id")

        results.append(
            {
                "organization": {
                    "id": org.id,
                    "name": org.name,
                },
                "skills": [
                    {"id": skill.id, "name": skill.name} for skill in skills
                ],
            }
        )

    return results


def get_statistic_categories(company):
    """
    Get all statistic categories
    """
    statistic_categories = StatisticCategory.objects.filter(
        company_id=company.id
    ).order_by("created_at")

    return BaseStatisticCategorySerializer(statistic_categories, many=True).data


def get_organizations_of_user_by_screen_role(
    user, screen_name, action, is_return_orgs=False
):
    """
    Handle check current screen role of user and response organizations matching
    """
    permission_name = f"{screen_name}_{action}"

    # Retrieve the role permission
    role_permissions = RoleDetail.objects.filter(
        role__users=user, permission__name=permission_name
    ).all()
    if not role_permissions:
        return None
    selection_results = [item.selection_result for item in role_permissions]
    if SelectionResultOptions.ALLOWED.value in selection_results:
        organizations = Organization.objects.filter(users=user).all()
        if is_return_orgs:
            return organizations
        return CreationDataOrganizationWithMainSerializer(
            organizations, many=True, context={"user": user}
        ).data
    org_ids = list(
        Organization.all_objects.filter(users=user).values_list("id", flat=True)
    )
    if screen_name != Screens.ORGANIZATION_HIERARCHY.value:
        # Handle get hierarchy
        def _get_children(instance):
            children = instance.organizations.all()
            for child in children:
                org_ids.append(child.id)
                _get_children(child)

        _get_children(user)
        org_ids = set(org_ids)
    organizations = Organization.all_objects.filter(id__in=org_ids).all()
    if is_return_orgs:
        return organizations
    return CreationDataOrganizationWithMainSerializer(
        organizations, many=True, context={"user": user}
    ).data


def get_organization_with_categories(organizations, organization, user):
    """
    Get list organization with categories
    """
    if organization:
        organizations = [organization]
    return CreationDataOrganizationWithStructCategorySerializer(
        organizations, many=True, context={"user": user}
    ).data


def get_data_organization_team_statistic(user, company, organization):
    """
    Get data for filter team statistic
    """
    if not organization:
        return None
    calendar_org = company.get_calendar_organization()
    organizations = CreationDataOrganizationWithStructCategorySerializer(
        [organization, calendar_org], many=True, context={"user": user}
    ).data
    members = CreationDataUserSerializer(
        organization.users.order_by("created_at"), many=True
    ).data

    for org in organizations:
        org["members"] = members
    organizations_by_role = get_organizations_of_user_by_screen_role(
        user, Screens.TEAMDOCK.value, Actions.VIEW.value, is_return_orgs=True
    )
    # Insert option all team to pulldown choose organization for statistic to start of a list
    tags = (
        company.tags.filter(
            is_hidden=False,
            organizations__in=organizations_by_role,
        )
        .order_by("created_at")
        .all()
        .distinct()
    )
    organizations.insert(
        0,
        {
            "id": ALL_TEAM,
            "name": ALL_TEAM,
            "statistic_categories": [],
            "tags": CreationDataTagSerializer(
                tags, many=True, context={"user": user}
            ).data,
            "members": members,  # Get list user of current organization for all team
        },
    )
    return organizations


def get_data_organization_my_statistic(user, organizations, company):
    """
    Get data for filter my statistic
    """
    orgs = CreationDataOrganizationWithStructCategorySerializer(
        organizations, many=True, context={"user": user}
    ).data
    # Add calendar organization
    orgs.append(
        CreationDataOrganizationWithStructCategorySerializer(
            company.get_calendar_organization(), context={"user": user}
        ).data
    )
    tags = (
        company.tags.filter(is_hidden=False, organizations__in=organizations)
        .all()
        .distinct()
    )
    # Insert option all team to pulldown choose organization for statistic to start of a list
    orgs.insert(
        0,
        {
            "id": ALL_TEAM,
            "name": ALL_TEAM,
            "statistic_categories": [],
            "tags": CreationDataTagSerializer(
                tags, many=True, context={"user": user}
            ).data,
        },
    )

    return orgs


def get_user_setting(user):
    return SettingSerializer(user.setting).data


def get_filter_organization_categories(organizations):
    """
    Handle organization with categories for filter category in kanban
    """
    list_cats = []
    for organization in organizations:
        organization_categories = OrganizationDetailSerializer(
            organization
        ).data["statistic_categories"]
        categories = transform_statistic_categories(organization_categories)
        list_cats.append(
            {
                "organization": CreationDataOrganizationSerializer(
                    organization
                ).data,
                "categories": [
                    cat[TaskCategoryTypes.LARGE.value]
                    for cat in categories
                    if cat.get(TaskCategoryTypes.LARGE.value) is not None
                ],
            }
        )
    return list_cats


def get_organization_with_users(organizations):
    """
    Get list organization with users
    """
    list_org = []
    for organization in organizations:
        list_org.append(
            CreationDataOrganizationWithUserSerializer(organization).data
        )
    return list_org
