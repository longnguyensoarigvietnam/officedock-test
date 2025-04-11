from organizations.models import Organization


def get_high_level_organizations(orgs):
    """
    Retrieve high-level organization based on hierarchy structure.
    """

    # Identify child IDs from the hierarchy (orgs that are children of another org)
    child_ids = []
    superior_ids = []
    for id, superior_id in orgs:
        if superior_id is not None:
            child_ids.append(id)
            superior_ids.append(superior_id)

    # Identify high-level org IDs (orgs without parents or whose parent is not in child IDs)
    high_level_ids = []
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
    org_has_hierarchies = []
    org_not_hierarchies = []
    existed_ids = []
    for id in high_level_ids:
        if id not in existed_ids:
            org_instance = org_map.get(id)
            if id not in superior_ids and not org_instance.hierarchize_at:
                org_not_hierarchies.append(org_instance)
            else:
                org_has_hierarchies.append(org_instance)
            existed_ids.append(id)

    # Return the sorted list of high-level Organization objects
    return org_has_hierarchies, org_not_hierarchies
