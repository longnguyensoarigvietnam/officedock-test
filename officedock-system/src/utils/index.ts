import { jwtDecode } from 'jwt-decode';

import { JwtDecode } from '@interfaces/auth';
import { Organizations } from '@interfaces/organization';
import { PASSWORD_REGEX } from '@constants/regex';
import { dataTaskDaily, dataTaskDailyTable } from '@interfaces/statistic';
import {
  EventWorkCategory,
  PermissionsSystem,
  PermissionType,
  ScreenAction,
  ScreenName,
} from '@constants/enums';
import { formatTime24h } from './date';
import { Task } from '@interfaces/task';
import { MAX_HEX_COLOR_VALUE } from '@constants';
import { OptionDropdownType } from '@interfaces/common';
import { UserRoleType } from '@interfaces/user';

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
export const adjustPositionForViewport = (
  position: { top: number; left: number },
  numberOfEvents: number,
) => {
  let { top, left } = position;
  const popupWidth = 250;
  let popupHeight = 300;
  switch (true) {
    case numberOfEvents >= 10:
      popupHeight = 600;
      break;
    case numberOfEvents > 5:
      popupHeight = 500;
      break;
    case numberOfEvents > 3:
      popupHeight = 400;
      break;
    default:
      popupHeight = 300;
      break;
  }
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
  action: string,
  permissionList: OptionDropdownType[],
): OptionDropdownType[] => {
  const isYesOrNo = (permission: OptionDropdownType) =>
    [PermissionType.ALLOWED, PermissionType.NOT_ALLOWED].includes(
      permission.label as PermissionType,
    );

  const excludePermissions = (excludedLabels: PermissionType[]) =>
    permissionList.filter(
      (permission) =>
        !excludedLabels.includes(permission.label as PermissionType),
    );

  const includePermissions = (includedLabel: PermissionType) =>
    permissionList.filter((permission) => permission.label === includedLabel);

  const commonExclusions = [
    PermissionType.ALLOWED_WITHOUT_OWN_DATA,
    PermissionType.ONLY_DATA_ORGANIZATION_WITHOUT_OWN_DATA,
  ];

  switch (action) {
    case ScreenAction.VIEW: {
      if (
        [
          ScreenName.USER,
          ScreenName.SKILL_MAP,
          ScreenName.SUBMIT_LEVEL,
        ].includes(screen)
      ) {
        return excludePermissions(commonExclusions);
      }
      if ([ScreenName.STATISTIC].includes(screen)) {
        return excludePermissions([
          ...commonExclusions,
          PermissionType.ALLOWED,
          PermissionType.ONLY_DATA_ORGANIZATION,
        ]);
      }
      return permissionList.filter(isYesOrNo);
    }

    case ScreenAction.ADD: {
      if (
        [
          ScreenName.CATEGORY_HIERARCHY,
          ScreenName.SKILL_MAP,
          ScreenName.ORGANIZATION_SKILL,
        ].includes(screen)
      ) {
        return excludePermissions([
          ...commonExclusions,
          PermissionType.ONLY_DATA_OWN,
        ]);
      }
      if (screen === ScreenName.STATISTIC) {
        return includePermissions(PermissionType.ONLY_DATA_OWN);
      }
      if (screen === ScreenName.SUBMIT_LEVEL) {
        return [];
      }
      return permissionList.filter(isYesOrNo);
    }

    case ScreenAction.UPDATE: {
      if (
        [
          ScreenName.CATEGORY_HIERARCHY,
          ScreenName.SKILL_MAP,
          ScreenName.ORGANIZATION_SKILL,
          ScreenName.USER,
        ].includes(screen)
      ) {
        return excludePermissions([
          ...commonExclusions,
          PermissionType.ONLY_DATA_OWN,
        ]);
      }
      if (screen === ScreenName.STATISTIC) {
        return includePermissions(PermissionType.ONLY_DATA_OWN);
      }
      if (screen === ScreenName.SUBMIT_LEVEL) {
        return excludePermissions([
          PermissionType.ALLOWED,
          PermissionType.ONLY_DATA_OWN,
          PermissionType.ONLY_DATA_ORGANIZATION,
        ]);
      }
      return permissionList.filter(isYesOrNo);
    }

    case ScreenAction.DELETE: {
      if (
        [
          ScreenName.USER,
          ScreenName.CATEGORY_HIERARCHY,
          ScreenName.SKILL_MAP,
          ScreenName.ORGANIZATION_SKILL,
        ].includes(screen)
      ) {
        return excludePermissions([
          ...commonExclusions,
          PermissionType.ONLY_DATA_OWN,
        ]);
      }
      if ([ScreenName.STATISTIC, ScreenName.SUBMIT_LEVEL].includes(screen)) {
        return [];
      }
      return permissionList.filter(isYesOrNo);
    }

    default:
      return [];
  }
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

export const getChatFileURL = (url: string) => {
  if (url && typeof url === 'string') {
    if (url.includes('https://') || url.includes('http://')) {
      return url;
    }
    return url;
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
        .join(''); // #abc -> #aabbcc
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const rgbToHex = ([r, g, b]: [number, number, number]): string =>
    `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  const mixWithWhite = (
    rgb: [number, number, number],
    percent: number,
  ): [number, number, number] =>
    rgb.map((c) =>
      Math.round(c * (percent / 100) + 255 * (1 - percent / 100)),
    ) as [number, number, number];

  return rgbToHex(mixWithWhite(hexToRgb(color || defaultColor), percent));
}
