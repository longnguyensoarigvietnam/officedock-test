import { AuthenticationTypes, PermissionsSystem } from '@constants/enums';
import { OptionDropdownType } from './common';
import { Company } from './company';
import { Organizations } from './organization';
import { ReactNode } from 'react';

export interface TermsStep {
  id?: number;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  title?: string;
  type?: string;
  description?: ReactNode;
  isAccepted?: boolean;
}
export interface UserAuth {
  id: number;
  email: string;
  password: string;
  authenticationType: AuthenticationTypes;
  profile: Profile;
  permissions: PermissionsSystem[];
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  unreadTerms?: TermsStep[] | [];
}

export interface UserRoleType {
  id: number;
  name: string;
  systemRole: boolean;
}

export interface User {
  id: number;
  loginType: string;
  username: string;
  email: string;
  avatarColor: string;
  currentEvent?: {
    id: number;
    title: string;
    type: string;
  };
  twoFactorAuthEmail: string;
  roles: UserRoleType[];
  profile: Profile;
  fullName: string;
  company: Company;
  organizations: Organizations[];
  isTwoFactorAuth: boolean;
  isEnterSendMessage?: boolean;
  avatar?: string;
  setting?: {
    isCheckSelfTask?: boolean;
    isCheckSelfSchedule?: boolean;
    isCheckCompanySchedule?: boolean;
    isEnterSendMessage?: boolean;
    isSortingTaskByDeadline?: boolean;
    isSortingTaskByImportant?: boolean;
    scheduleZoom?: number;
    kanbanZoom?: number;
    tabVisibility?: Record<string, boolean>;
    isShowMyTemplate?: boolean;
    isShowListKanban?: boolean;
    dateFilterScheduleFrom?: string;
    dateFilterScheduleTo?: string;
    isShowWeekSchedule?: boolean;
    taskFilter?: {
      category: OptionDropdownType[];
      organization: OptionDropdownType[];
      tag: OptionDropdownType[];
    };
  };
  actions?: {
    update: boolean;
    delete: boolean;
  };
  createdAt?: Date | string;
}

export interface Profile {
  id: number;
  fullName: string;
  birthday: string;
  avatarColor: string;
  avatar?: string;
  gender: string;
  organizations?: {
    id: number;
    name: string;
  } | null;
}

export interface CreateUserFormRequest {
  username?: string;
  email?: string;
  twoFactorAuthEmail?: string;
  loginType: string;
  profile: {
    fullName: string;
  };
  organizationIds: { organizationId: number | string; isMain: boolean }[];
  roleIds: number[];
  isTwoFactorAuth: boolean;
  password?: string | null;
}

export interface CreateUserFormData {
  username: string;
  name: string;
  email: string;
  twoFactorAuthEmailRequired: string;
  twoFactorAuthEmail: string;
  password: string;
  organizations: OptionDropdownType[];
  mainOrganization?: OptionDropdownType;
  roles: OptionDropdownType[];
  isTwoFactorAuth: boolean;
}

export interface RoleUser {
  id: number;
  name: string;
}

export interface UserFilterFormData {
  companyName?: string;
  fullName?: string;
  organizationName?: string;
  role?: OptionDropdownType;
}
export interface MemoDetailData {
  content: string;
  isOpen: boolean;
}
export interface UserOrganization {
  id: number;
  name: string;
  users: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  }[];
}
export interface UserProfileFormData {
  id?: number;
  avatar: File | null;
  email: string;
  password: string | null;
  fullName: string;
  username: string;
  avatarUrl?: string;
}
export interface UserProfileFormRequest {
  id?: number;
  avatar: File | null;
  password: string | null;
  profile: {
    fullName: string;
  };
}
export interface Staff {
  id: number;
  username: string;
  email: string;
  twoFactorAuthEmail: string;
  profile: Profile;
  loginType: string;
  avatar?: string;
  avatarColor: string;
}
export interface UserProfile {
  id: number;
  fullName: string;
  avatarColor: string;
  avatar: string | null;
  organizations: {
    id: number;
    uuid: string;
    name: string;
    icon: string | null;
    iconColor: string;
    type: string;
  };
}
