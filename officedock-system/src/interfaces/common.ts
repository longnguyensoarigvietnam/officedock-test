export interface OptionDropdownType {
  value: string | number;
  label: string;
  imgUrl?: string;
  type?: string;
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
