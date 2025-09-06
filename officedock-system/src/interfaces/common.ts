import { CreationDataStatisticCategory } from './category';
import { Company } from './company';
import { Organizations } from './organization';
import {
  CreationStatisticType,
  LargeCategory,
  StatisticCategoryInfo,
} from './statistic';
import { TagCreationStatisticType } from './tag';
import { StatusTask, Team } from './task';
import { Profile, RoleUser } from './user';

export interface OptionDropdownType {
  value: string | number;
  label: string;
  imgUrl?: string;
  type?: string;
  totalData?: string;
  largeColor?: string;
  teamId?: number | null;
  imgComponent?: any;
  isMyRoutine?: boolean;
  userIds?: number[];
  iconColor?: string;
  avatarUrl?: string;
  color?: string;
}

export interface BasePagination<T> {
  count: number;
  numPages: number;
  results: T;
  hasNext?: boolean;
  totalDuration?: string;
  next?: string | null;
  previous?: string | null;
}

export interface OptionTabType {
  name: string;
  badge?: string | number;
}
export interface DataChartType {
  colors: string[];
  labels: string[];
  data: number[];
  actualValue: string[];
  optionData: {
    label: string;
    avatarColor?: string;
    percent?: number;
  }[][];
  listId: (number | string)[];
  listDuration?: string[][];
  mergedItems?: StatisticCategoryInfo[];
  dataOrganization?: string[];
}

export interface DataPercentCompareType {
  id: string | number;
  label: string;
  percentage: number;
  color: string;
  totalDuration: string;
  optionData: {
    label: string;
    percent?: number;
    avatarColor?: string;
    avatarUrl?: string;
  }[];
  mergedItems: StatisticCategoryInfo[];
  dataOrganization?: string[];
  organizationId?: string;
}

export interface DateInfo {
  year: number;
  month: number;
  day: number;
  weekday: string;
}

export type ChangeTextAreaProps = {
  editorRef: React.RefObject<HTMLDivElement>;
  onChange?: (html: string) => void;
};

export type CreationDataCommon = {
  userSetting?: {
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
  organizations?: Organizations[];
  tags?: TagCreationStatisticType[];
  taskStatus?: StatusTask[];
  organizationCategories: CreationStatisticType[];
  filterOrganizationsCategories?: Team[];
  allMembers?: Profile[];
  organizationUsers?: Omit<Organizations, 'isMain'>[];
  roles?: RoleUser[];
  organizationMembers?: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  }[];
  organizationSkills?: {
    organization: Organizations;
    skills: {
      id: number;
      name: string;
    }[];
  }[];
  eventLocations?: {
    id: number;
    uuid: string;
    name: string;
  }[];
  calendarOrganization?: {
    icon: string | null;
    iconColor: string;
    id: number;
    isMain: boolean;
    name: string;
    statisticCategories: LargeCategory[];
    tags: TagCreationStatisticType[];
    uuid: string;
  };
  eventTypes?: string[];
  myStatistics?: CreationStatisticType[];
  organizationStatistics?: CreationStatisticType[];
  company?: Company;
  allOrganizations?: Organizations[];
  statisticCategories?: CreationDataStatisticCategory[];
};
