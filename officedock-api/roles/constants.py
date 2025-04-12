from base.constants import EnumChoices
from users.constants import RoleTypes


class Screens(EnumChoices):
    """Enum for defining screen names."""

    MY_TASK = "my_task"
    CALENDAR = "calendar"
    CHAT = "chat"
    USER = "user"
    ORGANIZATION = "organization"
    CATEGORY = "category"
    CATEGORY_HIERARCHY = "category_hierarchy"
    SKILL = "skill"
    SKILL_MAP = "skill_map"
    ORGANIZATION_SKILL = "organization_skill"
    TAG = "tag"
    SUBMIT_LEVEL = "submit_level"
    ROLE = "role"
    STATISTIC = "statistic"
    DAILY_REPORT = "daily_report"
    ACTUAL_DURATION = "actual_duration"
    LIST_MEMBER = "list_member"
    ORGANIZATION_HIERARCHY = "organization_hierarchy"
    TEAMDOCK = "teamdock"
    TEAM_DAILY_REPORT = "team_daily_report"


class Actions(EnumChoices):
    """Enum for defining available actions."""

    VIEW = "view"
    ADD = "add"
    UPDATE = "update"
    DELETE = "delete"


class SelectionResultOptions(EnumChoices):
    """
    Options for role permissions selection results.
    """

    ALLOWED = "可"
    NOT_ALLOWED = "不可"
    ONLY_DATA_OWN = "本人データのみ可"
    ONLY_DATA_ORGANIZATION = "本人が所属している組織データのみ可"
    ALLOWED_WITHOUT_OWN_DATA = "可（本人データ除く）"
    ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA = "本人が所属している組織のデータ（本人データ除く）のみ可"


class PermissionOptions(EnumChoices):
    """
    Options for role permissions selection results.
    """

    ONLY_VIEW = "閲覧のみ"
    ALLOW_EDIT = "編集可"
    ONLY_EDIT_ORGANIZATION = "自チームと下位チームのみ編集可"
    ONLY_VIEW_ORGANIZATION = "自チームと下位チームのみ閲覧可"
    NOT_ALLOWED = "不可"
    ALL_ORGANIZATION = "全チーム参加"
    LOGGED_ORGANIZATION = "自チームと下位チームのみ参加"


# Define base permission allowed full actions
ALLOWED_FULL_ACTIONS = {
    Actions.VIEW.value: SelectionResultOptions.ALLOWED.value,
    Actions.ADD.value: SelectionResultOptions.ALLOWED.value,
    Actions.UPDATE.value: SelectionResultOptions.ALLOWED.value,
    Actions.DELETE.value: SelectionResultOptions.ALLOWED.value,
}

# Define base permission not allowed actions
NOT_ALLOWED_ACTIONS = {
    Actions.VIEW.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.ADD.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.UPDATE.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.DELETE.value: SelectionResultOptions.NOT_ALLOWED.value,
}

# Define base permission allowed view actions
ALLOWED_VIEW_ACTIONS = {
    Actions.VIEW.value: SelectionResultOptions.ALLOWED.value,
    Actions.ADD.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.UPDATE.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.DELETE.value: SelectionResultOptions.NOT_ALLOWED.value,
}

# Define base permission allowed view organization actions
ALLOWED_VIEW_ORGANIZATION_ACTIONS = {
    Actions.VIEW.value: SelectionResultOptions.ONLY_DATA_ORGANIZATION.value,
    Actions.ADD.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.UPDATE.value: SelectionResultOptions.NOT_ALLOWED.value,
    Actions.DELETE.value: SelectionResultOptions.NOT_ALLOWED.value,
}

# Define base permission actions to only data organization
ONLY_DATA_ORGANIZATION_ACTIONS = {
    Actions.VIEW.value: SelectionResultOptions.ONLY_DATA_ORGANIZATION.value,
    Actions.ADD.value: SelectionResultOptions.ONLY_DATA_ORGANIZATION.value,
    Actions.UPDATE.value: SelectionResultOptions.ONLY_DATA_ORGANIZATION.value,
    Actions.DELETE.value: SelectionResultOptions.ONLY_DATA_ORGANIZATION.value,
}

# Define permissions for role SYSTEM ADMIN and MANAGER

SYSTEM_ADMIN_AND_MANAGER_PERMISSIONS = {
    Screens.MY_TASK.value: ALLOWED_FULL_ACTIONS,
    Screens.CALENDAR.value: ALLOWED_FULL_ACTIONS,
    Screens.CHAT.value: ALLOWED_FULL_ACTIONS,
    Screens.USER.value: ALLOWED_FULL_ACTIONS,
    Screens.ORGANIZATION.value: ALLOWED_FULL_ACTIONS,
    Screens.CATEGORY.value: ALLOWED_FULL_ACTIONS,
    Screens.CATEGORY_HIERARCHY.value: ALLOWED_FULL_ACTIONS,
    Screens.SKILL.value: ALLOWED_FULL_ACTIONS,
    Screens.SKILL_MAP.value: ALLOWED_FULL_ACTIONS,
    Screens.ORGANIZATION_SKILL.value: ALLOWED_FULL_ACTIONS,
    Screens.TAG.value: ALLOWED_FULL_ACTIONS,
    Screens.SUBMIT_LEVEL.value: ALLOWED_FULL_ACTIONS,
    Screens.ROLE.value: ALLOWED_FULL_ACTIONS,
    Screens.STATISTIC.value: ALLOWED_FULL_ACTIONS,
    Screens.DAILY_REPORT.value: ALLOWED_FULL_ACTIONS,
    Screens.TEAM_DAILY_REPORT.value: ALLOWED_FULL_ACTIONS,
    Screens.TEAMDOCK.value: ALLOWED_FULL_ACTIONS,
    Screens.ACTUAL_DURATION.value: ALLOWED_FULL_ACTIONS,
    Screens.ORGANIZATION_HIERARCHY.value: ALLOWED_FULL_ACTIONS,
    Screens.LIST_MEMBER.value: ALLOWED_FULL_ACTIONS,
}
# Define permissions for role DEPARTMENT MANAGER

DEPARTMENT_MANAGER_PERMISSIONS = {
    Screens.MY_TASK.value: ALLOWED_FULL_ACTIONS,
    Screens.CALENDAR.value: ALLOWED_FULL_ACTIONS,
    Screens.CHAT.value: ALLOWED_FULL_ACTIONS,
    Screens.USER.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.ORGANIZATION.value: ALLOWED_FULL_ACTIONS,
    Screens.CATEGORY.value: ALLOWED_FULL_ACTIONS,
    Screens.CATEGORY_HIERARCHY.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.SKILL.value: ALLOWED_FULL_ACTIONS,
    Screens.SKILL_MAP.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.ORGANIZATION_SKILL.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.TAG.value: ALLOWED_FULL_ACTIONS,
    Screens.SUBMIT_LEVEL.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.ROLE.value: NOT_ALLOWED_ACTIONS,
    Screens.STATISTIC.value: ALLOWED_VIEW_ORGANIZATION_ACTIONS,
    Screens.DAILY_REPORT.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.TEAM_DAILY_REPORT.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.TEAMDOCK.value: ALLOWED_VIEW_ORGANIZATION_ACTIONS,
    Screens.ACTUAL_DURATION.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.ORGANIZATION_HIERARCHY.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.LIST_MEMBER.value: ONLY_DATA_ORGANIZATION_ACTIONS,
}
# Define permissions for role GENERAL
GENERAL_PERMISSIONS = {
    Screens.MY_TASK.value: ALLOWED_FULL_ACTIONS,
    Screens.CALENDAR.value: ALLOWED_FULL_ACTIONS,
    Screens.CHAT.value: ALLOWED_FULL_ACTIONS,
    Screens.USER.value: ALLOWED_VIEW_ACTIONS,
    Screens.ORGANIZATION.value: NOT_ALLOWED_ACTIONS,
    Screens.CATEGORY.value: NOT_ALLOWED_ACTIONS,
    Screens.CATEGORY_HIERARCHY.value: NOT_ALLOWED_ACTIONS,
    Screens.SKILL.value: NOT_ALLOWED_ACTIONS,
    Screens.SKILL_MAP.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    Screens.ORGANIZATION_SKILL.value: NOT_ALLOWED_ACTIONS,
    Screens.TAG.value: NOT_ALLOWED_ACTIONS,
    Screens.SUBMIT_LEVEL.value: NOT_ALLOWED_ACTIONS,
    Screens.ROLE.value: NOT_ALLOWED_ACTIONS,
    Screens.STATISTIC.value: ALLOWED_VIEW_ACTIONS,
    Screens.DAILY_REPORT.value: ALLOWED_VIEW_ACTIONS,
    Screens.TEAM_DAILY_REPORT.value: ALLOWED_VIEW_ORGANIZATION_ACTIONS,
    Screens.TEAMDOCK.value: ALLOWED_VIEW_ORGANIZATION_ACTIONS,
    Screens.ACTUAL_DURATION.value: NOT_ALLOWED_ACTIONS,
    Screens.ORGANIZATION_HIERARCHY.value: NOT_ALLOWED_ACTIONS,
    Screens.LIST_MEMBER.value: NOT_ALLOWED_ACTIONS,
}

# Define base role permissions
ROLE_PERMISSIONS = {
    RoleTypes.SYSTEM_ADMIN.value: SYSTEM_ADMIN_AND_MANAGER_PERMISSIONS,
    RoleTypes.MANAGER.value: SYSTEM_ADMIN_AND_MANAGER_PERMISSIONS,
    RoleTypes.DEPARTMENT_MANAGER.value: DEPARTMENT_MANAGER_PERMISSIONS,
    RoleTypes.GENERAL.value: GENERAL_PERMISSIONS,
}

# Define role permission by options
ROLE_PERMISSION_BY_OPTIONS = {
    PermissionOptions.ONLY_VIEW.value: ALLOWED_VIEW_ACTIONS,
    PermissionOptions.NOT_ALLOWED.value: NOT_ALLOWED_ACTIONS,
    PermissionOptions.ALLOW_EDIT.value: ALLOWED_FULL_ACTIONS,
    PermissionOptions.ONLY_EDIT_ORGANIZATION.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    PermissionOptions.LOGGED_ORGANIZATION.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    PermissionOptions.ONLY_VIEW_ORGANIZATION.value: ALLOWED_VIEW_ORGANIZATION_ACTIONS,
    PermissionOptions.ALL_ORGANIZATION.value: ALLOWED_FULL_ACTIONS,
}

# Define teamdock role permission by options
TEAMDOCK_ROLE_PERMISSION_BY_OPTIONS = {
    PermissionOptions.LOGGED_ORGANIZATION.value: ONLY_DATA_ORGANIZATION_ACTIONS,
    PermissionOptions.ALL_ORGANIZATION.value: ALLOWED_FULL_ACTIONS,
}
