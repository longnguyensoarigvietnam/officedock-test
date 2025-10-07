export const pageRouters = {
  // Auth
  LOGIN: {
    name: 'ログイン',
    href: '/',
  },
  FORGOT_PASSWORD: {
    name: 'パスワードの再設定',
    href: '/forgot-password',
  },
  RESET_PASSWORD: {
    name: 'パスワード再設定',
    href: '/reset-password',
  },
  CHANGE_PASSWORD: {
    name: 'パスワード変更',
    href: '/profile/change-password',
  },
  LOGIN_2FA: {
    name: 'ログイン認証',
    href: '/login/2fa',
  },
  // Setting
  SETTING: {
    name: '設定',
    href: '/settings',
  },
  // User
  USERS_MANAGEMENT: {
    name: 'ユーザー管理',
    href: '/users',
  },
  CREATE_USER: {
    name: '新規登録',
    href: '/users/create',
  },
  EDIT_USER: {
    name: 'ユーザー編集',
    href: (id: string) => `/users/${id}/edit`,
  },
  DETAIL_USER: {
    name: 'ユーザー詳細',
    href: (id: string) => `/users/${id}`,
  },

  // ROLE
  ROLES_MANAGEMENT: {
    name: 'ロール管理',
    href: '/roles',
  },
  CREATE_ROLE: {
    name: '新規登録',
    href: '/roles/create',
  },
  EDIT_ROLE: {
    name: 'ロール編集',
    href: (id: string) => `/roles/${id}/edit`,
  },
  DETAIL_ROLE: {
    name: 'ロール詳細',
    href: (id: string) => `/roles/${id}`,
  },

  // ORGANIZATION
  ORGANIZATION_MANAGEMENT: {
    name: '組織管理',
    href: '/organizations',
  },
  CREATE_ORGANIZATION: {
    name: '新規登録',
    href: '/organizations/create',
  },
  EDIT_ORGANIZATION: {
    name: '組織編集',
    href: (id: string) => `/organizations/${id}/edit`,
  },
  DETAIL_ORGANIZATION: {
    name: '組織詳細',
    href: (id: string) => `/organizations/${id}`,
  },
  ORGANIZATION_HIERARCHY: {
    name: 'チーム管理',
    href: '/organizations/hierarchies',
  },
  ORGANIZATION_HIERARCHY_EDIT: {
    name: 'チーム管理',
    href: '/organizations/hierarchies/edit',
  },
  // TAG
  TAGS_MANAGEMENT: {
    name: '集計タグ管理',
    href: '/tags',
  },
  CREATE_TAG: {
    name: '新規登録',
    href: '/tags/create',
  },
  EDIT_TAG: {
    name: '集計タグ編集',
    href: (id: string) => `/tags/${id}/edit`,
  },
  DETAIL_TAG: {
    name: '集計タグ詳細',
    href: (id: string) => `/tags/${id}`,
  },
  // TASK / EVENT
  SCHEDULES_MANAGEMENT: {
    name: 'スケジュール管理',
    href: '/schedules',
  },
  DEFAULT: {
    name: '',
    href: '/default',
  },
  TASKS_MANAGEMENT: {
    name: 'マイタスク',
    href: '/tasks',
  },
  CALENDAR_MANAGEMENT: {
    name: 'カレンダー',
    href: '/calendar',
  },

  // TASK TEAM
  TASKS_TEAM_MANAGEMENT: {
    name: 'チームタスク',
    href: '/task-teams',
  },
  SCHEDULE_TEAM_MANAGEMENT: {
    name: 'チームタスク',
    href: '/task-teams/schedules',
  },

  // CHAT
  CHAT_MANAGEMENT: {
    name: 'チャット',
    href: '/chat',
  },
  DETAIL_CHAT: {
    name: 'チャット詳細',
    href: (code: string) => `/chat/${code}`,
  },
  // STATISTIC
  STATISTIC_MANAGEMENT: {
    name: '集計',
    href: '/statistic',
  },
  STATISTIC_TAG_MANAGEMENT: {
    name: '集計',
    href: '/statistic/tag',
  },
  // STATISTIC TEAM
  STATISTIC_TEAM_MANAGEMENT: {
    name: 'チーム集計',
    href: '/statistic-team',
  },
  STATISTIC_TEAM_TAG_MANAGEMENT: {
    name: 'チーム集計',
    href: '/statistic-team/tag',
  },

  // DAILY REPORT
  DAILY_REPORT_MANAGEMENT: {
    name: '日報',
    href: '/daily-report',
  },
  DAILY_REPORT_TEAM: {
    name: '日報一覧',
    href: '/daily-report-team',
  },
  DAILY_REPORT_TEAM_DETAIL: {
    name: '日報',
    href: (id: string) => `/daily-report-team/${id}`,
  },
  // CATEGORY
  CATEGORY_MANAGEMENT: {
    name: '業務カテゴリー',
    href: '/categories',
  },
  EDIT_CATEGORY: {
    name: '集計カテゴリー編集',
    href: (id: string) => `/categories/${id}/edit`,
  },
  DETAIL_CATEGORY: {
    name: '集計カテゴリー詳細',
    href: (id: string) => `/categories/${id}`,
  },
  CREATE_CATEGORY: {
    name: '集計カテゴリー作成',
    href: '/categories/create',
  },

  // SKILL
  SKILLS_MANAGEMENT: {
    name: 'スキル',
    href: '/skills',
  },
  CREATE_SKILLS: {
    name: 'スキル作成',
    href: '/skills/create',
  },
  EDIT_SKILLS: {
    name: 'スキル編集',
    href: (id: string) => `/skills/${id}/edit`,
  },
  DETAIL_SKILLS: {
    name: 'スキル詳細',
    href: (id: string) => `/skills/${id}`,
  },

  // SKILL MAP
  SKILL_MAP: {
    name: 'スキルマップ',
    href: '/skill-map',
  },
  SKILL_LIST_MANAGEMENT: {
    name: 'マイドック_スキルマップ_スキル一覧',
    href: '/skill-map/skill-list',
  },
  SKILL_MAP_SKILL: {
    name: 'マイスキル',
    href: '/skill-map/my-skill',
  },
  SKILL_MAP_LIST: {
    name: 'スキル一覧',
    href: '/skill-map/list',
  },
  // SKILL MAP TEAM
  SKILL_MAP_TEAM: {
    name: 'スキルマップ',
    href: '/skill-map-team',
  },
  SKILL_MAP_TEAM_DETAIL: {
    name: 'ユーザー詳細',
    href: (id: number) => `/skill-map-team/${id}`,
  },
  LEVEL_UP_TEAM: {
    name: 'レベルアップ申請',
    href: '/skill-map-team/level-up',
  },

  // SKILL MAPS
  SKILL_MAPS_MANAGEMENT: {
    name: 'スキルマップ',
    href: '/skill-maps',
  },
  EDIT_SKILL_MAPS: {
    name: 'スキルマップ編集',
    href: (skillId: string | null, organizationId: string, staffId: string) =>
      `/skill-maps/${skillId ? skillId : ' '}/edit?organizationId=${organizationId}&&staffId=${staffId}`,
  },
  CREATE_SKILL_MAPS: {
    name: 'スキルマップ作成',
    href: (organizationId: string, staffId: string) =>
      `/skill-maps/create?organizationId=${organizationId}&&staffId=${staffId}`,
  },
  DETAIL_SKILL_MAPS: {
    name: 'スキルマップ詳細',
    href: (skillId: string | null, organizationId: string, staffId: string) =>
      `/skill-maps/${skillId ? skillId : ' '}?organizationId=${organizationId}&&staffId=${staffId}`,
  },
  ORGANIZATION_SKILLS_MANAGEMENT: {
    name: '組織_スキル',
    href: '/organization-skills',
  },
  EDIT_ORGANIZATION_SKILL: {
    name: '組織_スキル編集',
    href: (organizationId: string) =>
      `/organization-skills/${organizationId}/edit`,
  },
  CREATE_ORGANIZATION_SKILL: {
    name: '組織_スキル作成',
    href: (organizationId: string) =>
      `/organization-skills/${organizationId}/create`,
  },
  DETAIL_ORGANIZATION_SKILL: {
    name: '組織_スキル詳細',
    href: (organizationId: string) => `/organization-skills/${organizationId}`,
  },
  SKILL_MAPS_MEMBERS_MANAGEMENT: {
    name: 'スキル設定_対応メンバー編集',
    href: '/skill-maps/members',
  },
  EDIT_SKILL_MAPS_MEMBERS: {
    name: 'スキル設定_対応メンバー編集',
    href: '/skill-maps/members/edit',
  },

  // LEVEL_UP
  SUBMIT_LEVELS: {
    name: 'レベルアップ申請確認',
    href: '/submit-levels',
  },
  EDIT_SUBMIT_LEVELS: {
    name: 'レベルアップ申請確認',
    href: (organizationId: string) => `/submit-levels/${organizationId}/edit`,
  },
  DETAIL_SUBMIT_LEVELS: {
    name: 'レベルアップ申請確認',
    href: (organizationId: string) => `/submit-levels/${organizationId}`,
  },

  // HIERARCHY
  TEAM_CATEGORY_MANAGEMENT: {
    name: 'チームカテゴリー階層',
    href: '/categories/team',
  },
  EDIT_TEAM_CATEGORY: {
    name: 'チームカテゴリー階層編集',
    href: '/categories/team/edit',
  },
  CREATE_TEAM_CATEGORY: {
    name: 'チームカテゴリー階層作成',
    href: (id: string) => `/categories/team/${id}/create`,
  },
  DETAIL_TEAM_CATEGORY: {
    name: 'チームカテゴリー階層詳細',
    href: (id: string) => `/categories/team/${id}`,
  },
  CALENDAR_CATEGORY_MANAGEMENT: {
    name: 'カレンダーカテゴリー階層',
    href: '/categories/calendar',
  },
  EDIT_CALENDAR_CATEGORY: {
    name: 'カレンダーカテゴリー階層編集',
    href: '/categories/calendar/edit',
  },
  CREATE_CALENDAR_CATEGORY: {
    name: 'カレンダーカテゴリー階層作成',
    href: (id: string) => `/categories/calendar/${id}/create`,
  },
  DETAIL_CALENDAR_CATEGORY: {
    name: 'カレンダーカテゴリー階層詳細',
    href: (id: string) => `/categories/calendar/${id}`,
  },

  // ACTUAL_DURATIONS MANAGEMENT
  ACTUAL_DURATIONS_MANAGEMENT: {
    name: '実績管理',
    href: '/actual-durations',
  },
  EDIT_ACTUAL_DURATIONS: {
    name: '実績管理編集',
    href: (id: string, type: string) =>
      `/actual-durations/${id}/edit?type=${type}`,
  },
  CREATE_ACTUAL_DURATIONS: {
    name: '実績管理作成',
    href: (id: string, type: string) =>
      `/actual-durations/${id}/create?type=${type}`,
  },
  DETAIL_ACTUAL_DURATIONS: {
    name: '実績管理詳細',
    href: (id: string) => `/actual-durations/${id}`,
  },
  MEMBER_MANAGEMENT: {
    name: 'メンバー一覧',
    href: `/member`,
  },
  LOCATION_MANAGEMENT: {
    name: 'カレンダー設定',
    href: `/location`,
  },
  THANK_MESSAGE_MANAGEMENT: {
    name: 'サンクスメッセージ管理',
    href: `/thank-message-history`,
  },
  // MY PAGE
  MY_PAGE: {
    name: 'マイページ',
    href: `/my-page`,
  },
  VISIT_ROOM: {
    name: '他の人の部屋へ出かける',
    href: '/my-page/visit-rooms',
  },
  VISIT_ROOM_DETAIL: {
    name: '他の人の部屋へ出かける',
    href: (id: string) => `/my-page/visit-rooms/${id}`,
  },
  SURVEY: {
    name: 'アンケート',
    href: `/my-page/survey`,
  },
  THANKS_MESSAGE: {
    name: 'サンクスメッセージ',
    href: `/my-page/thanks-message`,
  },
  SHOP_ITEM: {
    name: 'アイテムショップ',
    href: `/my-page/shop`,
  },
  CUSTOMIZE_ITEM: {
    name: '所持アイテムをカスタマイズ',
    href: `/my-page/customize`,
  },
  HISTORY_POINT: {
    name: 'ポイント履歴 / 交換',
    href: `/my-page/history`,
  },
  // MVP
  MVP: {
    name: 'MVP',
    href: '#',
  },
  MVP_MANAGEMENT: {
    name: 'MVP投票管理',
    href: `/mvp-management`,
  },
  MVP_VOTING: {
    name: 'MVP投票',
    href: `/my-page/mvp/voting`,
  },
  MVP_ANNOUNCEMENT: {
    name: 'MVP発表',
    href: `/my-page/mvp/announcement`,
  },
  MVP_HISTORY: {
    name: '過去のMVP履歴',
    href: `/my-page/mvp/history`,
  },
  MVP_VOTING_STATUS: {
    name: 'MVP投票状況',
    href: `/mvp-management/voting-status`,
  },
  // POINT
  POINT_MANAGEMENT: {
    name: 'コイン設定',
    href: `/points`,
  },
};

// For the API routers
export const apiRouters = {
  // AUTH
  LOGIN: '/auth/login/',
  CHECK_LOGIN: '/auth/verify-2fa/',
  VERIFY_TOKEN: '/auth/verify-token/',
  LOGIN_RESEND_OTP: '/auth/resend-otp/',
  LOGIN_OTP: '/auth/verify-login/',
  LOGIN_GOOGLE: '/auth/login/google/',
  LOGIN_GOOGLE_VERIFY: '/auth/login/google/verify/',
  FORGOT_PASSWORD: '/auth/forgot-password/',
  RESET_PASSWORD: '/auth/reset-password/',
  CHANGE_PASSWORD: '/auth/change-password/',
  LOGIN_BONUS: '/auth/login-bonus/',

  // ORGANIZATION
  ORGANIZATION_LIST: '/organizations/',
  ORGANIZATION_LIST_OPTIONS: '/creation-data/organization/',
  ORGANIZATION_DETAIL: (id: string) => `/organizations/${id}/`,
  ORGANIZATION_RESET_INDEX: (id: string) =>
    `/organizations/${id}/statistic-categories/reset-index/`,
  ORGANIZATION_SKILLS: '/organization-skills',
  ORGANIZATION_SKILL_DELETE: (id: string) => `/organization-skills/${id}/`,
  ORGANIZATION_SKILL_DETAIL: (id: number) => `/skills/${id}/group-steps/`,
  ORGANIZATION_HIERARCHY: '/organizations/hierarchy/',
  ORGANIZATION_DEFINE_STEPS: (id: number) =>
    `/organizations/${id}/define-steps/`,

  // CREATE DATA
  ORGANIZATION_CREATION: '/creation-data/organization/',
  ROLE_CREATION: '/creation-data/role/',
  TASK_CREATION: '/creation-data/task/',
  COMMON_CREATION: '/creation-data/common/',

  SCHEDULE_CREATION: '/creation-data/schedule/',
  PEOPLE_IN_CHARGE_CREATION: '/creation-data/people-in-charge/',
  STATISTIC_ORGANIZATION_CREATION: '/creation-data/statistic-categories/',
  SKILL_CREATION: '/creation-data/organization-skills/',
  TAG_CREATION: '/creation-data/tags/',
  CATEGORY_FILTER_CREATION: '/creation-data/category-filters/',
  TASK_LIST_CHAT: '/creation-data/tasks/',
  STATISTIC_CREATION: '/creation-data/statistics/',

  // USER
  USER_LIST: '/users/',
  USER_DETAIL: (id: string | number) => `/users/${id}/`,
  TAG_LIST: '/tags/',
  HIDDEN_TAG_LIST: '/tags/list-hidden',
  TAG_DETAIL: (id: string) => `/tags/${id}/`,
  DASHBOARD_MEMBER_LIST: '/dashboard/members/',
  MEMO_DETAIL: '/users/memo/',
  AUTHENTICATED_USER: '/auth/me',
  USER_BUY_ITEM: '/users/buy-item/',
  USER_WEAR_ITEM: '/users/equipped-item/',

  // CATEGORY
  CATEGORY_LIST: '/statistic-categories/',
  CATEGORY_DETAIL: (id: string) => `/statistic-categories/${id}/`,
  CATEGORY_VALIDATION: '/statistic-categories/validation-data/',
  CHECK_ACTUAL_DURATION:
    '/organization-category-hierarchies/check-actual-duration/',

  // TASK
  TASK_BOARD_LIST: '/tasks/board/',
  TASK_ME_LIST: '/tasks/me/',
  DASHBOARD_HEADER_TASK_LIST: '/dashboard/cards/',
  DASHBOARD_TAG_LIST: '/dashboard/tags/',
  DASHBOARD_UNREAD_MESSAGES: '/dashboard/unread-messages/',
  TASK_CALENDAR_LIST: '/tasks/calendar/',
  TASK_SCHEDULE_UPDATE: '/tasks/schedules/',
  CREATE_TASK: '/tasks/',
  UPDATE_TASK_INDEX: '/tasks/index/',
  TASK_DETAIL: (id: string) => `/tasks/${id}/`,
  TASK_SCHEDULE_DETAIL: (id: string) => `/tasks/schedules/${id}/`,
  TASK_SCHEDULE_MULTIPLE: `/tasks/schedules/multiple/`,
  TASK_PLAN_SCHEDULE_DETAIL: (uuid: string) => `/tasks/schedules/${uuid}/`,
  TASK_SCHEDULE_COPY: (uuid: string) => `tasks/schedules/${uuid}/copy`,

  TASK_COPY: (id: string) => `/tasks/${id}/copy/`,
  TASK_PIN: (id: string) => `/tasks/${id}/pin/`,

  // TASK TEAM
  TASK_TEAM_LIST: '/tasks/teamdock/',
  TASK_TEAM_NO_SETTING: '/tasks/teamdock/not-setting-user/',

  // TEAM SCHEDULE
  PLAN_TEAM_SCHEDULE_LIST: '/teamdock/schedules/plan/',
  ACTUAL_TEAM_SCHEDULE_LIST: '/teamdock/schedules/actual/',

  // DURATION
  TASK_DURATION: `/durations/`,
  TASK_DURATION_DETAIL: () => `/durations/running/`,
  TASK_HEADER_START: '/durations/running/',
  TASK_CALCULATE_DURATION: () => `/durations/calculate/`,
  UPDATE_TASK_ACTUAL: (uuid: string) => `/durations/${uuid}/`,
  TASK_ACTUAL_MULTIPLE: `/actual-durations/bulk-create/`,

  // CHAT
  CHAT_MESSAGES: (code: string) => `/chat/${code}/messages/`,
  MESSAGE_LIST: '/messages/',
  CHAT_MESSAGES_DETAIL: (id: string) => `/messages/${id}/`,
  CHAT_DETAIL: (code: string) => `/chat/${code}/`,
  CHAT_LIST: '/chat/',
  CHAT_PIN: (code: string) => `/chat/${code}/pin/`,
  CHAT_HIDE: (code: string) => `/chat/${code}/hide/`,
  SOCKET_ACTION: (token: string) => `/system/ws/chat/?token=${token}`,
  CHAT_SETTING: '/users/chat-setting/',
  CHAT_UPLOAD_CHUNK: '/chat/chunk-files/',
  MEMO_CHAT_ACTION: (code: string) => `/chat/${code}/memo/`,
  LIST_CHAT_FILE: '/chat-files/',
  FILE_DETAIL: (id: string) => `/chat-files/${id}/`,
  MUTE_CHAT: (code: string) => `/chat/${code}/mute/`,
  LEAVE_GROUP: (code: string) => `/chat/${code}/leave_group/`,

  // BOOKMARK
  BOOKMARK_LIST: '/messages/',
  BOOKMARK_MESSAGE: (uuid: string) => `/messages/${uuid}/bookmark/`,

  // REACTION
  REACTION_MESSAGE: (uuid: string) => `/messages/${uuid}/reaction/`,

  // SCHEDULE
  SCHEDULES: '/schedules/',
  SCHEDULE_DETAIL: (id: string) => `/schedules/${id}/`,
  DELETE_REPEAT_SCHEDULE: (id: string) =>
    `/schedules/${id}/delete-repeat-schedule/`,
  TASK_CALENDAR: '/calendars/',
  USER_SETTING: '/users/setting/',
  EVENT_KANBAN_SCHEDULE: '/dashboard/kanban-schedules/',
  CHECK_OVERLAPPING_LOCATION: '/schedules/check-overlapping/',

  // TERM
  READ_TERM: (id: string) => `/terms/${id}/read/`,
  TERM_LIST: '/terms/',

  // DAILY REPORT
  DATA_DAILY_STATISTIC: '/stat-data/daily-report/',
  DATA_REMARK_DAILY: '/users/daily-report/',
  DATA_DAILY_STATISTIC_PDF: '/stat-data/daily-report-pdf/',

  // SKILL
  SKILL_LIST: '/skills/',
  SKILL_DETAIL: (id: string) => `/skills/${id}/`,

  // SKILLS MAP
  SKILL_MAPS_LIST: '/skill-maps/',
  SKILL_MAPS_DESTROY: '/skill-maps/destroy',
  SKILL_MAPS_DETAIL: (id: string) => `/skill-maps/${id}/`,
  SKILL_MAPS_DETAIL_SKILL: '/skill-maps/group-steps/',
  SKILL_MAPS_LIST_SKILLS: '/skill-maps/list-skills/',

  SKILL_MAPS_DETAIL_CATEGORIES: '/skill-maps/detail',
  SKILL_MAPS_RESET_INDEX: '/skill-maps/reset-index/',
  MANAGE_SKILL_MAPS: '/manage-skill-maps/',
  SKILL_MAPS_COMMENT: (id: string) => `/skill-maps/${id}/comments`,
  SKILL_MAPS_LEVEL_UP: (id: string) => `/skill-maps/${id}/level-up`,
  SAVE_SKILL_MAPS_LEVEL_UP_DRAFT: (id: string) =>
    `/skill-maps/${id}/skill-map-level/`,
  SET_SKILL: (id: string) => `/skill-maps/${id}/set-skill/`,
  SET_SKILL_LIST: '/skill-maps/set-skill/',

  // SUBMIT LEVELS
  SUBMIT_LEVELS_LIST: '/submit-levels/',
  SUBMIT_LEVELS_DETAIL: (id: string | number) => `/submit-levels/${id}/`,

  // STATISTIC ORGANIZATION
  ACTION_STATISTIC_ORGANIZATION: (id: string) =>
    `/organizations/${id}/statistic-categories/`,

  // ROLES
  ROLE_LIST: '/roles/',
  ROLE_DETAIL: (id: number) => `/roles/${id}/`,

  // ACTUAL DURATIONS
  ACTUAL_DURATIONS_LIST: '/actual-durations/',
  ACTUAL_DURATION_DETAIL: (id: number) => `/actual-durations/${id}/`,
  TASKS_SCHEDULES_LIST: '/actual-durations/tasks-schedules/',

  // TEMPLATES
  TEMPLATE_LIST: '/tasks/template/',

  // MEMBER ORGANIZATION
  MEMBER_ORGANIZATION_LIST: '/organizations/members/',

  // STAT DATA
  STAT_DATA: '/stat-data/',
  CONFIRM_USER_DAILY: (id: number) => `/users/${id}/report/`,

  // STATISTICS
  TEAM_LIST: '/teams/',
  STATISTICS_CATEGORIES: '/statistics/categories/',
  STATISTICS_TASKS: '/statistics/tasks/',
  STATISTICS_TAGS: '/statistics/tags/',
  STATISTICS_TASK_DURATIONS: '/statistics/task-durations/',
  STATISTICS_PERCENT_CHART: '/statistics/percent-change/',

  STATISTICS_ALL_TEAMS_TASK_DURATIONS: '/all-team-statistics/task-durations/',
  STATISTICS_ALL_TEAMS_CATEGORIES: '/all-team-statistics/categories/',
  STATISTICS_ALL_TEAMS_TAG: '/all-team-statistics/tags/',

  // STATISTICS TEAM
  STATISTICS_CATEGORIES_TEAM: `/organization-statistics/categories/`,
  STATISTICS_TAGS_TEAM: `/organization-statistics/tags/`,
  STATISTICS_USER_TASK_DURATIONS: (id: number) =>
    `/organization-statistics/${id}/user-task-durations/`,

  // ORGANIZATION CATEGORY HIERARCHIES
  ORGANIZATION_CATEGORY_HIERARCHY_DETAIL: (id: number) =>
    `/organization-category-hierarchies/${id}/`,
  ORGANIZATION_CATEGORY_HIERARCHY_LIST: '/organization-category-hierarchies/',

  // LOCATION
  LOCATION_LIST: '/event-locations/',
  LOCATION_DETAIL: (uuid: string) => `/event-locations/${uuid}/`,

  // COMPANY
  COMPANY_SETTINGS: 'companies/settings/',

  // TWEET
  TWEET_LIST: '/tweets/',
  TWEET_DETAIL: (id: number) => `/tweets/${id}/`,

  // SURVEY
  SURVEY_LIST: '/surveys/',
  SURVEY_DETAIL: (id: string) => `/surveys/${id}/`,
  ANSWER_QUESTION: (id: string) => `/surveys/${id}/answer/`,
  UNANSWERED_COUNT: '/surveys/unanswered-count/',

  // THANKS MESSAGES
  THANKS_MESSAGES_LIST: '/thanks-messages/',
  REMAINING_QUOTA: '/thanks-messages/remaining-quota',
  READ_THANKS_MESSAGE: '/thanks-messages/read/',

  // THANK MANAGEMENT
  LIST_MEMBER_THANKS_MSG: '/thanks-messages-management/members/',
  LIST_THANKS_DETAIL_HISTORY: '/thanks-messages-management/',
  DETAIL_THANK_MSG_HISTORY: (id: string) =>
    `/thanks-messages-management/${id} /`,

  // MVP
  MVP_VOTING_LIST: '/mvp-vote-management/',
  MVP_VOTING_DETAIL: (id: string) => `/mvp-vote-management/${id}/`,
  CURRENT_MVP_VOTING: '/mvp-vote/voting/',
  VOTE_MVP: '/mvp-vote/',
  VOTE_MVP_DETAIL: (id: string) => `/mvp-vote/${id}/`,
  MVP_ANNOUNCEMENT_LIST: '/mvp-vote/announcements/',
  MVP_ANNOUNCEMENT_DETAIL: '/mvp-vote/announcement-detail/',
  CURRENT_VOTING_COMMENT: '/mvp-vote/comment/',
  MVP_VOTE_COMMENTS: '/mvp-vote-management/vote-comments/',

  // DOT MONEY
  LOGIN_EXCHANGE: '/dotmoney/exchange-url/',

  // POINT HISTORY
  POINT_HISTORY: '/point-histories/',
  CURRENT_POINT: '/users/current-point/',

  // POINT MANAGEMENT
  COIN_STATUS: '/point-management/coins-status/',
  POINT_LIST: '/point-management/',

  // SHOP ITEM
  SHOP_ITEMS: '/shop-items/',

  // ITEM CUSTOMIZE
  LIST_ITEM_CUSTOMIZE: `/users/items/`,
};
