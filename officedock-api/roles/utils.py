from users.models import Permission, Role, RoleDetail
from roles.constants import ROLE_PERMISSIONS, SelectionResultOptions


def create_role_permissions_default():
    """
    Create default role permissions based on defined constants.
    """
    for role_name, permissions in ROLE_PERMISSIONS.items():
        # Retrieve or create the role based on the role name
        role, created = Role.objects.get_or_create(name=role_name)
        for screen_name, actions in permissions.items():
            for action_name, selection_result in actions.items():
                screen_action = f"{screen_name}_{action_name}"
                permission_obj, created = Permission.objects.get_or_create(
                    name=screen_action
                )
                # Create a RoleDetail entry for the role, screen, and action
                RoleDetail.objects.update_or_create(
                    role=role,
                    permission=permission_obj,
                    defaults={"selection_result": selection_result},
                )


def create_role_with_permissions(role: Role, permissions: list):
    """
    Create role with permissions input.
    """
    for screen_name, actions in permissions.items():
        for action_name, selection_result in actions.items():
            screen_action = f"{screen_name}_{action_name}"
            permission_obj, created = Permission.objects.get_or_create(
                name=screen_action
            )
            # Create a RoleDetail entry for the role, screen, and action
            RoleDetail.objects.update_or_create(
                company=role.company,
                role=role,
                permission=permission_obj,
                defaults={"selection_result": selection_result},
            )


def get_permission_for_user(user, permission_name):
    """
    Return highest permission.
    """
    role_permissions = RoleDetail.objects.filter(
        role__users=user, permission__name=permission_name
    ).all()

    selection_results = [item.selection_result for item in role_permissions]
    if SelectionResultOptions.ALLOWED.value in selection_results:
        return SelectionResultOptions.ALLOWED.value
    elif (
        SelectionResultOptions.ONLY_DATA_ORGANIZATION.value in selection_results
    ):
        return SelectionResultOptions.ONLY_DATA_ORGANIZATION.value
    elif SelectionResultOptions.ONLY_DATA_OWN.value in selection_results:
        return SelectionResultOptions.ONLY_DATA_OWN.value
    elif (
        SelectionResultOptions.ALLOWED_WITHOUT_OWN_DATA.value
        in selection_results
    ):
        return SelectionResultOptions.ALLOWED_WITHOUT_OWN_DATA.value
    elif (
        SelectionResultOptions.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA.value
        in selection_results
    ):
        return (
            SelectionResultOptions.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA.value
        )
    else:
        return SelectionResultOptions.NOT_ALLOWED.value


def check_permission(permission_type, user_org_ids, item_org_ids):
    """
    Check if the user has permission for the given action.
    """
    if permission_type == SelectionResultOptions.ONLY_DATA_ORGANIZATION.value:
        return any(org_id in item_org_ids for org_id in user_org_ids)
    if (
        permission_type
        == SelectionResultOptions.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA.value
    ):
        return any(org_id in item_org_ids for org_id in user_org_ids)
    if permission_type == SelectionResultOptions.NOT_ALLOWED.value:
        return False

    return True


def has_permission(actions, user, item_org_ids):
    """
    Get unique role permissions for the given object.
    """
    # Retrieve permissions for update and delete actions
    user_org_ids = user.organizations.values_list("id", flat=True)

    # Check permissions for each action
    permissions = {
        action: check_permission(
            get_permission_for_user(user, action_name),
            user_org_ids,
            item_org_ids,
        )
        for action, action_name in actions.items()
    }

    return permissions
