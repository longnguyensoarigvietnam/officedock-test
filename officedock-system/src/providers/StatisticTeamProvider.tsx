'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
} from 'react';
import { usePathname } from 'next/navigation';

import { OptionDropdownType } from '@interfaces/common';
import {
  CategoryTableRowDetail,
  TeamDockMergedTable,
} from '@interfaces/statistic';

import { getAdjustedStartDateDefault } from '@utils/date';

import {
  OrganizationStatisticType,
  StatisticViewLabels,
  StatisticViewOptions,
} from '@constants/enums';
import { GlobalStateContext } from './GlobalStateProvider';

interface ContextValue {
  isDisableCalendar: boolean;
  isHasLoading: boolean;
  selectedOrganization: OptionDropdownType | null;
  selectedLarge: OptionDropdownType | null;
  selectedMedium: OptionDropdownType | null;
  selectedSmall: OptionDropdownType | null;
  smallOptions: OptionDropdownType[];
  mediumOptions: OptionDropdownType[];
  largeOptions: OptionDropdownType[];
  totalDurationLarge: string;
  totalDurationMedium: string;
  totalDurationSmall: string;
  totalDurationLargeCompare: string;
  totalDurationMediumCompare: string;
  totalDurationSmallCompare: string;
  listOptionsOrganization: OptionDropdownType[];
  isCheckCompare: boolean;
  endDate: Date | null;
  startDate: Date;
  endDateCompare: Date | null;
  startDateCompare: Date;
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
    avatarUrl: string;
  }[];
  totalDurationCategory: string;
  totalDurationCategoryCompare: string;
  // Tag
  tagsOptions: OptionDropdownType[];
  orderingOptions: {
    tag_ids: OptionDropdownType[];
    user_ids: OptionDropdownType[];
  } | null;
  setOrderingOptions: Dispatch<
    SetStateAction<{
      tag_ids: OptionDropdownType[];
      user_ids: OptionDropdownType[];
    } | null>
  >;
  setTagsOptions: Dispatch<SetStateAction<OptionDropdownType[]>>;
  setSmallOptions: Dispatch<SetStateAction<OptionDropdownType[]>>;
  setMediumOptions: Dispatch<SetStateAction<OptionDropdownType[]>>;
  setLargeOptions: Dispatch<SetStateAction<OptionDropdownType[]>>;
  setListOptionsOrganization: Dispatch<SetStateAction<OptionDropdownType[]>>;
  setSelectedOrganization: Dispatch<SetStateAction<OptionDropdownType | null>>;
  setSelectedLarge: Dispatch<SetStateAction<OptionDropdownType | null>>;
  setSelectedMedium: Dispatch<SetStateAction<OptionDropdownType | null>>;
  setSelectedSmall: Dispatch<SetStateAction<OptionDropdownType | null>>;
  setTotalDurationLarge: Dispatch<SetStateAction<string>>;
  setTotalDurationMedium: Dispatch<SetStateAction<string>>;
  setTotalDurationSmall: Dispatch<SetStateAction<string>>;
  setTotalDurationLargeCompare: Dispatch<SetStateAction<string>>;
  setTotalDurationMediumCompare: Dispatch<SetStateAction<string>>;
  setTotalDurationSmallCompare: Dispatch<SetStateAction<string>>;
  setIsCheckCompare: Dispatch<SetStateAction<boolean>>;
  setEndDate: Dispatch<SetStateAction<Date | null>>;
  setStartDate: Dispatch<SetStateAction<Date>>;
  setEndDateCompare: Dispatch<SetStateAction<Date | null>>;
  setStartDateCompare: Dispatch<SetStateAction<Date>>;
  setTotalDurationCategory: Dispatch<SetStateAction<string>>;
  setTotalDurationCategoryCompare: Dispatch<SetStateAction<string>>;
  setListMemberTeam: Dispatch<
    SetStateAction<
      {
        id: number;
        fullName: string;
        color: string;
        avatarUrl: string;
      }[]
    >
  >;
  isSkeletonCategoryTeamTask: boolean;
  setIsSkeletonCategoryTeamTask: Dispatch<SetStateAction<boolean>>;
  isSkeletonCategoryTeamTaskCompare: boolean;
  setIsSkeletonCategoryTeamTaskCompare: Dispatch<SetStateAction<boolean>>;

  // Loading
  isLoadingLarge: boolean;
  isLoadingMedium: boolean;
  isLoadingOrganization: boolean;
  setIsLoadingLarge: Dispatch<SetStateAction<boolean>>;
  setIsLoadingMedium: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOrganization: Dispatch<SetStateAction<boolean>>;

  isLoadingLargeCompare: boolean;
  isLoadingMediumCompare: boolean;
  isLoadingOrganizationCompare: boolean;
  setIsLoadingLargeCompare: Dispatch<SetStateAction<boolean>>;
  setIsLoadingMediumCompare: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOrganizationCompare: Dispatch<SetStateAction<boolean>>;

  totalDurationTask: string;
  setTotalDurationTask: Dispatch<SetStateAction<string>>;
  totalDurationTaskCompare: string;
  setTotalDurationTaskCompare: Dispatch<SetStateAction<string>>;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  // Value data
  remainingCountUser: number;
  remainingCountTag: number;
  firstThreeUser: OptionDropdownType[];
  allLabelUser: OptionDropdownType[];
  allLabelTag: OptionDropdownType[];
  firstThreeTag: OptionDropdownType[];

  // View by
  lineChartViewBy: OptionDropdownType | null;
  setLineChartViewBy: Dispatch<SetStateAction<OptionDropdownType | null>>;

  // Table data
  areaTableData: CategoryTableRowDetail[];
  setAreaTableData: Dispatch<SetStateAction<CategoryTableRowDetail[]>>;
  lineChartTableData: CategoryTableRowDetail[];
  setLineChartTableData: Dispatch<SetStateAction<CategoryTableRowDetail[]>>;
  mergedTableData: TeamDockMergedTable[];
  setMergedTableData: Dispatch<SetStateAction<TeamDockMergedTable[]>>;
  handleResetTableData: () => void;
  removeTag: (selected: OptionDropdownType) => void;
  removeUser: (selected: OptionDropdownType) => void;

  dataMediumCalendar: OptionDropdownType | undefined;
  setDataMediumCalendar: Dispatch<
    SetStateAction<OptionDropdownType | undefined>
  >;
}

const defaultValue: ContextValue = {
  isHasLoading: false,
  isDisableCalendar: false,
  smallOptions: [],
  mediumOptions: [],
  largeOptions: [],
  listOptionsOrganization: [],
  setSmallOptions: () => {},
  setMediumOptions: () => {},
  setLargeOptions: () => {},
  setListOptionsOrganization: () => {},
  selectedOrganization: null,
  selectedLarge: null,
  selectedMedium: null,
  selectedSmall: null,
  setSelectedOrganization: () => {},
  setSelectedLarge: () => {},
  setSelectedMedium: () => {},
  setSelectedSmall: () => {},
  totalDurationLarge: '',
  totalDurationMedium: '',
  totalDurationSmall: '',
  totalDurationLargeCompare: '',
  totalDurationMediumCompare: '',
  totalDurationSmallCompare: '',
  totalDurationCategory: '',
  totalDurationCategoryCompare: '',
  setTotalDurationLarge: () => {},
  setTotalDurationMedium: () => {},
  setTotalDurationSmall: () => {},
  setTotalDurationLargeCompare: () => {},
  setTotalDurationMediumCompare: () => {},
  setTotalDurationSmallCompare: () => {},
  setTotalDurationCategory: () => {},
  setTotalDurationCategoryCompare: () => {},
  isCheckCompare: false,
  endDate: null,
  startDate: new Date(),
  endDateCompare: null,
  startDateCompare: new Date(),
  setIsCheckCompare: () => {},
  setEndDate: () => {},
  setStartDate: () => {},
  setEndDateCompare: () => {},
  setStartDateCompare: () => {},
  listMemberTeam: [],
  setListMemberTeam: () => {},
  tagsOptions: [],
  setTagsOptions: () => {},
  isSkeletonCategoryTeamTask: false,
  setIsSkeletonCategoryTeamTask: () => {},
  isSkeletonCategoryTeamTaskCompare: false,
  setIsSkeletonCategoryTeamTaskCompare: () => {},
  // Loading
  isLoadingLarge: false,
  isLoadingMedium: false,
  isLoadingOrganization: false,
  setIsLoadingLarge: () => {},
  setIsLoadingMedium: () => {},
  setIsLoadingOrganization: () => {},

  isLoadingLargeCompare: false,
  isLoadingMediumCompare: false,
  isLoadingOrganizationCompare: false,
  setIsLoadingLargeCompare: () => {},
  setIsLoadingMediumCompare: () => {},
  setIsLoadingOrganizationCompare: () => {},
  totalDurationTask: '',
  totalDurationTaskCompare: '',
  setTotalDurationTask: () => {},
  setTotalDurationTaskCompare: () => {},
  currentPage: 1,
  setCurrentPage: () => {},
  orderingOptions: null,
  setOrderingOptions: () => {},
  remainingCountUser: 0,
  remainingCountTag: 0,
  firstThreeUser: [],
  allLabelUser: [],
  allLabelTag: [],
  firstThreeTag: [],

  lineChartViewBy: null,
  setLineChartViewBy: () => {},

  areaTableData: [],
  setAreaTableData: () => {},
  lineChartTableData: [],
  setLineChartTableData: () => {},
  mergedTableData: [],
  setMergedTableData: () => {},
  handleResetTableData: () => {},
  removeTag: () => {},
  removeUser: () => {},

  dataMediumCalendar: undefined,
  setDataMediumCalendar: () => {},
};

export const StatisticTeamStateContext =
  createContext<ContextValue>(defaultValue);

export const StatisticTeamStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { setIsHasLoadingSkeleton } = useContext(GlobalStateContext);
  const pathname = usePathname();

  // Loading
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [isLoadingLarge, setIsLoadingLarge] = useState(false);
  const [isLoadingMedium, setIsLoadingMedium] = useState(false);
  const [isLoadingOrganizationCompare, setIsLoadingOrganizationCompare] =
    useState(false);
  const [isLoadingLargeCompare, setIsLoadingLargeCompare] = useState(false);
  const [isLoadingMediumCompare, setIsLoadingMediumCompare] = useState(false);

  const [isSkeletonCategoryTeamTask, setIsSkeletonCategoryTeamTask] =
    useState(false);
  const [
    isSkeletonCategoryTeamTaskCompare,
    setIsSkeletonCategoryTeamTaskCompare,
  ] = useState(false);

  const [smallOptions, setSmallOptions] = useState<OptionDropdownType[]>([]);
  const [largeOptions, setLargeOptions] = useState<OptionDropdownType[]>([]);
  const [mediumOptions, setMediumOptions] = useState<OptionDropdownType[]>([]);
  const [listOptionsOrganization, setListOptionsOrganization] = useState<
    OptionDropdownType[]
  >([]);

  // Table data
  const [areaTableData, setAreaTableData] = useState<CategoryTableRowDetail[]>(
    [],
  );
  const [lineChartTableData, setLineChartTableData] = useState<
    CategoryTableRowDetail[]
  >([]);
  const [mergedTableData, setMergedTableData] = useState<TeamDockMergedTable[]>(
    [],
  );

  // Select
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType | null>({
      label: '',
      value: '',
    });
  const [selectedLarge, setSelectedLarge] = useState<OptionDropdownType | null>(
    {
      label: '-',
      value: '',
    },
  );
  const [selectedMedium, setSelectedMedium] =
    useState<OptionDropdownType | null>({
      label: '-',
      value: '',
    });
  const [selectedSmall, setSelectedSmall] = useState<OptionDropdownType | null>(
    {
      label: '-',
      value: '',
    },
  );

  // Page task list
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dataMediumCalendar, setDataMediumCalendar] =
    useState<OptionDropdownType>();

  // Total
  // Total duration
  const [totalDurationLarge, setTotalDurationLarge] = useState<string>('');
  const [totalDurationMedium, setTotalDurationMedium] = useState<string>('');
  const [totalDurationSmall, setTotalDurationSmall] = useState<string>('');
  const [totalDurationCategory, setTotalDurationCategory] =
    useState<string>('');

  // Total duration compare
  const [totalDurationTask, setTotalDurationTask] = useState<string>('');
  const [totalDurationTaskCompare, setTotalDurationTaskCompare] =
    useState<string>('');
  const [totalDurationCategoryCompare, setTotalDurationCategoryCompare] =
    useState<string>('');
  const [totalDurationLargeCompare, setTotalDurationLargeCompare] =
    useState<string>('');
  const [totalDurationMediumCompare, setTotalDurationMediumCompare] =
    useState<string>('');
  const [totalDurationSmallCompare, setTotalDurationSmallCompare] =
    useState<string>('');

  // Data Date calendar
  const [isCheckCompare, setIsCheckCompare] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<Date>(
    getAdjustedStartDateDefault(),
  );
  // Tag
  const [tagsOptions, setTagsOptions] = useState<OptionDropdownType[]>([]);
  const [orderingOptions, setOrderingOptions] = useState<{
    tag_ids: OptionDropdownType[];
    user_ids: OptionDropdownType[];
  } | null>(null);

  // Data Date calendar compare
  const [endDateCompare, setEndDateCompare] = useState<Date | null>(new Date());
  const [startDateCompare, setStartDateCompare] = useState<Date>(
    getAdjustedStartDateDefault(),
  );

  // Member
  const [listMemberTeam, setListMemberTeam] = useState<
    {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[]
  >([]);

  // View by
  const [lineChartViewBy, setLineChartViewBy] =
    useState<OptionDropdownType | null>({
      value: StatisticViewOptions.WEEK,
      label: StatisticViewLabels.WEEK,
    });

  // Value data
  const allLabelUser =
    orderingOptions && orderingOptions.user_ids ? orderingOptions.user_ids : [];

  const firstThreeUser = allLabelUser.slice(0, 3);

  const remainingCountUser = allLabelUser.length - firstThreeUser.length;

  const allLabelTag =
    orderingOptions && orderingOptions.tag_ids ? orderingOptions.tag_ids : [];

  const firstThreeTag = allLabelTag.slice(0, 3);

  const remainingCountTag = allLabelTag.length - firstThreeTag.length;

  // Reset table data
  const handleResetTableData = () => {
    setMergedTableData([]);
    setAreaTableData([]);
    setLineChartTableData([]);
  };

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = orderingOptions?.tag_ids || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    handleResetTableData();
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    setOrderingOptions((prev) => ({
      tag_ids: updatedTagIds,
      user_ids: prev?.user_ids || [],
    }));
  };
  // Remove user
  const removeUser = (selected: OptionDropdownType) => {
    const currentUserIds = orderingOptions?.user_ids || [];
    const updatedUserIds = currentUserIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    handleResetTableData();
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    setOrderingOptions((prev) => ({
      tag_ids: prev?.tag_ids || [],
      user_ids: updatedUserIds,
    }));
  };

  const isHasLoading =
    isLoadingOrganization ||
    isLoadingLarge ||
    isLoadingMedium ||
    isLoadingOrganizationCompare ||
    isLoadingLargeCompare ||
    isLoadingMediumCompare;

  useEffect(() => {
    setIsHasLoadingSkeleton(isHasLoading);
  }, [isHasLoading, setIsHasLoadingSkeleton]);

  useEffect(() => {
    return () => {
      setIsHasLoadingSkeleton(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isDisableCalendar =
    selectedOrganization?.type === OrganizationStatisticType.CALENDAR;

  const contextValue: ContextValue = {
    smallOptions,
    mediumOptions,
    largeOptions,
    listOptionsOrganization,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
    selectedSmall,
    setSmallOptions,
    setMediumOptions,
    setLargeOptions,
    setListOptionsOrganization,
    setSelectedOrganization,
    setSelectedLarge,
    setSelectedMedium,
    setSelectedSmall,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationCategory,
    totalDurationCategoryCompare,
    setTotalDurationLarge,
    setTotalDurationMedium,
    setTotalDurationSmall,
    setTotalDurationLargeCompare,
    setTotalDurationMediumCompare,
    setTotalDurationSmallCompare,
    setTotalDurationCategory,
    setTotalDurationCategoryCompare,
    isCheckCompare,
    endDate,
    startDate,
    endDateCompare,
    startDateCompare,
    setIsCheckCompare,
    setEndDate,
    setStartDate,
    setEndDateCompare,
    setStartDateCompare,
    listMemberTeam,
    setListMemberTeam,
    tagsOptions,
    setTagsOptions,
    orderingOptions,
    setOrderingOptions,

    totalDurationTask,
    setTotalDurationTask,
    totalDurationTaskCompare,
    setTotalDurationTaskCompare,

    isSkeletonCategoryTeamTask,
    setIsSkeletonCategoryTeamTask,
    isSkeletonCategoryTeamTaskCompare,
    setIsSkeletonCategoryTeamTaskCompare,

    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,

    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    currentPage,
    setCurrentPage,
    remainingCountUser,
    remainingCountTag,
    firstThreeUser,
    allLabelUser,
    allLabelTag,
    firstThreeTag,

    lineChartViewBy,
    setLineChartViewBy,

    areaTableData,
    setAreaTableData,
    lineChartTableData,
    setLineChartTableData,
    mergedTableData,
    setMergedTableData,

    handleResetTableData,
    removeTag,
    removeUser,

    isHasLoading,
    dataMediumCalendar,
    setDataMediumCalendar,
    isDisableCalendar,
  };

  return (
    <StatisticTeamStateContext.Provider value={contextValue}>
      {children}
    </StatisticTeamStateContext.Provider>
  );
};
