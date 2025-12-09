import { StatisticCategoryType } from '@constants/enums';
import { OptionDropdownType } from './common';

export interface OrganizationCategoryHierarchyDetail {
  id: number;
  name: string;
  statisticCategories: StatisticCategory[];
}
export interface StatisticCategory {
  id: number;
  largeStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
    isHidden?: boolean;
  };
  mediumStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
    isHidden?: boolean;
  };
  smallStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
    isHidden?: boolean;
  };
  index?: number;
  skills: {
    id: number;
    name: string;
  }[];
  color: string;
}
export interface CalendarCategoryHierarchyDetail {
  id: number;
  uuid?: string;
  name: string;
  icon?: string | null;
  iconColor?: string;
  statisticCategories: CalendarCategory[];
}
export interface CalendarCategory {
  id: number;
  largeStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
    isHidden?: boolean;
  };
  mediumStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
    isHidden?: boolean;
  };
  color: string;
}
export interface CalendarCategoryRow {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
    isHidden?: boolean;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
    isHidden?: boolean;
  };
  color: string;
}
export interface OrganizationCategoryRow {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
    isHidden?: boolean;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
    isHidden?: boolean;
  };
  small: {
    value: string | number;
    label: string;
    showBy: string;
    isHidden?: boolean;
  };
  skills: OptionDropdownType[];
  color: string;
}

export interface SelectedOrganizationCategoryRow {
  organizationStatisticCategoryId: string | number | null;
  organizationId: number;
  largeStatisticCategory: {
    name: string;
    uuid: string;
    showBy?: string;
    isHidden?: boolean;
  } | null;
  mediumStatisticCategory: {
    name: string;
    uuid: string;
    showBy?: string;
    isHidden?: boolean;
  } | null;
  smallStatisticCategory: {
    name: string;
    uuid: string;
    showBy?: string;
    isHidden?: boolean;
  } | null;
  color: string;
  skillIds: number[];
  deletedType?: StatisticCategoryType | null;
}

export interface SelectedCalendarCategoryRow {
  organizationStatisticCategoryId: string | number | null;
  largeStatisticCategory: {
    name: string;
    uuid: string;
    isHidden?: boolean;
  } | null;
  mediumStatisticCategory: {
    name: string;
    uuid: string;
    isHidden?: boolean;
  } | null;
  color: string;
  deletedType?: StatisticCategoryType | null;
}

export interface HierarchyCategoryUpdatePayload {
  items: {
    organizationStatisticCategoryId: string | number | null;
    organizationId: number;
    largeStatisticCategory: {
      name: string;
      uuid: string;
    } | null;
    mediumStatisticCategory: {
      name: string;
      uuid: string;
    } | null;
    smallStatisticCategory: {
      name: string;
      uuid: string;
    } | null;
    color: string;
    skillIds: number[];
    deletedType?: StatisticCategoryType | null;
  }[];
  itemsToDelete: {
    id: number;
    type: StatisticCategoryType | null;
  }[];
}
export interface CalendarHierarchyCategoryUpdatePayload {
  items: {
    organizationStatisticCategoryId: string | number | null;
    largeStatisticCategory: {
      name: string;
      uuid: string;
    } | null;
    mediumStatisticCategory: {
      name: string;
      uuid: string;
    } | null;
    color: string;
    deletedType?: StatisticCategoryType | null;
  }[];
  itemsToDelete: {
    id: number;
    type: StatisticCategoryType | null;
  }[];
}
export interface CalendarCategoryInfo {
  id: number,
  color: string | null,
  isHidden: boolean,
  name: string,
  type: StatisticCategoryType
}