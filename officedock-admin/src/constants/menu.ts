import { MenuItem, SettingMenuItem } from '@interfaces/menu';
import { pageRouters } from './routers';

export const MENU_ITEMS: MenuItem[] = [
  {
    ...pageRouters.COMPANY_MANAGEMENT,
    name: pageRouters.COMPANY_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/company-active.svg' : '/icons/company.svg';
    },
    current: false,
  },
  {
    ...pageRouters.USERS_MANAGEMENT,
    name: pageRouters.USERS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/users-active.svg' : '/icons/users.svg';
    },
    current: false,
  },
  {
    ...pageRouters.TERMS_MANAGEMENT,
    name: pageRouters.TERMS_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/term-active.svg' : '/icons/term.svg';
    },
    current: false,
  },
  {
    ...pageRouters.POLICIES_MANAGEMENT,
    name: pageRouters.POLICIES_MANAGEMENT.name,
    iconUrl: (active: boolean) => {
      return active ? '/icons/policy-active.svg' : '/icons/policy.svg';
    },
    current: false,
  },
];

export const SETTING_MENU_ITEMS: SettingMenuItem[] = [
  {
    name: 'ログアウト',
    iconUrl: '/icons/logout.svg',
  },
];
