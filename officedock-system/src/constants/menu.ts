import { MenuItem, MyPageMenuItem, SettingMenuItem } from '@interfaces/menu';
import { pageRouters } from './routers';
import { PermissionsSystem } from './enums';

export const SETTING_MENU: SettingMenuItem[] = [
  {
    name: 'プロフィール',
    showModal: true,
  },
  {
    name: '設定',
    href: pageRouters.SETTING.href,
    disable: true,
  },
  {
    name: 'ログアウト',
    iconUrl: '/icons/logout.svg',
  },
];

export const SYSTEM_PERMISSIONS_MENU: MenuItem[] = [
  {
    ...pageRouters.USERS_MANAGEMENT,
    name: pageRouters.USERS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/users.svg' : '/icons/users.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.USER_VIEW,
  },
  {
    ...pageRouters.ROLES_MANAGEMENT,
    name: pageRouters.ROLES_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/role.svg' : '/icons/role.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.ROLE_VIEW,
  },
  {
    ...pageRouters.ORGANIZATION_MANAGEMENT,
    name: pageRouters.ORGANIZATION_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/organizations.svg' : '/icons/organizations.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.ORGANIZATION_VIEW,
  },
  {
    ...pageRouters.CATEGORY_MANAGEMENT,
    name: pageRouters.CATEGORY_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/skill.svg' : '/icons/skill.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.CATEGORY_VIEW,
  },
  {
    ...pageRouters.SKILL_MAPS_MANAGEMENT,
    name: pageRouters.SKILL_MAPS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/skills-map.svg' : '/icons/skills-map.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.SKILL_MAP_MANAGEMENT_VIEW,
  },
  {
    ...pageRouters.TAGS_MANAGEMENT,
    name: pageRouters.TAGS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/tags.svg' : '/icons/tags.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.TAG_VIEW,
  },
  {
    ...pageRouters.ACTUAL_DURATIONS_MANAGEMENT,
    name: pageRouters.ACTUAL_DURATIONS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/measurements.svg' : '/icons/measurements.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.ACTUAL_DURATION_VIEW,
  },
  {
    ...pageRouters.TASKS_MANAGEMENT,
    name: pageRouters.TASKS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/task-active.svg' : '/icons/task.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.MY_TASK_VIEW,
  },
  {
    ...pageRouters.CALENDAR_MANAGEMENT,
    name: pageRouters.CALENDAR_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active
        ? '/icons/calendar-menu-active.svg'
        : '/icons/calendar-menu.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.CALENDAR_VIEW,
  },
  {
    ...pageRouters.CHAT_MANAGEMENT,
    name: pageRouters.CHAT_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/chat-active.svg' : '/icons/chat.svg';
    },
    hasNotification: true,
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.CHAT_VIEW,
  },
  {
    ...pageRouters.STATISTIC_MANAGEMENT,
    name: pageRouters.STATISTIC_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/statistic-active.svg' : '/icons/statistic.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.STATISTIC_VIEW,
  },
  {
    ...pageRouters.DAILY_REPORT_MANAGEMENT,
    name: pageRouters.DAILY_REPORT_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active
        ? '/icons/daily-report-active.svg'
        : '/icons/daily-report.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.DAILY_REPORT_VIEW,
  },
  {
    ...pageRouters.SKILL_MAP,
    name: pageRouters.SKILL_MAP.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/skill-room.svg' : '/icons/skill-map.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.MY_DOCK_SKILL_MAP_VIEW,
  },
  {
    ...pageRouters.MEMBER_MANAGEMENT,
    name: pageRouters.MEMBER_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/team-active.svg' : '/icons/team.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.LIST_MEMBER_VIEW,
  },
  {
    ...pageRouters.LOCATION_MANAGEMENT,
    name: pageRouters.LOCATION_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/team-active.svg' : '/icons/team.svg';
    },
    current: false,
    companyMenu: true,
    requiredPermission: PermissionsSystem.CALENDAR_MANAGEMENT_VIEW,
  },
  {
    ...pageRouters.MY_PAGE,
    name: pageRouters.MY_PAGE.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/skills-map-active.svg' : '/icons/skills-map.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.VIEW_ALL,
  },
];
export const SYSTEM_PERMISSIONS_MENU_TEAM: MenuItem[] = [
  {
    ...pageRouters.TASKS_TEAM_MANAGEMENT,
    name: pageRouters.TASKS_TEAM_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/task-active.svg' : '/icons/task.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.TEAMDOCK_VIEW,
  },
  {
    ...pageRouters.STATISTIC_TEAM_MANAGEMENT,
    name: pageRouters.STATISTIC_TEAM_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/statistic-active.svg' : '/icons/statistic.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.TEAMDOCK_VIEW,
  },
  {
    ...pageRouters.DAILY_REPORT_TEAM,
    name: pageRouters.DAILY_REPORT_TEAM.name,
    iconUrl: (active: boolean) => {
      return active
        ? '/icons/daily-report-active.svg'
        : '/icons/daily-report.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.TEAM_DAILY_REPORT_VIEW,
  },
  {
    ...pageRouters.MEMBER_MANAGEMENT,
    name: pageRouters.MEMBER_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/team-active.svg' : '/icons/team.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.LIST_MEMBER_VIEW,
  },
  {
    ...pageRouters.SKILL_MAP_TEAM,
    name: pageRouters.SKILL_MAP_TEAM.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/skill-room.svg' : '/icons/skill-map.svg';
    },
    current: false,
    companyMenu: false,
    requiredPermission: PermissionsSystem.TEAM_DOCK_SKILL_MAP_VIEW,
  },
];

export const MY_PAGE_MENU: MyPageMenuItem[] = [
  {
    name: 'サンクス メッセージ',
    href: '/',
    iconSrc: '/icons/heart.svg',
    iconName: "Heart icon"
  },
  {
    name: '他の人の部屋へ 出かける',
    href: '/',
    iconSrc: '/icons/room-profile.svg',
    iconName: "Room icon"
  },
  {
    name: 'アンケート',
    href: '/',
    iconSrc: '/icons/question.svg',
    iconName: "Question icon",
  },
  {
    name: 'MVP',
    href: '/',
    iconSrc: '/icons/mvp.svg',
    iconName: "MVP icon"
  },
  {
    name: 'アイテム',
    href: '/',
    iconSrc: '/icons/shop.svg',
    iconName: "Shop icon"
  },
];
