export interface OptionDropdownType {
  value: string | number;
  label: string;
  imgUrl?: string;
}
export interface BasePagination<T> {
  count: number;
  numPages: number;
  results: T;
}
