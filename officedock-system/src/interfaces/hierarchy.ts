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
    id: number,
    name: string
  }[];
  color: string;
}
