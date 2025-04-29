import { PermissionsSystem } from '@constants/enums';

export interface MenuItem {
  name: string;
  href: string;
  iconUrl?: (active: boolean) => string;
  current: boolean;
  notification?: number;
  hasNotification?: boolean;
  children?: MenuItem[];
  companyMenu?: boolean;
  requiredPermission: PermissionsSystem;
}

export interface SettingMenuItem {
  name: string;
  href?: string;
  iconUrl?: string;
  showModal?: boolean;
}
