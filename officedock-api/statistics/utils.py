from organizations.models import Organization
from tasks.models import Task


def get_all_organization_id(users: list):
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

    # Organizations of tasks where these users are people_in_charge (may include former teams)
    task_org_ids = list(
        Task.objects.filter(people_in_charge__in=users)
        .values_list("organization_id", flat=True)
        .distinct()
    )

    # Merge and ensure uniqueness by using a set
    organization_ids = set(user_org_ids + task_org_ids)

    return organization_ids
