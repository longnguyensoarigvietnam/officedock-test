import { jwtDecode } from 'jwt-decode';
import moment from 'moment';
import { format, isSameDay } from 'date-fns';

import {
  CalendarViewOptions,
  EventWorkCategory,
  PermissionsSystem,
  PermissionType,
  ScreenName,
  StatisticViewOptions,
  StatusTask,
  TaskRepetitiveValue,
} from '@constants/enums';
import { DATE_FORMAT, MAX_HEX_COLOR_VALUE, SKILL_MAP_STEPS } from '@constants';
import { PASSWORD_REGEX, URL_REGEX } from '@constants/regex';

import { JwtDecode } from '@interfaces/auth';
import { Organizations } from '@interfaces/organization';
import {
  dataTaskDaily,
  dataTaskDailyTable,
  ProgressDataType,
  StatisticCategoryInfo,
} from '@interfaces/statistic';
import {
  ResultTeam,
  StatusSummary,
  Task,
  TransformedUser,
  UserTotalStatus,
} from '@interfaces/task';
import { ChangeTextAreaProps, OptionDropdownType } from '@interfaces/common';
import { UserRoleType } from '@interfaces/user';
import { ChatMessageResponse } from '@interfaces/chat';

import {
  convertToTimeString,
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  formatTime24h,
  getJapaneseDayName,
  getJapaneseWeekDay,
  sumDurationsChart,
} from './date';

export function hasPermissionInArray(
  requiredPermissions: PermissionsSystem[],
  permission: PermissionsSystem,
): boolean {
  if (permission === PermissionsSystem.VIEW_ALL) {
    return true;
  }
  return requiredPermissions.includes(permission);
}

export const setLocalStorage = (key: string, values: any) => {
  localStorage.setItem(key, JSON.stringify(values));
};

export const decodeToken = (token: string): JwtDecode => {
  return jwtDecode(token);
};

// TODO: Update type for event in this function instead of any
export const handlePreventInputText = (e: any): void => {
  if (
    e.key === 'Backspace' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight'
  ) {
    return;
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === 'c' || e.key === 'v' || e.key === 'a')
  ) {
    return;
  }
  if (isNaN(Number(e.key)) || e.key === 'e') {
    e.preventDefault();
  }
};

export const handleRemoveText = (e: any): void => {
  setTimeout(() => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
  }, 0);
};

// Function find organization with id
const findOrganizationById = (
  organizations: Omit<Organizations, 'userCount'>[],
  id: number,
) => {
  return organizations.find((org) => org.id === id);
};

// Recursive function get all child organizations of this this organization
const getChildOrganization = (
  organizations: Omit<Organizations, 'userCount'>[],
  organization: Omit<Organizations, 'userCount'>,
  descendants: Omit<Organizations, 'userCount'>[] = [],
) => {
  organizations.forEach((item) => {
    if (item.superior && item.superior.id === organization.id) {
      descendants.push(item);
      getChildOrganization(organizations, item, descendants);
    }
  });
  return descendants;
};

// Function get all available Organization
export const getAllAvailableOrganization = (
  organizations: Omit<Organizations, 'userCount'>[],
  currentOrgId: number,
) => {
  const currentOrg = findOrganizationById(organizations, currentOrgId);
  if (currentOrg) {
    const descendants = getChildOrganization(organizations, currentOrg);
    const descendantIds = descendants.map((org) => org.id);
    return organizations.filter(
      (org) => org.id !== currentOrgId && !descendantIds.includes(org.id),
    );
  }
  return organizations;
};

export const handleSearchRegex = (value: string) => {
  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

  if (dateRegex.test(value)) {
    return value.replace(/\//g, '-');
  }

  return value.replace(/[￥,%]/g, '');
};

// Generate default password
export const generatePassword = (): string => {
  const length = 8;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+}{“:;’?/>.<,';

  // Function to get a random character from a given string
  function getRandomChar(str: string): string {
    return str[Math.floor(Math.random() * str.length)];
  }
  let password = '';
  // Ensure the password contains at least one character from each required set
  password += getRandomChar(lowercase);
  password += getRandomChar(uppercase);
  password += getRandomChar(numbers);
  password += getRandomChar(specialChars);

  // Fill the rest of the password length with random characters from all sets
  const allChars = lowercase + uppercase + numbers + specialChars;
  for (let i = password.length; i < length; i++) {
    password += getRandomChar(allChars);
  }

  // Shuffle the password to ensure randomness
  password = password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');

  // Check if the generated password matches the regex
  if (!PASSWORD_REGEX.test(password)) {
    return generatePassword(); // Recursively generate a new password if the current one doesn't match
  }
  return password;
};

// Trim unnecessary line breaks
export const trimUnnecessaryLineBreaks = (
  content: string | undefined | null,
) => {
  if (!content) {
    return '';
  }

  const withoutLineBreaks = content
    .replace(/<p><br><\/p>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .trim();

  const withoutExtraSpaces = withoutLineBreaks.replace(/\s\s+/g, ' ');

  return withoutExtraSpaces;
};
// Utility function for throttling
export const throttle = (func: (...args: any[]) => void, limit: number) => {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      func.apply(this, args);
      lastCall = now;
    }
  };
};
// Create uuid for chat
export function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function encodeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
export function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
// Split the input by new lines and wrap the parts in <p> tags
export function formatWithParagraphTags(
  content: string | null | undefined,
): string {
  if (!content) return '';
  const parts = content.split('\n').map((line, index) => {
    return index === 0 ? line : `<p>${line}</p>`;
  });

  return parts.join('');
}
// randomColor.ts
export function getColors(count: number): string[] {
  const generateRandomColor = () => {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return `#${randomColor.padStart(6, '0')}`;
  };

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(generateRandomColor());
  }
  return colors;
}
// Convert data daily

export function transformData(tasks: dataTaskDaily[]) {
  return tasks.map((task) =>
    task.categories.reduce(
      (acc, category) => {
        if (category.type === EventWorkCategory.SMALL) {
          acc.SMALL = acc.SMALL || [];
          acc.SMALL.push(category.name);
        }
        if (category.type === EventWorkCategory.MEDIUM) {
          acc.MEDIUM = acc.MEDIUM || [];
          acc.MEDIUM.push(category.name);
        }
        if (category.type === EventWorkCategory.LARGE) {
          acc.LARGE = acc.LARGE || [];
          acc.LARGE.push(category.name);
        }
        return acc;
      },
      { title: 'tr', SMALL: [], MEDIUM: [], LARGE: [] } as {
        title: string;
        SMALL: string[];
        MEDIUM: string[];
        LARGE: string[];
      },
    ),
  );
}

export function transformDataTaskDailyToTable(
  tasks: dataTaskDaily[],
): dataTaskDailyTable[] {
  return tasks.map((task) => {
    // Extract SMALL, MEDIUM, LARGE from categories based on their type
    const SMALL = task.categories.find(
      (cat) => cat.type === EventWorkCategory.SMALL,
    );

    const MEDIUM = task.categories.find(
      (cat) => cat.type === EventWorkCategory.MEDIUM,
    );
    const LARGE = task.categories.find(
      (cat) => cat.type === EventWorkCategory.LARGE,
    );

    // Map taskDurations to children array
    const children = task.taskDurations.map((duration) => ({
      id: task.id,
      idEdit: `${duration.id}`,
      title: task.title,
      SMALL: {
        id: SMALL ? SMALL?.id : '',
        name: SMALL ? SMALL?.name : '',
      },
      MEDIUM: {
        id: MEDIUM ? (MEDIUM?.id as number) : '',
        name: MEDIUM ? MEDIUM?.name : '',
      },
      LARGE: {
        id: LARGE ? (LARGE?.id as number) : '',
        name: LARGE ? LARGE?.name : '',
      },
      organization: task.organization,
      status: task.status,
      tags: task.tags as { id: number; name: string }[],
      type: task.type,
      todoList: task.todoList,
      totalDuration: duration.duration,
      startedAt: formatTime24h(duration.startedAt),
      isRunning: duration.pausedAt === null ? true : false,
      pausedAt: duration.pausedAt
        ? formatTime24h(duration.pausedAt)
        : formatTime24h(`${new Date()}`),
    }));

    // Get startedAt and pausedAt from the first child if it exists
    const startedAt = children[0]?.startedAt || undefined;
    const pausedAt = children[0]?.pausedAt || undefined;

    // Return the transformed dataTaskDailyTable object
    return {
      id: task.id,
      idEdit: `${task.taskDurations[0].id}`,
      title: task.title,
      SMALL: {
        id: SMALL ? SMALL?.id : '',
        name: SMALL ? SMALL?.name : '',
      },
      MEDIUM: {
        id: MEDIUM ? (MEDIUM?.id as number) : '',
        name: MEDIUM ? MEDIUM?.name : '',
      },
      LARGE: {
        id: LARGE ? (LARGE?.id as number) : '',
        name: LARGE ? LARGE?.name : '',
      },
      isRunning: task.taskDurations[0].pausedAt === null ? true : false,
      status: task.status,
      tags: task.tags as { id: number; name: string }[],
      taskDuration: task.totalDuration,
      children,
      type: task.type,
      organization: task.organization,
      todoList: task.todoList,
      totalDuration: task.totalDuration,
      startedAt, // Include startedAt
      pausedAt, // Include pausedAt
    };
  });
}
// Sort item when change status in kanban
export const compareItems = (first: Task, next: Task) => {
  if (first.pinAt && next.pinAt) {
    return new Date(next.pinAt).getTime() - new Date(first.pinAt).getTime();
  } else if (first.pinAt) {
    return -1;
  } else if (next.pinAt) {
    return 1;
  } else {
    if (first.index !== undefined && next.index !== undefined) {
      return next.index - first.index;
    } else if (first.index !== undefined) {
      return -1;
    } else if (next.index !== undefined) {
      return 1;
    } else {
      return first.id - next.id;
    }
  }
};
// Get random color
export function getRandomColor() {
  return `#${Math.floor(Math.random() * MAX_HEX_COLOR_VALUE)
    .toString(16)
    .padStart(6, '0')}`;
}
// Adjust position for view port
export const adjustPositionForViewportSchedule = (position: {
  top: number;
  left: number;
}) => {
  let { top, left } = position;
  const popupWidth = 250;
  const popupHeight = 170;

  const padding = 10;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  if (left + popupWidth + padding > viewportWidth) {
    left = viewportWidth - popupWidth - padding;
  }
  if (top + popupHeight + padding > viewportHeight) {
    top = viewportHeight - popupHeight - padding;
  }
  if (left < padding) {
    left = padding;
  }
  if (top < padding) {
    top = padding;
  }
  return { top, left };
};

export const getPermissionOptionDropdown = (
  screen: ScreenName,
  permissionList: OptionDropdownType[],
): OptionDropdownType[] => {
  const includePermissions = (includedLabels: PermissionType[]) =>
    permissionList.filter((permission) =>
      includedLabels.includes(permission.label as PermissionType),
    );

  if (
    [
      ScreenName.USER,
      ScreenName.ORGANIZATION,
      ScreenName.ORGANIZATION_HIERARCHY,
      ScreenName.SKILL,
    ].includes(screen)
  ) {
    return includePermissions([
      PermissionType.VIEW_ONLY,
      PermissionType.EDITABLE,
      PermissionType.NOT_ALLOWED,
    ]);
  }
  if ([ScreenName.ROLE, ScreenName.CALENDAR_MANAGEMENT].includes(screen)) {
    return includePermissions([
      PermissionType.EDITABLE,
      PermissionType.NOT_ALLOWED,
    ]);
  }
  if ([ScreenName.CATEGORY, ScreenName.TAG].includes(screen)) {
    return includePermissions([
      PermissionType.EDITABLE,
      PermissionType.TEAM_AND_SUB_EDIT,
      PermissionType.VIEW_ONLY,
      PermissionType.NOT_ALLOWED,
    ]);
  }
  if ([ScreenName.TEAM_DAILY_REPORT].includes(screen)) {
    return includePermissions([
      PermissionType.VIEW_ONLY,
      PermissionType.TEAM_AND_SUB_VIEW,
      PermissionType.NOT_ALLOWED,
    ]);
  }
  if ([ScreenName.TEAM_DOCK].includes(screen)) {
    return includePermissions([
      PermissionType.ALL_TEAMS,
      PermissionType.TEAM_AND_SUB,
    ]);
  }
  return includePermissions([
    PermissionType.VIEW_ONLY,
    PermissionType.EDITABLE,
    PermissionType.TEAM_AND_SUB_EDIT,
    PermissionType.TEAM_AND_SUB_VIEW,
    PermissionType.NOT_ALLOWED,
  ]);
};

export const showBackgroundColorByTime = (hour: number) => {
  let colorClassName = '';

  switch (true) {
    case hour >= 6 && hour < 11:
      colorClassName =
        'linear-gradient(to bottom, rgba(149, 200, 233, 1), rgba(166, 224, 219, 1))';
      break;
    case hour >= 11 && hour < 15:
      colorClassName =
        'linear-gradient(to bottom, rgba(105, 182, 220, 1), rgba(168, 225, 246, 1))';
      break;
    case hour >= 15 && hour < 18:
      colorClassName =
        'linear-gradient(to bottom, rgba(204, 193, 215, 1), rgba(236, 199, 190, 1))';
      break;
    default:
      colorClassName =
        'linear-gradient(to bottom, rgba(121, 136, 174, 1), rgba(169, 152, 194, 1))';
  }
  return colorClassName;
};

export const showToggleButtonColorByTime = () => {
  const hourStr = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());

  const hour = Number(hourStr.substring(0, hourStr.length - 1));
  let colorClassName = '';
  switch (true) {
    case hour >= 6 && hour < 11:
      colorClassName = '#5991b6';
      break;
    case hour >= 11 && hour < 15:
      colorClassName = '#3083ac';
      break;
    case hour >= 15 && hour < 18:
      colorClassName = '#B08AD6';
      break;
    default:
      colorClassName = '#5972AB';
  }
  return colorClassName;
};

export const showModalHeaderBackgroundColorByTime = () => {
  const hourStr = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());

  const hour = Number(hourStr.substring(0, hourStr.length - 1));
  let colorClassName = '';

  switch (true) {
    case hour >= 6 && hour < 11:
      colorClassName = '#95c8e9';
      break;
    case hour >= 11 && hour < 15:
      colorClassName = '#68b6dc';
      break;
    case hour >= 15 && hour < 18:
      colorClassName = '#ccc1d7';
      break;
    default:
      colorClassName = '#7988ae';
  }
  return colorClassName;
};
export function generateOptionsCount(
  inputNumber: number,
): OptionDropdownType[] {
  if (inputNumber <= 0) return [];

  return Array.from({ length: inputNumber }, (_, index) => ({
    label: (index + 1).toString(),
    value: index + 1,
  }));
}
// Check has role need
export function hasRole(roles: UserRoleType[], roleName: string): boolean {
  return roles.some((role) => role.name === roleName);
}

export const getFileURL = (url: string) => {
  if (url && typeof url === 'string') {
    if (url.includes('https://') || url.includes('http://')) {
      return url;
    }
    return process.env.NEXT_PUBLIC_API_URL + url;
  }
  return '';
};
//Calculate duration percentage
export const calculateDurationPercentage = (
  firstDuration: string,
  secondDuration: string,
) => {
  // Convert "HH:MM:SS" to total seconds
  const timeToSeconds = (time: string) => {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const firstSeconds = timeToSeconds(firstDuration);
  const secondSeconds = timeToSeconds(secondDuration);

  if (secondSeconds === 0) {
    return '';
  }

  const percentage = (firstSeconds / secondSeconds) * 100;

  return `${Math.ceil(percentage)}%`;
};

// Opacity color follow percent
export function lightenColor(color: string | null, percent: number): string {
  const defaultColor = '#2E9267';

  const hexToRgb = (hex: string): [number, number, number] => {
    hex = (hex || defaultColor).replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((x) => x + x)
        .join('');
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const rgbToHex = ([r, g, b]: [number, number, number]): string =>
    `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  const adjustBrightness = (percent: number): number => {
    return 100 - (100 - percent) / 2;
  };

  const mixWithWhite = (
    rgb: [number, number, number],
    percent: number,
  ): [number, number, number] =>
    rgb.map((c) =>
      Math.round(
        c * (adjustBrightness(percent) / 100) +
          255 * (1 - adjustBrightness(percent) / 100),
      ),
    ) as [number, number, number];

  return rgbToHex(mixWithWhite(hexToRgb(color || defaultColor), percent));
}

// Transform data team task
export function transformDataTeamTask(result: ResultTeam[]): TransformedUser[] {
  return result.map((user) => ({
    id: `user_${user.id}`,
    avatarColor: user.avatarColor,
    avatar: user?.avatar || '',
    name: user.profile.fullName,
    statuses: {
      NOT_STARTED:
        user.status
          .find((status) => status.id === 1)
          ?.tasks.map((task) => ({
            ...task,
          })) || [],
      IN_PROGRESS:
        user.status
          .find((status) => status.id === 2)
          ?.tasks.map((task) => ({
            ...task,
          })) || [],
      CONFIRMING:
        user.status
          .find((status) => status.id === 3)
          ?.tasks.map((task) => ({
            ...task,
          })) || [],
      COMPLETED:
        user.status
          .find((status) => status.id === 4)
          ?.tasks.map((task) => ({
            ...task,
          })) || [],
    },
  }));
}
// Transformer data total status
export const transformDataTotalStatus = (
  data: ResultTeam[],
): UserTotalStatus[] => {
  return data.map((user) => ({
    id: `user_${user.id}`,
    fullName: user.profile.fullName,
    statuses: user.status.map((status) => ({
      name: status.name,
      total: status.total,
      hasNext: status.hasNext,
    })),
  }));
};

// Convert data total status
export const findStatusTeamByUser = (
  users: UserTotalStatus[],
  userId: string,
  status: keyof typeof StatusTask,
): StatusSummary | undefined => {
  const user = users.find((user) => user.id === userId);
  return user?.statuses.find((s) => s.name === StatusTask[status]);
};

// Get chunk size
export const getChunkSize = (size: number) => {
  if (size < 20 * 1024 * 1024) return 1024 * 1024; // 1MB chunks
  if (size < 1024 * 1024 * 1024) return 10 * 1024 * 1024; // 10MB chunks
  return 25 * 1024 * 1024; // 25MB chunks
};

// Get enable views by diff days
const getEnableViewsByDiffDays = (diffDays: number): StatisticViewOptions[] => {
  switch (true) {
    case diffDays >= 1 && diffDays <= 7:
      return [StatisticViewOptions.DAY];
    case diffDays <= 29:
      return [StatisticViewOptions.DAY, StatisticViewOptions.WEEK];
    case diffDays <= 59:
      return [StatisticViewOptions.WEEK];
    case diffDays <= 120:
      return [StatisticViewOptions.WEEK, StatisticViewOptions.MONTH];
    case diffDays <= 365:
      return [StatisticViewOptions.MONTH];
    default:
      return [];
  }
};

// Get line chart enable views
export const getLineChartEnableViews = (start: Date, end: Date) => {
  const diffDays = moment(end).diff(moment(start), 'days') + 1;

  return getEnableViewsByDiffDays(diffDays);
};

// Get compare line chart enable views
export const getCompareLineChartEnableViews = (
  start: Date,
  end: Date,
  compareStart: Date,
  compareEnd: Date,
): StatisticViewOptions[] => {
  const standardDiffDays = moment(end).diff(moment(start), 'days') + 1;
  const compareDiffDays =
    moment(compareEnd).diff(moment(compareStart), 'days') + 1;

  const standardViews = getEnableViewsByDiffDays(standardDiffDays);
  const compareViews = getEnableViewsByDiffDays(compareDiffDays);

  const mutualViews = standardViews.filter((view) =>
    compareViews.includes(view),
  );

  if (mutualViews.length > 0) return mutualViews;
  const viewPriority = [
    StatisticViewOptions.DAY,
    StatisticViewOptions.WEEK,
    StatisticViewOptions.MONTH,
  ];

  // Return the lower view by priority
  for (const view of viewPriority) {
    if (standardViews.includes(view) || compareViews.includes(view)) {
      return [view];
    }
  }

  return [];
};
// Get step with object
export function getSkillStep(step: string) {
  const match = step.match(/(?:レベル|ステップ)(\d)/);
  if (!match) return null;

  const stepIndex = parseInt(match[1], 10) - 1;
  return SKILL_MAP_STEPS[stepIndex] || null;
}
// Get level number
export function extractLevelNumber(input: string): number | null {
  const match = input.match(/レベル(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}
// Get step number
export function extractStepNumber(step: string): number {
  const match = step.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}
// Get last character
export const getLastChar = (str: string): string => {
  return str.charAt(str.length - 1);
};
// Convert time to hour string
export function timeStringToHours(timeStr: string): number {
  if (!timeStr) return 0;

  const parts: string[] = timeStr.split(':');
  if (parts.length !== 3) return 0;

  const [hoursStr, _minutesStr, _secondsStr] = parts;
  const hours: number = parseInt(hoursStr, 10);

  if (isNaN(hours)) return 0;

  return hours;
}
// Convert time to second
export function timeStringToSeconds(time: string): number {
  const [hh, mm, ss] = time.split(':').map(Number);
  return hh * 3600 + mm * 60 + ss;
}
// Convert second to string
export function secondsToTimeString(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

// Calculate total
export function calculateTotalMinutes(
  startedAt: string,
  pausedAt: string,
): number {
  const startDate = new Date(startedAt);
  const pauseDate = new Date(pausedAt);

  const diffMs = pauseDate.getTime() - startDate.getTime(); // milliseconds
  const diffMinutes = Math.floor(diffMs / (1000 * 60)); // convert to minutes

  return diffMinutes;
}

// Calculate popup position
export const calculatePopupPosition = (data: {
  calendarView?: CalendarViewOptions;
  popupRect: DOMRect;
  currentPosition: {
    top: number;
    left: number;
  };
  padding: number;
}): {
  top: number;
  left: number;
} => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let newTop = data.currentPosition.top;
  let newLeft = data.currentPosition.left;

  // Flip upward if bottom overflows
  if (data.popupRect.bottom + data.padding > viewportHeight) {
    newTop =
      data.calendarView == CalendarViewOptions.VIEW_BY_YEAR
        ? data.currentPosition.top - 200 - data.padding
        : data.currentPosition.top - data.popupRect.height - data.padding;
  }

  // Push left if right overflows
  if (data.popupRect.right + data.padding > viewportWidth) {
    newLeft =
      data.currentPosition.left -
      (data.popupRect.right + data.padding - viewportWidth);
  }

  // Push right if left overflows
  if (data.popupRect.left - data.padding < 0) {
    newLeft = data.currentPosition.left + (data.padding - data.popupRect.left);
  }

  return { top: newTop, left: newLeft };
};

// Render event datetime in chat
export const renderEventDatetimeInChat = (
  eventInfo:
    | {
        endDate?: Date | string;
        startDate?: Date | string;
        repeatType?: string | null;
        repeatInterval?: number | null;
        monthDay?: number | null;
        month?: number | null;
        weekDay?: number | null;
      }
    | undefined,
) => {
  if (!eventInfo || !eventInfo.startDate) return '';

  const startDate = eventInfo.startDate;
  const endDate = eventInfo?.endDate || null;

  const isSameDay =
    endDate && format(startDate, DATE_FORMAT) === format(endDate, DATE_FORMAT);

  const startDateStr = `${format(startDate, DATE_FORMAT)}(${getJapaneseDayName(
    startDate as string,
  )}) ${convertToTimeString(startDate as string)}`;
  const endDateStr = endDate
    ? `${!isSameDay ? `${format(endDate, DATE_FORMAT)}(${getJapaneseDayName(endDate as string)}) ` : ''}${convertToTimeString(endDate as string)}`
    : '';

  return `${startDateStr} ~ ${endDateStr}`;
};

// Render schedule date in chat (calendar room)
export const renderScheduleChangeInCalendarRoom = (
  messageDetail: ChatMessageResponse,
): string => {
  const start = messageDetail.scheduleChanges?.new?.startDate;
  const end = messageDetail.scheduleChanges?.new?.endDate;
  const isAllDay = messageDetail.schedule?.isAllDay;

  if (!start || !end) return '';

  const sameDay = isSameDay(new Date(start), new Date(end));

  if (sameDay) {
    const base = `${formatShowDeadline(start)} `;
    return isAllDay
      ? `${base}終日`
      : `${base}${formatHoursAndMinutesForDateTime(new Date(start))} ~ ${formatHoursAndMinutesForDateTime(new Date(end))}`;
  } else {
    if (isAllDay) {
      return `${formatShowDeadline(start)} ~ ${formatShowDeadline(end)} 終日`;
    } else {
      return `${formatShowDeadline(start)} ${formatHoursAndMinutesForDateTime(new Date(start))} ~ ${formatShowDeadline(end)} ${formatHoursAndMinutesForDateTime(new Date(end))}`;
    }
  }
};

// Render repetitive event time in chat
export const displayRepetitiveEventTime = (eventInfo: {
  endDate?: Date | string;
  startDate?: Date | string;
  repeatType?: string | null;
  repeatInterval?: number | null;
  monthDay?: number | null;
  month?: number | null;
  weekDay?: number | null;
}) => {
  let title = '';
  const repeatStartTime = eventInfo.startDate
    ? formatHoursAndMinutesForDateTime(new Date(eventInfo.startDate))
    : '';
  const repeatEndTime = eventInfo.endDate
    ? formatHoursAndMinutesForDateTime(new Date(eventInfo.endDate))
    : '';
  switch (eventInfo?.repeatType as string) {
    case TaskRepetitiveValue.DAILY:
      title = '毎日' + repeatStartTime + '~' + repeatEndTime;
      break;
    case TaskRepetitiveValue.WEEKLY:
      title =
        '毎週' +
        getJapaneseWeekDay(Number(eventInfo.weekDay || 0)) +
        '曜日' +
        repeatStartTime +
        '~' +
        repeatEndTime;
      break;
    case TaskRepetitiveValue.MONTHLY:
      title =
        '毎月' +
        eventInfo.monthDay +
        '日' +
        repeatStartTime +
        '~' +
        repeatEndTime;
      break;
    case TaskRepetitiveValue.YEARLY:
      title =
        '毎年' +
        eventInfo.month +
        '月' +
        eventInfo.monthDay +
        '日' +
        repeatStartTime +
        '~' +
        repeatEndTime;
      break;
  }
  return title;
};
// Get avatar icon svg in line chart
export const getAvatarIconSvg = (color: string, size: number) => {
  const clipId = `clip-${Math.random()}`; // unique clipId
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 ${size} ${size}"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Circle background -->
      <rect width="${size}" height="${size}" rx="${size / 2}" fill="${color}" />
      <!-- Define a circular clipPath -->
      <defs>
        <clipPath id="${clipId}">
          <rect width="${size}" height="${size}" rx="${size / 2}" />
        </clipPath>
      </defs>
      <!-- Group clipped by the circular path -->
      <g clip-path="url(#${clipId})">
        <!-- Bottom rectangle (mouth?) -->
        <rect
          x="${size * 0.19}"
          y="${size * 0.57}"
          width="${size * 0.62}"
          height="${size * 0.62}"
          rx="${size * 0.31}"
          fill="#F3F3F3"
        />
        <!-- Top rectangle -->
        <rect
          x="${size * 0.33}"
          y="${size * 0.17}"
          width="${size * 0.33}"
          height="${size * 0.33}"
          rx="${size * 0.17}"
          fill="#F3F3F3"
        />
      </g>
    </svg>
  `;
};

// Create styled avatar with margin
export const createStyledAvatarWithMargin = (
  url: string,
  displaySize = 24,
  marginRight = 0,
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const scale = window.devicePixelRatio || 1;
    const totalWidth = displaySize + marginRight;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * scale;
      canvas.height = displaySize * scale;
      canvas.style.width = `${totalWidth}px`;
      canvas.style.height = `${displaySize}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context not found');

      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw circular mask
      ctx.beginPath();
      ctx.arc(
        displaySize / 2,
        displaySize / 2,
        displaySize / 2,
        0,
        Math.PI * 2,
      );
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, displaySize, displaySize);

      // Calculate center crop
      const { width: imgW, height: imgH } = img;
      const side = Math.min(imgW, imgH);
      const sx = (imgW - side) / 2;
      const sy = (imgH - side) / 2;

      // Draw square crop centered in canvas
      ctx.drawImage(img, sx, sy, side, side, 0, 0, displaySize, displaySize);

      // Optional border
      ctx.beginPath();
      ctx.arc(
        displaySize / 2,
        displaySize / 2,
        displaySize / 2 - 0.5,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      resolve(canvas);
    };

    img.src = url.startsWith('blob')
      ? url
      : `/api/image-proxy?url=${encodeURIComponent(url)}`;
  });
};

// Helper to convert hex or rgb to rgba with custom alpha
export const toRGBA = (color: string, alpha: number): string => {
  if (color.startsWith('#')) {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }

  if (color.startsWith('rgba(')) {
    return color.replace(
      /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
      `rgba($1,$2,$3,${alpha})`,
    );
  }

  // fallback to original if format unknown
  return color;
};

const placeCaretAtEnd = (el: HTMLElement) => {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

export const changeTextAreaFormatLink = ({
  editorRef,
  onChange,
}: ChangeTextAreaProps) => {
  const div = editorRef.current;
  if (!div) return;

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;

  // Only process if on text node
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent || '';

    let match;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    while ((match = URL_REGEX.exec(text)) !== null) {
      const beforeText = text.slice(lastIndex, match.index);
      const linkText = match[0];

      if (beforeText) {
        frag.appendChild(document.createTextNode(beforeText));
      }

      const a = document.createElement('a');
      a.href = linkText;
      a.textContent = linkText;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.color = 'blue';
      a.style.cursor = 'pointer';
      a.style.textDecoration = 'underline';
      frag.appendChild(a);

      frag.appendChild(document.createTextNode(' ')); // Add space

      lastIndex = match.index + linkText.length;
    }

    const afterText = text.slice(lastIndex);
    if (afterText) {
      frag.appendChild(document.createTextNode(afterText));
    }

    const parent = container.parentNode;
    if (parent) {
      parent.replaceChild(frag, container);
    }

    placeCaretAtEnd(div);
  }

  // Return new content
  onChange?.(div.innerHTML);
};
export const convertLinksToHTML = (text: string) => {
  return text.replace(URL_REGEX, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: blue; text-decoration: underline; cursor: pointer;">${url}</a>`;
  });
};

export const getSafeTooltipLeft = ({
  offsetLeft,
  caretX,
  tooltipWidth,
  padding = 10,
}: {
  offsetLeft: number;
  caretX: number;
  tooltipWidth: number;
  padding?: number;
}): number => {
  // Center tooltip over caretX
  let left = offsetLeft + caretX - tooltipWidth / 2;

  // Clamp left within screen boundaries
  const maxLeft = window.innerWidth - tooltipWidth - padding;
  if (left < padding) {
    left = padding;
  } else if (left > maxLeft) {
    left = maxLeft;
  }

  return left;
};

export const mapStatisticCategoryInfoToProgressData = ({
  data,
  mergeLabel = 'その他',
  mergeColor = '#83919E',
  threshold = 10,
  colorData,
}: {
  data: StatisticCategoryInfo[];
  mergeLabel?: string;
  mergeColor?: string;
  threshold?: number;
  colorData?: string;
}): {
  finalData: ProgressDataType[];
} => {
  const progressData: ProgressDataType[] = data.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.percent,
    color:
      item.categoryColor ||
      (colorData && lightenColor(colorData, item.percent)) ||
      '',
    duration: item.duration,
    optionData: item.tasks.slice(0, 3).map((task) => task.title),
    organizationId: String(item.organizationId),
  }));

  const mergedItems = progressData.filter((item) => item.value < threshold);
  const mainItems = progressData.filter((item) => item.value >= threshold);

  if (mergedItems.length === 0) {
    return {
      finalData: mainItems,
    };
  }

  const totalMergedPercent = mergedItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const durations = mergedItems.map((item) => item.duration);

  const totalDuration = sumDurationsChart(durations);

  const mergedItem: ProgressDataType = {
    id: -1,
    label: mergeLabel,
    value: totalMergedPercent,
    color: mergeColor,
    duration: totalDuration,
    optionData: mergedItems.flatMap((item) => item.optionData),
    mergedItems,
  };

  return {
    finalData: [...mainItems, mergedItem],
  };
};
// Parse to ISO Date locally
export function parseISODateLocally(str: string): Date {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-based
}
// Format date to YMD format
export function formatDateToYMDFormat(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
// Get statistic milestones
export function getStatisticMilestones(
  fromDate: string,
  endDate: string,
  statisticBy: 'DAY' | 'WEEK' | 'MONTH',
): string[] {
  const result: string[] = [];

  const start = parseISODateLocally(fromDate);
  const end = parseISODateLocally(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  result.push(formatDateToYMDFormat(start));

  const current = new Date(start);

  while (true) {
    if (statisticBy === 'DAY') {
      current.setDate(current.getDate() + 1);
    } else if (statisticBy === 'WEEK') {
      const day = current.getDay();
      const daysUntilNextMonday = (8 - day) % 7 || 7;
      current.setDate(current.getDate() + daysUntilNextMonday);
    } else if (statisticBy === 'MONTH') {
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    if (current > end) break;

    result.push(formatDateToYMDFormat(current));
  }

  const formattedEnd = formatDateToYMDFormat(end);
  if (result[result.length - 1] !== formattedEnd) {
    result.push(formattedEnd);
  }

  return result;
}

export const createLineChartAvatarImage = async (user: {
  id: number;
  fullName: string;
  avatarColor: string;
  avatar: string | null;
}) => {
  let avatarUrl = '';

  if (user?.avatar) {
    avatarUrl = getFileURL(user?.avatar);
  } else {
    const svgString = getAvatarIconSvg(user?.avatarColor || getRandomColor(), 24);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    avatarUrl = URL.createObjectURL(blob);
  }

  return await createStyledAvatarWithMargin(avatarUrl, 24, 30);
};
