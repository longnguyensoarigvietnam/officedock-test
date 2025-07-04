import { StatisticChartType } from '@constants/enums';
import { TagCreationStatisticType, Tags } from './tag';
import { TodoItem } from './task';
import { User } from './user';
import { OptionDropdownType } from './common';

export interface TaskTimeStatistic {
  uuid: string;
  start: Date;
  end: Date;
  id: string;
  title: string;
  startedAt: Date;
  pausedAt: Date;
}
export interface UserListStatisticType {
  duration: string;
  percent: number;
  tasks: {
    id: number;
    title: string;
    type: string;
  }[];
  user: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  };
}

export interface SmallCategory {
  id: number;
  name: string;
  uuid: string;
}

export interface MediumCategory {
  MEDIUM: {
    id: number;
    name: string;
    uuid: string;
  } | null;
  SMALL: SmallCategory[];
}
export interface LargeCategory {
  LARGE: {
    id: number;
    name: string;
    uuid: string;
  };
  MEDIUM: MediumCategory[];
}
export type OrganizationCategories = {
  [key: string]: LargeCategory[];
};
export interface dataStatisticResponse {
  categories: {
    categoryName: string;
    duration: string;
    percent: number;
    categoryColor: string;
  }[];
  tasks: dataTaskDaily[];
  remark: {
    date: string | null;
    remark: string;
    isSubmit: boolean;
    isConfirmed: boolean;
    user: User;
    organizationName: string;
  };
  nextUser?: number;
  prevUser?: number;
  totalDuration: string;
  organizationCategories: OrganizationCategories;
}
export interface dataStatisticResponsePDF {
  categories: {
    categoryName: string;
    duration: string;
    percent: number;
    categoryColor: string;
    id?: string;
    isOfMainOrganization: boolean;
  }[];
  remark: {
    date: string | null;
    remark: string;
    isSubmit: boolean;
    isConfirmed: boolean;
    user: {
      avatar: string | null;
      avatarColor: string;
      fullName: string;
      id: number;
      organizations: {
        icon: string | null;
        iconColor: string;
        id: number;
        name: string;
        uuid: string;
      };
    };
    organizationName: string;
  };
  totalDuration: string;
  subOrganization: {
    duration: string;
    percent: number;
  };
  taskDurations: {
    id: number;
    pausedAt: string;
    startedAt: string;
    title: string;
  }[];
}

export interface dataTotalCategory {
  color: string;
  categoryName: string;
  duration: string;
  percent: number;
  id?: string;
}
export interface dataTaskDaily {
  id: string;
  title: string;
  categories: {
    id: number;
    name: string;
    type: string;
    color: string;
  }[];
  status: {
    id: number;
    name: string;
  };
  organization: number;
  tags: Omit<Tags, 'peopleInCharge' | 'responsiblePerson'>[];
  taskDurations: {
    uuid: string;
    id: number;
    duration: string;
    startedAt: string;
    pausedAt: string;
  }[];
  type: string;
  todoList: TodoItem[];
  totalDuration: string;
}

export interface ChildTask {
  id: string;
  idEdit?: string;
  title: string;
  organization: number;
  status: { id: number; name: string };
  tags: {
    id: number;
    name: string;
  }[];
  todoList: TodoItem[];
  totalDuration: string;
  startedAt: string;
  pausedAt: string;
  isRunning?: boolean;
  type?: string;
  SMALL: {
    id: number | string;
    name: string;
  };
  MEDIUM: {
    id: number | string;
    name: string;
  };
  LARGE: {
    id: number | string;
    name: string;
  };
}

export interface dataTaskDailyTable {
  id: string;
  idEdit?: string;
  title: string;
  SMALL: {
    id: number | string;
    name: string;
  };
  MEDIUM: {
    id: number | string;
    name: string;
  };
  LARGE: {
    id: number | string;
    name: string;
  };
  status: {
    id: number;
    name: string;
  };
  tags: {
    id: number;
    name: string;
  }[];
  taskDuration?: string;
  children?: ChildTask[];
  todoList: TodoItem[];
  totalDuration: string;
  startedAt?: string;
  pausedAt?: string;
  isRunning?: boolean;
  organization?: number;
  type?: string;
}
export interface DataActualDetail {
  largeColor: string;
  title: string;
  start: string;
  end: string;
  left?: number;
  top?: number;
  uuid: string;
}

export interface DataUserDetailDailyType {
  id: number;
  fullName: string;
  isConfirmed: boolean;
  totalDuration: string;
  organizationName?: string;
}
export interface DataListDailyType {
  organization: {
    id: number;
    name: string;
  };
  users: DataUserDetailDailyType[];
}

export interface dataRequestConfirmType {
  id: number;
  isConfirmed: boolean;
  categoryId: number;
}

export interface StatisticsCategories {
  largeTotalDuration: string;
  mediumTotalDuration?: string;
  smallTotalDuration?: string;
  largeCategories: StatisticCategoryInfo[];
  mediumCategories?: StatisticCategoryInfo[];
  smallCategories?: StatisticCategoryInfo[];
  category?: StatisticCategoryInfo[];
}
export interface StatisticsTagsType {
  totalDuration: string;
  largeCategories: StatisticCategoryInfo[];
  mediumCategories?: StatisticCategoryInfo[];
  smallCategories?: StatisticCategoryInfo[];
  category?: StatisticCategoryInfo[];
}

export interface StatisticCategoryInfo {
  categoryId: number;
  tagId?: number;
  tagName?: string;
  categoryName: string;
  duration: string;
  percent: number;
  categoryColor: string;
  tasks: DataTaskModalStatisticType[];
  users?: UserListStatisticType[];
  organizationId?: number;
}
export interface CreationStatisticType {
  id: number;
  name: string;
  isMain: boolean;
  statisticCategories: LargeCategory[];
  users?: {
    id: number;
    fullName: string;
    avatarColor: string;
  }[];
  type?: string;
  iconColor?: string;
  tags: TagCreationStatisticType[];
  members: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  }[];
}
export interface DataResponseStatisticCreationType {
  organizations: CreationStatisticType[];
  calendarOrganization: {
    icon: string | null;
    iconColor: string;
    id: number;
    isMain: boolean;
    name: string;
    statisticCategories: LargeCategory[];
    uuid: string;
    tags: TagCreationStatisticType[];
  };
  locations: {
    id: number;
    uuid: string;
    name: string;
  }[];
  tags: TagCreationStatisticType[];
}
export interface DataResponseStatisticCreationTeamType {
  organizations: CreationStatisticType[];
  tags: TagCreationStatisticType[];
  members: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
  }[];
}
export interface DataTaskModalStatisticType {
  id: number;
  percent: number;
  title: string;
  totalDuration: string;
}
export interface DataTaskListStatisticListType {
  id: number;
  title: string;
  percent: number;
  totalDuration: string;
  type: string;
  tags: Omit<Tags, 'peopleInCharge' | 'responsiblePerson'>[];
  categories?: {
    name: string;
    type: string;
    id: number;
    color: string;
  }[];
  taskDurations: {
    uuid: string;
    id: number;
    duration: string;
    startedAt: string;
    pausedAt: string;
  }[];
  organization: {
    id: number;
    name: string;
    type?: string;
  };
  createdAt: string;
}

export interface StatisticsTaskDuration {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  duration: string;
  durations: {
    startDate: string;
    endDate: string;
    duration: string;
    percent: number;
  }[];
  percent?: number;
}

export interface StatisticsTagTaskDuration {
  tagId: number;
  tagName: string;
  duration: string;
  durations: {
    startDate: string;
    endDate: string;
    duration: string;
    percent: number;
  }[];
  percent?: number;
}
export interface StatisticsPercentChart {
  endDate: string;
  startDate: string;
  totalDuration: string;
  categories: {
    categoryColor: string;
    categoryId: number;
    categoryName: string;
    duration: string;
    percent: number;
  }[];
}
export interface StatisticsTagPercentChart {
  endDate: string;
  startDate: string;
  totalDuration: string;
  tags: {
    tagId: number;
    tagName: string;
    duration: string;
    percent: number;
  }[];
}

export interface StatisticsUserTaskDuration {
  user: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
  } | null;
  totalDuration: string;
  durations: {
    startDate: string;
    endDate: string;
    duration: string;
    percentPerRange: number;
  }[];
}

export type ProgressDataType = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: string[];
  mergedItems?: ProgressDataType[];
  organizationId?: string;
};
export interface CategoryTableRowDetail {
  categoryId: number;
  organizationId: number;
  categoryName: string;
  categoryDuration: string;
  categoryPercent: number;
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    userDuration: string;
    userPercent: number;
  }[];
}

export interface TagTableRowDetail {
  tagId: number;
  tagName: string;
  tagDuration: string;
  tagPercent: number;
  organizationId: number;
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    userDuration: string;
    userPercent: number;
  }[];
}

export interface MergedTableCategory {
  categoryId: number;
  categoryName: string;
  organizationId: number;
  standardInfo?: {
    categoryDuration: string;
    categoryPercent: number;
  };
  compareInfo?: {
    categoryDuration: string;
    categoryPercent: number;
  };
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    standardInfo?: {
      userDuration: string;
      userPercent: number;
    };
    compareInfo?: {
      userDuration: string;
      userPercent: number;
    };
  }[];
}

export interface MergedTableTag {
  tagId: number;
  tagName: string;
  organizationId: number;
  standardInfo?: {
    tagDuration: string;
    tagPercent: number;
  };
  compareInfo?: {
    tagDuration: string;
    tagPercent: number;
  };
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    standardInfo?: {
      userDuration: string;
      userPercent: number;
    };
    compareInfo?: {
      userDuration: string;
      userPercent: number;
    };
  }[];
}

export interface TagTableRowDetailWithType extends TagTableRowDetail {
  type: StatisticChartType.STANDARD | StatisticChartType.COMPARE;
}

export interface CategoryTableRowDetailWithType extends CategoryTableRowDetail {
  type: StatisticChartType.STANDARD | StatisticChartType.COMPARE;
}

export interface ListTaskStatistic {
  id: number;
  name: string;
  duration: string;
  ratio: string;
  categories: OptionDropdownType[];
  tags: OptionDropdownType[];
  organization: number;
  organizationName: string;
  organizationType?: string;
  type: string;
}
