import {
  ItemStartType,
  PermissionType,
  ReactionIconValue,
  TaskRepetitiveType,
  WorkItemType,
} from './enums';

// Define app name here for CSR
export const APP_NAME_METADATA = 'Office Dock';
export const PROVIDER_GOOGLE = 'google';

export const TOAST_DURATION = 3000;

export const PASSWORD_MIN_LENGTH = 8;

export const DATE_FORMAT = 'yyyy/MM/dd';
export const DATE_TEXT_FORMAT = 'yyyy年 MM月 dd日';
export const DATE_FORMAT_SERVER = 'yyyy-MM-dd';
export const DATE_TIME_FORMAT = 'yyyy/MM/dd/HH:mm';
export const TIME_COUNTER_FORMAT = 'HH:mm:ss';

export const DATE_TIME_LOCAL = 'yyyy-MM-dd HH:mm';
export const DATE_SCHEDULE_FORMAT = 'yyyy年 M月 d日 (E)';

export const NO_DATA_AVAILABLE = 'データが見つかりません。';
export const UNREGISTERED = '未設定';
export const NO_OPTIONS = 'データが見つかりません。';
export const NO_OPTIONS_CUSTOM = 'データがありません';

export const PAGINATION_PAGE_SIZE_DEFAULT = 5;

export const PAGINATION_PAGE_SIZE_SMALL = 10;

export const PAGINATION_PAGE_SIZE_MEDIUM = 20;

export const PAGINATION_PAGE_SIZE_HIGHT = 50;

export const PAGINATION_PAGE_SIZE_KANBAN = 30;

export const INITIAL_INDEX_VALUE = 0.01;
export const INITIAL_INDEX_VALUE_STEP = 10000;

export const COUNTDOWN_FOR_RESEND_OTP = 60;

export const TOTAL_SKILL_LEVELS = 3;

export const MESSAGE_DELETED = 'このメッセージが削除されました';

export const TASK_DELETED = 'タスクが削除されました';

export const EVENT_DELETED = 'が予定を削除しました。';

export const EVENT_CREATED = 'があなたに予定を割り振りしました。';

export const EVENT_EDITED = 'が予定を更新しました。';

export const EVENT_BEFORE_EDITED = '変更前の実施予定日時：';

export const CREATION_TASK_MESSAGE = 'タスクを追加しました。';

export const REMOVE_MEMBER_TASK_MESSAGE = '実施担当者から外れました。';

export const ADD_MEMBER_TASK_MESSAGE = 'タスクを追加しました。';

export const SKILL_UP_MESSAGE = 'さんが評価しました。';

export const DELETED_SKILL_UP_MESSAGE = '申請が削除されました。';

export const COPY_MESSAGE = 'コピー';

export const NO_SETTING = '未設定';

export const REIWA_START_YEAR = 2019;

export const DAY_NAMES_JAPANESE = ['日', '月', '火', '水', '木', '金', '土'];

export const MAX_HEX_COLOR_VALUE = 16777215;

export const DEFAULT_START_TIME = '00 : 00';

export const DEFAULT_END_TIME = '23 : 59';

export const SCREEN_LIST = [
  {
    name: 'マイタスク画面',
    value: 'myTask',
    show: false,
  },
  {
    name: 'カレンダー画面',
    value: 'calendar',
    show: false,
  },
  {
    name: 'チャット画面',
    value: 'chat',
    show: false,
  },
  {
    name: 'ユーザー画面',
    value: 'user',
    show: true,
  },
  {
    name: '組織画面',
    value: 'organization',
    show: true,
  },
  {
    name: '集計カテゴリ画面',
    value: 'category',
    show: true,
  },
  {
    name: 'スキル画面',
    value: 'skill',
    show: false,
  },
  {
    name: 'スキルマップ画面',
    value: 'skillMap',
    show: false,
  },
  {
    name: '組織_スキル画面',
    value: 'organizationSkill',
    show: false,
  },
  {
    name: '集計タグ画面',
    value: 'tag',
    show: true,
  },
  {
    name: '集計画面',
    value: 'statistic',
    show: false,
  },
  {
    name: '日報画面',
    value: 'dailyReport',
    show: false,
  },
  {
    name: 'レベルアップ申請確認画面',
    value: 'submitLevel',
    show: false,
  },
  {
    name: 'ロール画面',
    value: 'role',
    show: true,
  },
  {
    name: '実績管理画面',
    value: 'actualDuration',
    show: false,
  },
  {
    name: 'メンバー一覧画面',
    value: 'listMember',
    show: false,
  },
  {
    name: 'チームドック画面',
    value: 'teamdock',
    show: true,
  },
  {
    name: '日報一覧画面',
    value: 'teamDailyReport',
    show: true,
  },
];

export const PERMISSION_OPTIONS = [
  {
    label: PermissionType.VIEW_ONLY,
    value: PermissionType.VIEW_ONLY,
  },
  {
    label: PermissionType.EDITABLE,
    value: PermissionType.EDITABLE,
  },
  {
    label: PermissionType.TEAM_AND_SUB_EDIT,
    value: PermissionType.TEAM_AND_SUB_EDIT,
  },
  {
    label: PermissionType.TEAM_AND_SUB_VIEW,
    value: PermissionType.TEAM_AND_SUB_VIEW,
  },
  {
    label: PermissionType.NOT_ALLOWED,
    value: PermissionType.NOT_ALLOWED,
  },
  {
    label: PermissionType.ALL_TEAMS,
    value: PermissionType.ALL_TEAMS,
  },
  {
    label: PermissionType.TEAM_AND_SUB,
    value: PermissionType.TEAM_AND_SUB,
  },
];

export const TASK_AND_EVENT_OPTIONS = [
  {
    label: WorkItemType.Task,
    value: ItemStartType.TASK,
  },
  {
    label: WorkItemType.Event,
    value: ItemStartType.SCHEDULE,
  },
];

export const DEFAULT_TASK_SCHEDULE_DURATION = '0時間 0分';

export const NO_OPTION_CATEGORY = '未選択';

export const MY_TEMPLATE = 'マイテンプレート';

export const MENTION_ALL_MEMBERS = 'すべてのメンバー';

export const NO_EVENT_MEMBER = '特になし';

export const TASK_STARTING = 'タスク実行中';

export const BOOKMARK_ROUTER_NAME = 'bookmark';

export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

export const BATCH_FILE_SIZE = 15; // Maximum number of concurrent API calls

export const REACTION_LIST = [
  {
    name: 'OK',
    src: '/icons/ok-reaction.svg',
    value: ReactionIconValue.OK,
  },
  {
    name: 'LIKE',
    src: '/icons/like-reaction.svg',
    value: ReactionIconValue.LIKE,
  },
  {
    name: 'THANK',
    src: '/icons/thank-reaction.svg',
    value: ReactionIconValue.THANK,
  },
  {
    name: 'HAND',
    src: '/icons/hand-reaction.svg',
    value: ReactionIconValue.HAND,
  },
  {
    name: 'SMILE',
    src: '/icons/smile-reaction.svg',
    value: ReactionIconValue.SMILE,
  },
];
export const REACTION_LIST_SMALL = [
  {
    name: 'OK',
    src: '/icons/reaction-small/ok-reaction.svg',
    value: ReactionIconValue.OK,
  },
  {
    name: 'LIKE',
    src: '/icons/reaction-small/like-reaction.svg',
    value: ReactionIconValue.LIKE,
  },
  {
    name: 'THANK',
    src: '/icons/reaction-small/thank-reaction.svg',
    value: ReactionIconValue.THANK,
  },
  {
    name: 'HAND',
    src: '/icons/reaction-small/hand-reaction.svg',
    value: ReactionIconValue.HAND,
  },
  {
    name: 'SMILE',
    src: '/icons/reaction-small/smile-reaction.svg',
    value: ReactionIconValue.SMILE,
  },
];
export const PAGE_SIZE_OPTIONS = [
  {
    label: '10',
    value: 10,
  },
  {
    label: '20',
    value: 20,
  },
  {
    label: '30',
    value: 30,
  },
];

export const HIERARCHY_COLOR_LIST = [
  '#D7576A',
  '#F0865F',
  '#2E9267',
  '#2E9267',
  '#826AC4',
  '#FC8EA2',
  '#EDC45D',
  '#70CB7E',
  '#45AFD9',
  '#899FEB',
];

export const ALL_TEAMS_OPTION = 'すべてのチーム';

export const TASK_REPETITIVE_OPTIONS = [
  {
    label: TaskRepetitiveType.ONCE,
    value: 'ONCE',
  },
  {
    label: TaskRepetitiveType.DAILY,
    value: 'DAILY',
  },
  {
    label: TaskRepetitiveType.WEEKLY,
    value: 'WEEKLY',
  },
  {
    label: TaskRepetitiveType.MONTHLY,
    value: 'MONTHLY',
  },
  {
    label: TaskRepetitiveType.YEARLY,
    value: 'YEARLY',
  },
];

export const WEEKDAY_OPTIONS = [
  { label: '月', value: 0 },
  { label: '火', value: 1 },
  { label: '水', value: 2 },
  { label: '木', value: 3 },
  { label: '金', value: 4 },
  { label: '土', value: 5 },
  { label: '日', value: 6 },
];

export const DAY_OPTIONS: { label: string; value: number }[] = Array.from(
  { length: 31 },
  (_, i) => ({
    label: `${i + 1}`,
    value: i + 1,
  }),
);

export const MONTH_OPTIONS: { label: string; value: number }[] = Array.from(
  { length: 12 },
  (_, i) => ({
    label: `${i + 1}`,
    value: i + 1,
  }),
);

export const REPEAT_INTERVAL_OPTIONS: { label: string; value: number }[] =
  Array.from({ length: 10 }, (_, i) => ({
    label: `${i + 1}`,
    value: i + 1,
  }));
