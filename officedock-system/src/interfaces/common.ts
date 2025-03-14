export interface OptionDropdownType {
  value: string | number;
  label: string;
  imgUrl?: string;
  type?: string;
  totalData?: string;
  largeColor?: string;
  teamId?: number;
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
  optionData: string[][];
  listId: number[];
  listDuration: string[][];
}

export interface DataPercentCompareType {
  id: number;
  label: string;
  percentage: number;
  color: string;
  totalDuration: string;
  optionData: string[];
}
