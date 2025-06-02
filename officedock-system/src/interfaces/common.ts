import { StatisticCategoryInfo } from './statistic';

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
  listId: number[];
  listDuration: string[][];
  mergedItems: StatisticCategoryInfo[];
}

export interface DataPercentCompareType {
  id: number;
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
}

export interface DateInfo {
  year: number;
  month: number;
  day: number;
  weekday: string;
}
