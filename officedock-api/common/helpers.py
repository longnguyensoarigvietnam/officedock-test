from django.db.models import (
    F,
    Q,
    Case,
    IntegerField,
    Prefetch,
    Value,
    When,
    Exists,
    OuterRef,
)
from django.utils.timezone import now
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
from common.utils import (
    filter_include_deleted_skill,
    filter_include_deleted_user,
    get_deleted_name,
    get_organization_name,
    get_user_name,
    transform_statistic_categories,
)
from companies.constants import CompanyStatus
from companies.serializers import CompanySerializer
from mvp_votes.constants import MVPVoteTypes
from mvp_votes.models import MVPVoteManagement
from organizations.models import Organization, UsersOrganizations
from organizations.serializers import (
    BaseStatisticCategorySerializer,
    OrganizationStatisticCategoriesSerializer,
)
from plans.constants import CUSTOM_PLAN
from plans.models import Plan
from roles.constants import Actions, Screens, SelectionResultOptions
from shop_items.models import ShopItems
from shop_items.serializers import ShopItemSerializer
from skills.models import Skill, StatisticCategory
from stat_data.constants import ALL_TEAM
from surveys.models import Survey
from tags.serializers import BaseTagSerializer
from tasks.constants import TaskCategoryTypes
from tasks.models import PeopleInChargeTasks, TaskStatus
from users.models import Role, RoleDetail, User
from users.serializers import (
    RoleSerializer,
    SettingSerializer,
    UserBalanceSerializer,
)


def get_company(company):
    """Get company data"""
    data = CompanySerializer(company).data
    data["is_payment_failed"] = company.status in [
        CompanyStatus.RETRY_PAYMENT.value,
        CompanyStatus.SUSPENDED.value,
    ]
    return data


def get_all_organizations(company, organizations):
    """
    Get list organization without calendar organization
    """
    if organizations:
        return organizations.filter(deleted_at__isnull=True)
    return company.organizations.filter(deleted_at__isnull=True).order_by(
        "created_at"
    )


def get_roles(company):
    """
    Get list roles by company
    """
    roles = (
        Role.objects.filter(
            (Q(system_role=True) | Q(company_id=company.id))
            & Q(deleted_at__isnull=True)
        )
        .order_by("id")
        .all()
    )

    return RoleSerializer(roles, many=True).data


def get_members(company, organization=None, request=None):
    """
    Get list users of company
    """
    if organization:
        users = (
            organization.users.filter(filter_include_deleted_user(request))
            .select_related("profile")
            .order_by("created_at")
        )
    else:
        users = (
            company.users.filter(filter_include_deleted_user(request))
            .select_related("profile")
            .order_by("created_at")
        )

    return CreationDataUserWithMainOrganizationSerializer(users, many=True).data


def get_tags(company, organization=None):
    """
    Get list tags by company and filter by organization
    """
    tags = company.tags.order_by("-created_at")
    if organization:
        tags = tags.filter(organizations=organization)

    return BaseTagSerializer(
        tags.filter(deleted_at__isnull=True), many=True
    ).data


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


def get_organization_skills(orgs, organization_id, request):
    """
    Get all organization skills
    """
    if organization_id:
        orgs = orgs.filter(id=organization_id)
    results = []

    orgs = orgs.prefetch_related(
        Prefetch(
            "skills",
            queryset=Skill.objects.filter(
                filter_include_deleted_skill(request)
            ).order_by("id"),
        ),
    )

    for org in orgs:
        skills = org.skills.all()

        results.append(
            {
                "organization": {
                    "id": org.id,
                    "name": org.name,
                },
                "skills": [
                    {
                        "id": skill.id,
                        "name": get_deleted_name(skill),
                        "deleted_at": skill.deleted_at,
                    }
                    for skill in skills
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

    # Common annotate for is_main
    is_main_annotate = Exists(
        UsersOrganizations.objects.filter(
            user=user,
            organization=OuterRef("pk"),
            is_main=True,
        )
    )

    # ----------------------
    # Case: ALLOWED
    # ----------------------
    if SelectionResultOptions.ALLOWED.value in selection_results:
        if screen_name in [Screens.SKILL_MAP_MANAGEMENT.value]:
            organizations = Organization.objects.filter(
                company_id=user.company_id, deleted_at__isnull=True
            ).order_by("-created_at")
        else:
            organizations = Organization.objects.filter(
                users=user, deleted_at__isnull=True
            ).all()

        if is_return_orgs:
            return organizations

        return CreationDataOrganizationWithMainSerializer(
            organizations.select_related("superior").annotate(
                is_main=is_main_annotate
            ),
            many=True,
            context={"user": user},
        ).data

    # ----------------------
    # Case: NOT ALLOWED / PARTIAL
    # ----------------------
    org_ids = list(
        Organization.objects.filter(users=user).values_list("id", flat=True)
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

    organizations = Organization.objects.filter(
        id__in=org_ids, deleted_at__isnull=True
    ).all()

    if is_return_orgs:
        return organizations

    return CreationDataOrganizationWithMainSerializer(
        organizations.select_related("superior").annotate(
            is_main=is_main_annotate
        ),
        many=True,
        context={"user": user},
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

    task_user_ids = list(
        PeopleInChargeTasks.objects.filter(
            task__organization=organization
        ).values_list("user_id", flat=True)
    )
    org_user_ids = list(organization.users.values_list("id", flat=True))
    all_user_ids = set(org_user_ids + task_user_ids)
    users = (
        User.objects.filter(id__in=all_user_ids)
        .select_related("profile")
        .annotate(
            assigned=Case(
                When(id__in=org_user_ids, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        .order_by(
            F("deleted_at").asc(nulls_first=True), "-assigned", "created_at"
        )
    )
    members = []
    for u in users:
        data = CreationDataUserSerializer(u).data
        data["full_name"] = (
            get_user_name(u, hasattr(u, "assigned") and u.assigned == 0),
        )
        members.append(data)

    # Attach members to each organization
    for org in organizations:
        org["members"] = members

    organizations_by_role = get_organizations_of_user_by_screen_role(
        user, Screens.TEAMDOCK.value, Actions.VIEW.value, is_return_orgs=True
    )
    # Insert option all team to pulldown choose organization for statistic to start of a list
    tags = (
        company.tags.filter(
            deleted_at__isnull=True,
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


def get_data_organization_my_statistic(user, company):
    """
    Get data for filter my statistic
    """

    task_org_ids = list(
        PeopleInChargeTasks.objects.filter(user=user)
        .values_list("task__organization_id", flat=True)
        .distinct()
    )
    user_org_ids = list(user.organizations.values_list("id", flat=True)) + [
        company.get_calendar_organization().id
    ]
    all_org_ids = set(user_org_ids + task_org_ids)

    organizations = (
        Organization.all_objects.filter(Q(id__in=all_org_ids))
        .annotate(
            assigned=Case(
                When(id__in=user_org_ids, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        .order_by(F("deleted_at").asc(nulls_first=True), "-assigned", "-type")
        .distinct()
    )

    orgs = []
    for org in organizations:
        data = CreationDataOrganizationWithStructCategorySerializer(
            org, context={"user": user}
        ).data
        data["name"] = get_organization_name(
            org, hasattr(org, "assigned") and org.assigned == 0
        )
        data["is_deleted"] = bool(org.deleted_at) or not (org.assigned)
        orgs.append(data)

    tags = (
        company.tags.filter(organizations__in=organizations)
        .order_by("-deleted_at")
        .distinct()
    )
    # Insert option all team to pulldown choose organization for statistic to start of a list
    orgs.insert(
        0,
        {
            "id": ALL_TEAM,
            "name": ALL_TEAM,
            "statistic_categories": [],
            "tags": BaseTagSerializer(tags, many=True).data,
        },
    )

    return orgs


def get_user_setting(user):
    if not hasattr(user, "setting"):
        user.set_setting()

    return SettingSerializer(user.setting).data


def get_filter_organization_categories(organizations):
    """
    Handle organization with categories for filter category in kanban
    """
    list_cats = []
    for organization in organizations:
        organization_categories = OrganizationStatisticCategoriesSerializer(
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
    return CreationDataOrganizationWithUserSerializer(
        organizations, many=True
    ).data


def get_items_of_user(user):
    """
    Get list item is equipped of given user
    """
    items = ShopItems.objects.filter(
        user_items__user=user, user_items__is_equipped=True
    )
    return ShopItemSerializer(items, many=True, context={"user": user}).data


def get_balances_of_user(user):
    """
    Get current balances of user
    """
    return UserBalanceSerializer(user.get_balances()).data


def get_unanswered_count(user):
    """
    Returns the count of surveys that need user attention:
    1. Open surveys that haven't been answered (excluding user's own surveys)
    2. Closed surveys that haven't been viewed (including user's own surveys)
    """
    current_user = user
    company_id = current_user.company_id

    # 1. Count open surveys that haven't been answered (excluding user's own surveys)
    open_surveys = Survey.objects.filter(
        company_id=company_id,
        end_at__gt=now(),  # Open surveys
    )
    other_open_surveys = open_surveys.exclude(
        created_by=current_user  # Exclude user's own surveys
    )

    # Get open surveys that the user has already answered
    answered_open_surveys = other_open_surveys.filter(
        answers__respondent=current_user
    ).distinct()

    # Calculate unanswered open surveys
    unanswered_open_count = (
        other_open_surveys.count() - answered_open_surveys.count()
    )

    # 2. Count closed surveys that haven't been viewed (including user's own surveys)
    closed_surveys = Survey.objects.filter(
        company_id=company_id,
        end_at__lte=now(),  # Closed surveys
    )

    # Get closed surveys that the user has already viewed
    viewed_closed_surveys = closed_surveys.filter(
        viewed_records__user=current_user
    ).distinct()

    # Calculate unviewed closed surveys
    unviewed_closed_count = (
        closed_surveys.count() - viewed_closed_surveys.count()
    )

    # Total count
    total_count = unanswered_open_count + unviewed_closed_count

    return {"count": total_count, "is_open_surveys": open_surveys.count() > 0}


def get_is_have_mvp_vote(company):
    """
    Get present MVP vote by company
    """
    return MVPVoteManagement.objects.filter(
        type=MVPVoteTypes.PRESENT.value, company=company
    ).exists()


def get_organizations_for_all_team_statistic(user):
    """"""
    organizations = Organization.all_objects.filter(
        users=user, deleted_at__isnull=True
    ).all()
    return CreationDataOrganizationWithStructCategorySerializer(
        organizations, many=True, context={"user": user}
    ).data


def get_company_status():
    return CompanyStatus.values()


def get_plans():
    """
    Get all plan in system
    """
    plans = list(
        Plan.objects.filter(is_custom_plan=False).values_list("name", flat=True)
    )
    plans.append(CUSTOM_PLAN)
    return plans
