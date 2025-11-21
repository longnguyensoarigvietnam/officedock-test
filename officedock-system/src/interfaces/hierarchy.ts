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
  };
  mediumStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
  };
  smallStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
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
  };
  mediumStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
  };
  color: string;
}
export interface CalendarCategoryRow {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string;
  };
  color: string;
}
export interface OrganizationCategoryRow {
  id: number | string;
  large: {
    value: string | number;
    label: string;
    showBy: string | null;
  };
  medium: {
    value: string | number;
    label: string;
    showBy: string | null;
  };
  small: {
    value: string | number;
    label: string;
    showBy: string | null;
  };
  skills: OptionDropdownType[];
  color: string;
}
