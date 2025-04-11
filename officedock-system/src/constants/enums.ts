export enum SessionStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
}

export enum ServerStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  ALREADY_EXISTS = 409,
  LOCKED = 423,
  INTERNAL_SERVER_ERROR = 500,
}

export enum AuthenticationTypes {
  EMAIL = 'メールアドレス',
}

export enum VerifyOTP {
  EMAIL = 1,
  OTP = 2,
  DONE = 3,
}

export enum VerifyTokenType {
  REGISTRATION = 'REGISTRATION',
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export enum UserRoles {
  SYSTEM_ADMIN = 'システム管理者',
  MANAGER = '経営者',
  DEPARTMENT_MANAGER = '部門長',
  GENERAL = '一般',
}

export enum KanbanType {
  KANBAN = 'kanban',
  SCHEDULE = 'schedule',
  COLUMN = 'column',
  CARD = 'card',
}

export enum ActionTask {
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  COPY = 'COPY',
}

export enum CreateUserType {
  EMAIL = 'EMAIL',
  USERNAME = 'USERNAME',
}

export enum PriorityTask {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低',
}
export enum ItemStartType {
  SCHEDULE = 'SCHEDULE',
  TASK = 'TASK',
  SCHEDULE_ACTUAL = 'SCHEDULE-ACTUAL',
  TEMPLATE = 'TEMPLATE',
  FIXED_TASK = 'FIXED_TASK',
}
export enum ItemScheduleType {
  PLANS = '1',
  ACTUAL = '2',
}
export enum ItemScheduleTitleType {
  PLANS = '予定',
  ACTUAL = '実績',
}

export enum AvatarChat {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
  SELF = 'SELF',
  TASK = 'TASK',
  SKILL = 'SKILL',
  CALENDAR = 'CALENDAR',
}

// TODO: The state is not fixed, so defining the state using an enum is not appropriate,
// however, in order to determine the color for the rendering task, it will be used to determine the color code.
// The latter will return the corresponding color code and render
export enum StatusTask {
  NOT_STARTED = '未着手',
  IN_PROGRESS = '対応中',
  CONFIRMING = '確認中',
  COMPLETED = '完了',
  MY_ROUTINE = '固定タスク',
}
export enum StatusValueTask {
  NOT_STARTED = 1,
  IN_PROGRESS = 2,
  CONFIRMING = 3,
  COMPLETED = 4,
  MY_ROUTINE = 5,
}
export enum ComponentSize {
  SHORT = 'short',
  SMALL = 'small',
  HIDDEN = 'hidden',
}
export enum ChatRoomType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
  SELF = 'SELF',
  TASK = 'TASK',
  SKILL = 'SKILL',
  CALENDAR = 'CALENDAR',
  UNREAD = 'UNREAD',
  BOOKMARK = 'BOOKMARK',
}
export enum MessageType {
  MESSAGE = 'MESSAGE',
  CREATION_TASK = 'CREATION_TASK',
  CREATION_SCHEDULE = 'CREATION_SCHEDULE',
  EDIT_SCHEDULE = 'EDIT_SCHEDULE',
  REMOVE_SCHEDULE = 'REMOVE_SCHEDULE',
  EDIT_TASK = 'EDIT_TASK',
  REMOVE_MEMBER_TASK = 'REMOVE_MEMBER_TASK',
  ADD_MEMBER_TASK = 'ADD_MEMBER_TASK',
  SUBMIT_LEVEL_SKILL = 'SUBMIT_LEVEL_SKILL',
  CREATE_SUBMIT_LEVEL_SKILL = 'CREATE_SUBMIT_LEVEL_SKILL',
}
export enum SocketActions {
  MESSAGE = 'MESSAGE',
  HIDE_ROOM = 'HIDE_ROOM',
  SHOW_ROOM = 'SHOW_ROOM',
  PIN_ROOM = 'PIN_ROOM',
  UNPIN_ROOM = 'UNPIN_ROOM',
  ADD_PARTICIPANT = 'ADD_PARTICIPANT',
  REMOVE_PARTICIPANT = 'REMOVE_PARTICIPANT',
  EDIT_MESSAGE = 'EDIT_MESSAGE',
  DELETE_MESSAGE = 'DELETE_MESSAGE',
  CREATE_CHAT_ROOM = 'CREATE_CHAT_ROOM',
  UPDATE_CHAT_ROOM = 'UPDATE_CHAT_ROOM',
  CREATION_TASK = 'CREATION_TASK',
  CREATION_SCHEDULE = 'CREATION_SCHEDULE',
  DELETE_TASK = 'DELETE_TASK',
  TOTAL_UNREAD_MESSAGE = 'TOTAL_UNREAD_MESSAGE',
  CHANGE_TASK_STATUS = 'CHANGE_TASK_STATUS',
  CHANGE_ROLE = 'CHANGE_ROLE',
  REMIND_TASK = 'REMIND_TASK',
  RESET_STATUS_SORT_TASK = 'RESET_STATUS_SORT_TASK',
  DURATION_OVERTIME_WARNING = 'DURATION_OVERTIME_WARNING',
}

export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export enum CalendarViewOptions {
  VIEW_BY_YEAR = 'multiMonthYear',
  VIEW_BY_MONTH = 'dayGridMonth',
  VIEW_BY_WEEK = 'timeGridWeek',
  VIEW_BY_DAY = 'resourceTimeGridDay',
}

export enum ViewOptions {
  YEAR = 'year',
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
}

export enum ActionsEvent {
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
}

export enum EventCalendarType {
  TASK = 'TASK',
  SCHEDULE = 'SCHEDULE',
}

export enum EventWorkCategory {
  LARGE = 'LARGE',
  MEDIUM = 'MEDIUM',
  SMALL = 'SMALL',
  ALL = 'ALL',
}

export enum TermType {
  TERM_OF_USE = 'TERM_OF_USE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
}

export enum ColorDefault {
  BLUE = '#0068B6',
  GREEN = '#bf9544',
  YELLOW = '#1e7e62',
  PURPLE = '#4828ae',
}

export enum StatisticCategoryType {
  LARGE = 'LARGE',
  MEDIUM = 'MEDIUM',
  SMALL = 'SMALL',
}

export enum LevelKey {
  LEVEL1 = 'level1',
  LEVEL2 = 'level2',
  LEVEL3 = 'level3',
}

export enum NestedFieldKey {
  MEASUREMENT_COUNT = 'measurementCount',
  MEASUREMENT_TIME = 'measurementTime',
  REVIEW_PERIOD = 'reviewPeriod',
  DESCRIPTIONS = 'descriptions',
}

export enum LevelName {
  LEVEL0 = 'レベル0',
  LEVEL1 = 'レベル1',
  LEVEL2 = 'レベル2',
  LEVEL3 = 'レベル3',
}

export enum LevelUpAction {
  CREATE = 'create',
  EDIT = 'edit',
}

export enum SubmitLevelStatus {
  PENDING = '申請中',
  APPROVAL = '承認',
  REJECTED = '却下',
}

export enum PermissionsSystem {
  VIEW_ALL = 'view',
  // Role Permissions
  ROLE_VIEW = 'role_view',
  ROLE_ADD = 'role_add',
  ROLE_UPDATE = 'role_update',
  ROLE_DELETE = 'role_delete',
  // My Task Permissions
  MY_TASK_VIEW = 'my_task_view',
  MY_TASK_ADD = 'my_task_add',
  MY_TASK_UPDATE = 'my_task_update',
  MY_TASK_DELETE = 'my_task_delete',
  // Calendar Permissions
  CALENDAR_VIEW = 'calendar_view',
  CALENDAR_ADD = 'calendar_add',
  CALENDAR_UPDATE = 'calendar_update',
  CALENDAR_DELETE = 'calendar_delete',
  // Chat Permissions
  CHAT_VIEW = 'chat_view',
  CHAT_ADD = 'chat_add',
  CHAT_UPDATE = 'chat_update',
  CHAT_DELETE = 'chat_delete',
  // User Permissions
  USER_VIEW = 'user_view',
  USER_ADD = 'user_add',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  // Organization Permissions
  ORGANIZATION_VIEW = 'organization_view',
  ORGANIZATION_ADD = 'organization_add',
  ORGANIZATION_UPDATE = 'organization_update',
  ORGANIZATION_DELETE = 'organization_delete',
  // Category Permissions
  CATEGORY_VIEW = 'category_view',
  CATEGORY_ADD = 'category_add',
  CATEGORY_UPDATE = 'category_update',
  CATEGORY_DELETE = 'category_delete',
  // Category Hierarchy Permissions
  CATEGORY_HIERARCHY_VIEW = 'category_hierarchy_view',
  CATEGORY_HIERARCHY_ADD = 'category_hierarchy_add',
  CATEGORY_HIERARCHY_UPDATE = 'category_hierarchy_update',
  CATEGORY_HIERARCHY_DELETE = 'category_hierarchy_delete',
  // Skill Permissions
  SKILL_VIEW = 'skill_view',
  SKILL_ADD = 'skill_add',
  SKILL_UPDATE = 'skill_update',
  SKILL_DELETE = 'skill_delete',
  // Skill Map Permissions
  SKILL_MAP_VIEW = 'skill_map_view',
  SKILL_MAP_ADD = 'skill_map_add',
  SKILL_MAP_UPDATE = 'skill_map_update',
  SKILL_MAP_DELETE = 'skill_map_delete',
  // Organization Skill Permissions
  ORGANIZATION_SKILL_VIEW = 'organization_skill_view',
  ORGANIZATION_SKILL_ADD = 'organization_skill_add',
  ORGANIZATION_SKILL_UPDATE = 'organization_skill_update',
  ORGANIZATION_SKILL_DELETE = 'organization_skill_delete',
  // Tag Permissions
  TAG_VIEW = 'tag_view',
  TAG_ADD = 'tag_add',
  TAG_UPDATE = 'tag_update',
  TAG_DELETE = 'tag_delete',
  // Statistic Permissions
  STATISTIC_VIEW = 'statistic_view',
  STATISTIC_ADD = 'statistic_add',
  STATISTIC_UPDATE = 'statistic_update',
  // Submit Level Permissions
  SUBMIT_LEVEL_VIEW = 'submit_level_view',
  SUBMIT_LEVEL_UPDATE = 'submit_level_update',
  // Teamdock Permissions
  TEAMDOCK_VIEW = 'teamdock_view',
  TEAMDOCK_ADD = 'teamdock_add',
  TEAMDOCK_UPDATE = 'teamdock_update',
  TEAMDOCK_DELETE = 'teamdock_delete',

  // Team Daily Report Permissions
  TEAM_DAILY_REPORT_VIEW = 'team_daily_report_view',
  TEAM_DAILY_REPORT_ADD = 'team_daily_report_add',
  TEAM_DAILY_REPORT_UPDATE = 'team_daily_report_update',
  TEAM_DAILY_REPORT_DELETE = 'team_daily_report_delete',

  // Organization Hierarchy Permissions
  ORGANIZATION_HIERARCHY_VIEW = 'organization_hierarchy_view',
  ORGANIZATION_HIERARCHY_ADD = 'organization_hierarchy_add',
  ORGANIZATION_HIERARCHY_UPDATE = 'organization_hierarchy_update',
  ORGANIZATION_HIERARCHY_DELETE = 'organization_hierarchy_delete',

  // List Member Permissions
  LIST_MEMBER_VIEW = 'list_member_view',
  LIST_MEMBER_ADD = 'list_member_add',
  LIST_MEMBER_UPDATE = 'list_member_update',
  LIST_MEMBER_DELETE = 'list_member_delete',

  // Actual Duration Permissions
  ACTUAL_DURATION_VIEW = 'actual_duration_view',
  ACTUAL_DURATION_ADD = 'actual_duration_add',
  ACTUAL_DURATION_UPDATE = 'actual_duration_update',
  ACTUAL_DURATION_DELETE = 'actual_duration_delete',

  // Daily Report Permissions
  DAILY_REPORT_VIEW = 'daily_report_view',
  DAILY_REPORT_ADD = 'daily_report_add',
  DAILY_REPORT_UPDATE = 'daily_report_update',
  DAILY_REPORT_DELETE = 'daily_report_delete',
}

export enum ScreenAction {
  ADD = 'add',
  VIEW = 'view',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum ScreenName {
  MY_TASK = 'myTask',
  CALENDAR = 'calendar',
  CHAT = 'chat',
  USER = 'user',
  ORGANIZATION = 'organization',
  CATEGORY = 'category',
  CATEGORY_HIERARCHY = 'categoryHierarchy',
  SKILL = 'skill',
  SKILL_MAP = 'skillMap',
  ORGANIZATION_SKILL = 'organizationSkill',
  TAG = 'tag',
  STATISTIC = 'statistic',
  SUBMIT_LEVEL = 'submitLevel',
  ROLE = 'role',
  DAILY_REPORT = 'dailyReport',
  ACTUAL_DURATION = 'actualDuration',
  LIST_MEMBER = 'listMember',
  ORGANIZATION_HIERARCHY = 'organizationHierarchy',
  TEAM_STATISTIC = 'teamStatistic',
  TEAM_TASK = 'teamTask',
  TEAM_DAILY_REPORT = 'teamDailyReport',
}

export enum PermissionType {
  VIEW_ONLY = '閲覧のみ',
  EDITABLE = '編集可',
  TEAM_AND_SUB_EDIT = '自チームと下位チームのみ編集可',
  TEAM_AND_SUB_VIEW = '自チームと下位チームのみ閲覧可',
  NOT_ALLOWED = '不可',
}

export enum CurrentScreen {
  CATEGORY_HIERARCHY = 'category_hierarchy',
  SKILL_MAP = 'skill_map',
  ORGANIZATION_SKILL = 'organization_skill',
  USER = 'user',
  CALENDAR = 'calendar',
}

export enum WorkItemType {
  Task = 'タスク',
  Event = '予定',
}

export enum TemplateAction {
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  DETAIL = 'DETAIL',
  DEFAULT = 'DEFAULT',
}

export enum OrganizationType {
  MAIN = 'MAIN',
  SUB = 'SUB',
}

export enum TabType {
  MY_DOC = 'マイドック',
  TEAM_DOCK = 'チームドック',
}

export enum TimeType {
  HOURS = '時間前',
  DAY = '日前',
  WEEK = '週間前',
}
export enum FilterTypeKanban {
  DEADLINE = '-deadline',
  IMPORTANT = '-is_important',
}

export enum ReactionIconValue {
  OK = 1,
  LIKE = 2,
  THANK = 3,
  HAND = 4,
  SMILE = 5,
}

export enum ActionsModal {
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
}

export enum OrderingDataType {
  TOTAL_DURATION = 'total_duration',
  PERCENT = 'percent',
}
export enum TimeOptionsType {
  WEEK = '1週間',
  MONTH = '1ヶ月',
  HALF_YEAR = '6ヶ月',
  YEAR = '1年',
  MORE = 'カスタム',
}
export enum TaskRepetitiveType {
  ONCE = '繰り返さない',
  DAILY = '毎日',
  WEEKLY = '毎週',
  MONTHLY = '毎月',
  YEARLY = '毎年',
}
export enum TaskRepetitiveValue {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
export enum ScheduleType {
  PLAN = 'PLAN',
  ACTUAL = 'ACTUAL',
}
export enum StatisticViewOptions {
  MONTH = 'MONTH',
  WEEK = 'WEEK',
  DAY = 'DAY',
}
export enum StatisticViewLabels {
  MONTH = '月',
  WEEK = '週',
  DAY = '日',
}
export enum PendingNavigationType {
  MY_DOCK = 'MY_DOCK',
  TEAM_DOCK = 'TEAM_DOCK',
  MEMBER = 'MEMBER',
}
