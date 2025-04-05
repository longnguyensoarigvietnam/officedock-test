from organizations.models import Organization


def get_high_level_organizations(orgs):
    """
    Retrieve high-level organization based on hierarchy structure.
    """

    # List to store IDs of high-level organization
    high_level_ids = []

    # List to store the final sorted Organization objects
    org_sorted = []

    # List to track already processed IDs to avoid duplicates
    existed_ids = []

    # Identify child IDs from the hierarchy (orgs that are children of another org)
    child_ids = [id for id, superior_id in orgs if superior_id is not None]

    # Identify high-level org IDs (orgs without parents or whose parent is not in child IDs)
    for id, superior_id in orgs:
        if superior_id is None:  # org with no parent (top-level org)
            high_level_ids.append(id)
        elif superior_id not in child_ids:  # Parent ID not found in child IDs
            high_level_ids.append(superior_id)

    # Fetch Organization objects for the high-level org IDs in one query
    org_map = {
        org.id: org
        for org in Organization.objects.filter(id__in=high_level_ids)
    }

    # Sort Organization objects based on the order of IDs in high_level_ids
    for id in high_level_ids:
        if id not in existed_ids:  # Ensure no duplicates in the sorted list
            org_sorted.append(org_map.get(id))
            existed_ids.append(id)

    # Return the sorted list of high-level Organization objects
    return org_sorted
