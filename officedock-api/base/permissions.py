from rest_framework import permissions

from core import settings
from roles.constants import Actions, Screens
from users.constants import RoleTypes
from users.models import User
from common.utils import to_camel_case, check_permission_exists


class BasePermission(permissions.BasePermission):
    """
    Custom base permission class
    """

    def is_authenticated(self, request):
        """
        Check is authenticated
        """

        user = request.user
        token = request.auth

        return user and user.is_authenticated and user.verify_login_token(token)

    def is_role(self, request, role):
        """
        Check is role
        """

        return self.is_authenticated(request) and (
            request.user.check_roles(role)
        )


class ActionPermission(BasePermission):
    """
    Custom permission class to check if a user has the necessary permissions
    for a given action based on their role.
    """

    def has_permission(self, request, view):
        """
        Check if the request has the required permissions based on the current screen and API's screen_name.
        """
        if not self.is_authenticated(request):
            return False

        current_screen = request.query_params.get("current_screen")
        screen_name = getattr(view, "screen_name", None)

        if not screen_name:
            return False  # Deny access if `screen_name` is not defined

        # Allow `GET` requests if fetching data for a screen different from the current screen
        if current_screen and to_camel_case(current_screen) != to_camel_case(
            screen_name
        ):
            return True

        # Allow request if action in teamdock but my task API
        if (
            screen_name == Screens.MY_TASK.value
            and current_screen == Screens.TEAMDOCK.value
        ):
            return True

        method_action = {
            "GET": Actions.VIEW.value,
            "POST": Actions.ADD.value,
            "PATCH": Actions.UPDATE.value,
            "PUT": Actions.UPDATE.value,
            "DELETE": Actions.DELETE.value,
        }

        action = method_action.get(request.method)
        if not action:
            return False  # Deny access for unsupported HTTP methods

        permission_name = f"{screen_name}_{action}"

        # FIXME: Make new hierarchy category screen later
        # Check if logged user has permission add hierarchies category, allow update hierarchies category
        if (
            permission_name
            == f"{Screens.CATEGORY_HIERARCHY.value}_{Actions.ADD.value}"
        ):
            category_hierarchy_add = (
                f"{Screens.CATEGORY_HIERARCHY.value}_{Actions.ADD.value}"
            )
            category_hierarchy_update = (
                f"{Screens.CATEGORY_HIERARCHY.value}_{Actions.UPDATE.value}"
            )
            return check_permission_exists(
                request, category_hierarchy_add
            ) or check_permission_exists(request, category_hierarchy_update)

        return check_permission_exists(request, permission_name)


class IsOperationAdminOnly(BasePermission):
    """
    The permission for only Operation Admin can access resources
    """

    def has_permission(self, request, view):
        return self.is_role(request, RoleTypes.OPERATION_ADMIN.value)


class IsSystemAdminOnly(BasePermission):
    """
    The permission for only System Admin can access resources
    """

    def has_permission(self, request, view):
        return self.is_role(request, RoleTypes.SYSTEM_ADMIN.value)

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Don't allow System Admin delete itself
        if (
            view.action == "destroy"
            and isinstance(obj, User)
            and user.id == obj.id
        ):
            return False

        return user.company_id == obj.company_id


class IsManagerOnly(BasePermission):
    """
    The permission for only Manager can access resources
    """

    def has_permission(self, request, view):
        return self.is_role(request, RoleTypes.MANAGER.value)


class IsManagerReadOnly(BasePermission):
    """
    The permission for only Manager can access resources for read-only.
    """

    def has_permission(self, request, view):
        return self.is_role(
            request, RoleTypes.MANAGER.value
        ) and view.action in ["list", "retrieve"]


class IsDepartmentManagerOnly(BasePermission):
    """
    The permission for only Department Manager can access resources
    """

    def has_permission(self, request, view):
        return self.is_role(request, RoleTypes.DEPARTMENT_MANAGER.value)


class IsDepartmentManagerReadOnly(BasePermission):
    """
    The permission for only Department Manager can access resources for read-only.
    """

    def has_permission(self, request, view):
        return self.is_role(
            request, RoleTypes.DEPARTMENT_MANAGER.value
        ) and view.action in ["list", "retrieve"]


class IsGeneralOnly(BasePermission):
    """
    The permission for only General can access resources
    """

    def has_permission(self, request, view):
        return self.is_role(request, RoleTypes.GENERAL.value)


class IsGeneralReadOnly(BasePermission):
    """
    The permission for only General can access resources for read-only.
    """

    def has_permission(self, request, view):
        return self.is_role(
            request, RoleTypes.GENERAL.value
        ) and view.action in ["list", "retrieve"]


class IsCronJob(BasePermission):
    """
    The permission for only use cron job
    """

    def has_permission(self, request, view):
        CRONJOB_KEY_DOTENV = settings.SECRET_KEY_FOR_CRONJOB
        cronjob_key_request = request.query_params.get("cronjob_key")
        if not CRONJOB_KEY_DOTENV or CRONJOB_KEY_DOTENV != cronjob_key_request:
            return False

        return True


class IsApiKeyValid(BasePermission):
    """
    Permission that allows access only if the request includes
    a valid X-API-Key header matching the value defined in settings.
    """

    def has_permission(self, request, view):
        # Get the API key from environment (settings.py loads it from .env)
        api_key_env = getattr(settings, "API_SECRET_KEY", None)
        # Extract the API key from request headers
        api_key_request = request.headers.get("X-API-Key")

        # Deny if no API key is configured or no header is provided
        if not api_key_env or not api_key_request:
            return False

        # Allow only if header matches the expected secret key
        return api_key_request == api_key_env
