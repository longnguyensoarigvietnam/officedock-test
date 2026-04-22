from django.db.models import F, Q
from organizations.models import Organization
from tasks.models import Task


def get_all_organization_id(users: list, exclude_team_unassigned=False):
    """
    Get all unique organization IDs that are associated with the given users.
    Includes:
      1. Organizations that users currently belong to.
      2. Organizations that users have tasks assigned to (historical or cross-team).
    """
    # Organizations the users directly belong to
    user_org_ids = list(
        Organization.all_objects.filter(users__in=users)
        .values_list("id", flat=True)
        .distinct()
    )

    if exclude_team_unassigned:
        return user_org_ids

    # Organizations of tasks where these users are people_in_charge (may include former teams)
    task_org_ids = list(
        Task.objects.filter(people_in_charge__in=users)
        .values_list("organization_id", flat=True)
        .distinct()
    )

    # Merge and ensure uniqueness by using a set
    organization_ids = set(user_org_ids + task_org_ids)

    return organization_ids


def handle_get_task_duration_of_teamdock(
    durations, users_in_org, main_organization
):
    # Exclude task durations where:
    # - The user is NOT assigned to the task’s organization, AND
    # - The task belongs to an organization other than the main organization
    # This removes durations of users outside the task organization
    # and excludes cross-organization data except for the main organization
    return durations.exclude(
        (
            ~Q(user__in=users_in_org)
            & ~Q(task__organization=main_organization)
            & Q(task_id__isnull=False)
        )
        | (
            ~Q(user__organizations=F("task__organization"))
            & ~Q(task__organization=main_organization)
            & Q(task_id__isnull=False)
        )
    )
