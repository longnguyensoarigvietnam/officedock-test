import { StatisticChartType } from '@constants/enums';
import { TagCreationStatisticType, Tags } from './tag';
import { TodoItem } from './task';
import { Profile, User } from './user';
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
  id: number | string;
  name: string;
  uuid: string;
}

export interface MediumCategory {
  MEDIUM: {
    id: number | string;
    name: string;
    uuid: string;
  } | null;
  SMALL: SmallCategory[];
}
export interface LargeCategory {
  LARGE: {
    id: number | string;
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
  nextUser?: {
    avatar: string | null;
    avatarColor: string | null;
    email: string;
    id: number;
    loginType: string;
    profile: Profile;
  };
  prevUser?: {
    avatar: string | null;
    avatarColor: string | null;
    email: string;
    id: number;
    loginType: string;
    profile: Profile;
  };
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
    createdAt: Date | string;
  }[];
  type: string;
  todoList: TodoItem[];
  totalDuration: string;
  isCalculate?: boolean;
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
  createdAt: Date | string;
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
  createdAt: Date | string;
}
export interface DataActualDetail {
  largeColor: string;
  title: string;
  start: string;
  end: string;
  left?: number;
  top?: number;
  uuid: string;
  isCalculate?: boolean;
}

export interface DataUserDetailDailyType {
  id: number;
  fullName: string;
  isConfirmed: boolean;
  totalDuration: string;
  organizationName?: string;
  avatar?: string | null;
  avatarColor: string;
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
  categoryTotalDuration?: string;
  largeCategories: StatisticCategoryInfo[];
  mediumCategories?: StatisticCategoryInfo[];
  smallCategories?: StatisticCategoryInfo[];
  category?: StatisticCategoryInfo[];
}
export interface StatisticsAllTeams {
  largeTotalDuration: string;
  largeCategories: StatisticAllTeamInfo[];
}
export interface StatisticsTagsType {
  totalDuration: string;
  largeCategories: StatisticCategoryInfo[];
  mediumCategories?: StatisticCategoryInfo[];
  smallCategories?: StatisticCategoryInfo[];
  category?: StatisticCategoryInfo[];
}

export interface StatisticAllTeamInfo {
  organizationId: string;
  organizationName?: string;
  percent: number;
  duration: string;
  color: string;
  subTeams?: {
    organizationId: number;
    organizationName?: string;
    duration: string;
  }[];
  data?: {
    categoryId: number;
    categoryName?: string;
    categoryColor?: string;
    duration: string;
    tagId?: number;
    tagName?: string;
  }[];
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
    id: string | number;
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
  data: {
    organizationId: number | string;
    categoryId: number | string;
    categoryName: string;
    categoryColor: string;
    duration: string;
    percent: number;
    tasks: {
      id: number;
      title: string;
      type: string;
    }[];
  }[];
  durations: {
    startDate: string;
    endDate: string;
    data: {
      organizationId: number | string;
      organizationName?: string;
      categoryId: number | string;
      categoryName: string;
      categoryColor: string;
      duration: string;
      percent: number;
      tasks: {
        id: number;
        title: string;
        type: string;
      }[];
    }[];
  }[];
}
export interface StatisticsTaskDurationTag {
  data: {
    duration: string;
    organizationId: number;
    percent: number;
    tagId: number;
    tagName: string;
  }[];
  durations: {
    startDate: string;
    endDate: string;
    data: {
      duration: string;
      organizationId: number;
      percent: number;
      tagId: number;
      tagName: string;
    }[];
  }[];
}

export interface StatisticsAllTeamTaskDuration {
  data: {
    color: string;
    duration: string;
    organizationId: string | number;
    organizationName: string;
    percent: number;
    users?: {
      avatar: string | null;
      avatarColor: string;
      fullName: string;
      id: number;
      percent: number;
      totalDuration: string;
    }[];
  }[];
  durations: {
    startDate: string;
    endDate: string;
    data: {
      organizationId: string | number;
      organizationName: string;
      duration: string;
      percent: number;
      color: string;
      users?: {
        avatar: string | null;
        avatarColor: string;
        fullName: string;
        id: number;
        percent: number;
        totalDuration: string;
      }[];
    }[];
  }[];
}

export interface TeamDockStatisticsAllTeamTaskDuration {
  data: {
    color: string;
    duration: string;
    organizationId: string | number;
    organizationName: string;
    percent: number;
    users: {
      id: number;
      fullName: string;
      avatarColor: string;
      avatar: string | null;
      percent: number;
      totalDuration: string;
    }[];
  }[];
  durations: {
    startDate: string;
    endDate: string;
    data: {
      organizationId: string | number;
      organizationName: string;
      duration: string;
      percent: number;
      color: string;
      users: {
        id: number;
        fullName: string;
        avatarColor: string;
        avatar: string | null;
        percent: number;
        totalDuration: string;
      }[];
    }[];
  }[];
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
  id: number | string;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: string[];
  mergedItems?: ProgressDataType[];
  organizationId?: string;
};
export interface CategoryTableRowDetail {
  categoryId: string | number;
  organizationId: string | number;
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
  tagId: number | string;
  tagName: string;
  tagDuration: string;
  tagPercent: number;
  organizationId: number | string;
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

export interface CategoryLineChartDatasetInfo {
  label: string;
  data: {
    x: string;
    y: number;
    endDate: any;
    color?: string;
    label: string;
    type?: StatisticChartType;
    startDate?: any;
    duration?: string;
    anotherStartDate?: any;
    anotherEndDate?: any;
    anotherDuration?: string;
    avatarColor?: string;
    avatar?: string;
    userId?: number;
    user?: {
      avatar: string | null;
      avatarColor: string;
      fullName: string;
      id: number;
    };
  }[];
  borderColor: string;
  backgroundColor: string;
  borderDash?: number[];
  fill: boolean;
  tension: number;
  pointRadius: number;
  pointBorderColor: string;
  pointHoverRadius: number;
  pointHoverBackgroundColor: string;
  pointHoverBorderColor: string;
  pointHoverBorderWidth: number;
}

export interface MergedMyDockLineChartTable {
  id: string | number | null;
  name: string;
  color: string;
  standardInfo?: {
    duration: string;
    percent: string;
  };
  compareInfo?: {
    duration: string;
    percent: string;
  };
}

export interface MyDockLineChartTableItem {
  id: string | number | null;
  name: string;
  duration: string;
  percent: string;
  color: string;
  type?: StatisticChartType.STANDARD | StatisticChartType.COMPARE;
}

export interface TeamDockAllTeamTableRowDetail {
  id: string | number;
  name: string;
  duration: string;
  percent: number;
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    userDuration: string;
    userPercent: number;
  }[];
  type?: StatisticChartType.STANDARD | StatisticChartType.COMPARE;
}

export interface TeamDockMergedTable {
  categoryId?: string | number;
  categoryName?: string;
  tagId?: string | number;
  tagName?: string;
  organizationId?: string | number;
  standardInfo?: {
    duration: string;
    percent: number;
  };
  compareInfo?: {
    duration: string;
    percent: number;
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
