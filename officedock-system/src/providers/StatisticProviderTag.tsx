'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

import { OptionDropdownType } from '@interfaces/common';
import { getAdjustedStartDateDefault } from '@utils/date';
import {
  OrganizationStatisticType,
  StatisticViewLabels,
  StatisticViewOptions,
} from '@constants/enums';

interface ContextValue {
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
  totalDurationCategory: string;
  totalDurationLargeCompare: string;
  totalDurationMediumCompare: string;
  totalDurationSmallCompare: string;
  totalDurationCategoryCompare: string;
  listOptionsOrganization: OptionDropdownType[];
  isCheckCompare: boolean;
  endDate: Date | null;
  startDate: Date;
  endDateCompare: Date | null;
  startDateCompare: Date;
  // Tag
  tagsOptions: OptionDropdownType[];
  selectedTags: OptionDropdownType[];
  setSelectedTags: Dispatch<SetStateAction<OptionDropdownType[]>>;
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
  setTotalDurationCategory: Dispatch<SetStateAction<string>>;
  setTotalDurationLargeCompare: Dispatch<SetStateAction<string>>;
  setTotalDurationMediumCompare: Dispatch<SetStateAction<string>>;
  setTotalDurationSmallCompare: Dispatch<SetStateAction<string>>;
  setTotalDurationCategoryCompare: Dispatch<SetStateAction<string>>;
  setIsCheckCompare: Dispatch<SetStateAction<boolean>>;
  setEndDate: Dispatch<SetStateAction<Date | null>>;
  setStartDate: Dispatch<SetStateAction<Date>>;
  setEndDateCompare: Dispatch<SetStateAction<Date | null>>;
  setStartDateCompare: Dispatch<SetStateAction<Date>>;
  isSkeletonTagTask: boolean;
  setIsSkeletonTagTask: Dispatch<SetStateAction<boolean>>;
  isSkeletonTagTaskCompare: boolean;
  setIsSkeletonTagTaskCompare: Dispatch<SetStateAction<boolean>>;

  isLoadingLarge: boolean;
  isLoadingMedium: boolean;
  isLoadingSmall: boolean;

  isLoadingOrganization: boolean;
  setIsLoadingLarge: Dispatch<SetStateAction<boolean>>;
  setIsLoadingMedium: Dispatch<SetStateAction<boolean>>;
  setIsLoadingSmall: Dispatch<SetStateAction<boolean>>;

  setIsLoadingOrganization: Dispatch<SetStateAction<boolean>>;

  isLoadingLargeCompare: boolean;
  isLoadingMediumCompare: boolean;
  isLoadingSmallCompare: boolean;
  isLoadingOrganizationCompare: boolean;
  setIsLoadingLargeCompare: Dispatch<SetStateAction<boolean>>;
  setIsLoadingMediumCompare: Dispatch<SetStateAction<boolean>>;
  setIsLoadingSmallCompare: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOrganizationCompare: Dispatch<SetStateAction<boolean>>;

  // View by
  lineChartViewBy: OptionDropdownType | null;
  setLineChartViewBy: Dispatch<SetStateAction<OptionDropdownType | null>>;

  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  removeTag: (selected: OptionDropdownType) => void;
  dataMediumCalendar: OptionDropdownType | undefined;
  setDataMediumCalendar: Dispatch<
    SetStateAction<OptionDropdownType | undefined>
  >;
  isDisableCalendar: boolean;

  totalDurationTask: string;
  setTotalDurationTask: Dispatch<SetStateAction<string>>;
  totalDurationTaskCompare: string;
  setTotalDurationTaskCompare: Dispatch<SetStateAction<string>>;
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
  totalDurationCategory: '',

  totalDurationLargeCompare: '',
  totalDurationMediumCompare: '',
  totalDurationSmallCompare: '',
  totalDurationCategoryCompare: '',

  setTotalDurationLarge: () => {},
  setTotalDurationMedium: () => {},
  setTotalDurationSmall: () => {},
  setTotalDurationCategory: () => {},

  setTotalDurationLargeCompare: () => {},
  setTotalDurationMediumCompare: () => {},
  setTotalDurationSmallCompare: () => {},
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
  tagsOptions: [],
  selectedTags: [],
  setSelectedTags: () => {},
  setTagsOptions: () => {},

  isSkeletonTagTask: false,
  setIsSkeletonTagTask: () => {},
  isSkeletonTagTaskCompare: false,
  setIsSkeletonTagTaskCompare: () => {},

  isLoadingLarge: false,
  isLoadingMedium: false,
  isLoadingSmall: false,
  isLoadingOrganization: false,
  setIsLoadingLarge: () => {},
  setIsLoadingMedium: () => {},
  setIsLoadingSmall: () => {},
  setIsLoadingOrganization: () => {},

  isLoadingLargeCompare: false,
  isLoadingMediumCompare: false,
  isLoadingSmallCompare: false,
  isLoadingOrganizationCompare: false,
  setIsLoadingLargeCompare: () => {},
  setIsLoadingMediumCompare: () => {},
  setIsLoadingSmallCompare: () => {},
  setIsLoadingOrganizationCompare: () => {},

  lineChartViewBy: null,
  setLineChartViewBy: () => {},
  currentPage: 1,
  setCurrentPage: () => {},
  removeTag: () => {},
  dataMediumCalendar: undefined,
  setDataMediumCalendar: () => {},
  totalDurationTask: '',
  totalDurationTaskCompare: '',
  setTotalDurationTask: () => {},
  setTotalDurationTaskCompare: () => {},
};

export const StatisticTagStateContext =
  createContext<ContextValue>(defaultValue);

export const StatisticTagStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Loading
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [isLoadingLarge, setIsLoadingLarge] = useState(false);
  const [isLoadingMedium, setIsLoadingMedium] = useState(false);
  const [isLoadingSmall, setIsLoadingSmall] = useState(false);

  const [isLoadingOrganizationCompare, setIsLoadingOrganizationCompare] =
    useState(false);
  const [isLoadingLargeCompare, setIsLoadingLargeCompare] = useState(false);
  const [isLoadingMediumCompare, setIsLoadingMediumCompare] = useState(false);
  const [isLoadingSmallCompare, setIsLoadingSmallCompare] = useState(false);

  const [isSkeletonTagTask, setIsSkeletonTagTask] = useState(false);
  const [isSkeletonTagTaskCompare, setIsSkeletonTagTaskCompare] =
    useState(false);

  const [smallOptions, setSmallOptions] = useState<OptionDropdownType[]>([]);

  const [largeOptions, setLargeOptions] = useState<OptionDropdownType[]>([]);
  const [mediumOptions, setMediumOptions] = useState<OptionDropdownType[]>([]);
  const [listOptionsOrganization, setListOptionsOrganization] = useState<
    OptionDropdownType[]
  >([]);
  // Tag
  const [tagsOptions, setTagsOptions] = useState<OptionDropdownType[]>([]);
  const [selectedTags, setSelectedTags] = useState<OptionDropdownType[]>([]);

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
  const [totalDurationLargeCompare, setTotalDurationLargeCompare] =
    useState<string>('');
  const [totalDurationMediumCompare, setTotalDurationMediumCompare] =
    useState<string>('');
  const [totalDurationSmallCompare, setTotalDurationSmallCompare] =
    useState<string>('');
  const [totalDurationCategoryCompare, setTotalDurationCategoryCompare] =
    useState<string>('');

  // Total
  // Total duration
  const [totalDurationTask, setTotalDurationTask] = useState<string>('');
  const [totalDurationTaskCompare, setTotalDurationTaskCompare] =
    useState<string>('');

  // Data Date calendar
  const [isCheckCompare, setIsCheckCompare] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastMonthIndexRaw = currentMonth - 1;
    const lastMonthYear = currentYear + Math.floor(lastMonthIndexRaw / 12);
    const lastMonthIndex = ((lastMonthIndexRaw % 12) + 12) % 12;

    return new Date(lastMonthYear, lastMonthIndex + 1, 0);
  });
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastMonthIndexRaw = currentMonth - 1;
    const lastMonthYear = currentYear + Math.floor(lastMonthIndexRaw / 12);
    const lastMonthIndex = ((lastMonthIndexRaw % 12) + 12) % 12;

    return new Date(lastMonthYear, lastMonthIndex, 1);
  });

  // Data Date calendar compare
  const [endDateCompare, setEndDateCompare] = useState<Date | null>(new Date());
  const [startDateCompare, setStartDateCompare] = useState<Date>(
    getAdjustedStartDateDefault(),
  );

  // View by
  const [lineChartViewBy, setLineChartViewBy] =
    useState<OptionDropdownType | null>({
      value: StatisticViewOptions.WEEK,
      label: StatisticViewLabels.WEEK,
    });

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = selectedTags || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);
    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingOrganization(true);
    setIsLoadingSmall(true);

    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingOrganizationCompare(true);
      setIsLoadingSmallCompare(true);
    }
    setSelectedTags(updatedTagIds);
  };
  const isHasLoading =
    isLoadingLarge ||
    isLoadingMedium ||
    isLoadingOrganization ||
    isLoadingSmall ||
    isLoadingLargeCompare ||
    isLoadingMediumCompare ||
    isLoadingOrganizationCompare ||
    isLoadingSmallCompare;

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
    totalDurationCategory,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationCategoryCompare,
    setTotalDurationLarge,
    setTotalDurationMedium,
    setTotalDurationSmall,
    setTotalDurationCategory,
    setTotalDurationLargeCompare,
    setTotalDurationMediumCompare,
    setTotalDurationSmallCompare,
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
    tagsOptions,
    selectedTags,
    setSelectedTags,
    setTagsOptions,
    isSkeletonTagTask,
    setIsSkeletonTagTask,
    isSkeletonTagTaskCompare,
    setIsSkeletonTagTaskCompare,

    isLoadingLarge,
    isLoadingMedium,
    isLoadingSmall,
    isLoadingOrganization,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,

    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingSmallCompare,
    isLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setIsLoadingOrganizationCompare,

    lineChartViewBy,
    setLineChartViewBy,
    currentPage,
    setCurrentPage,
    removeTag,
    isHasLoading,
    dataMediumCalendar,
    setDataMediumCalendar,
    isDisableCalendar,
    totalDurationTask,
    totalDurationTaskCompare,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
  };

  return (
    <StatisticTagStateContext.Provider value={contextValue}>
      {children}
    </StatisticTagStateContext.Provider>
  );
};
