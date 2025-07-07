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
import { StatisticViewLabels, StatisticViewOptions } from '@constants/enums';

interface ContextValue {
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
  totalDurationCategory: string;
  totalDurationCategoryCompare: string;
  isSkeletonCategoryTask: boolean;
  setIsSkeletonCategoryTask: Dispatch<SetStateAction<boolean>>;
  isSkeletonCategoryTaskCompare: boolean;
  setIsSkeletonCategoryTaskCompare: Dispatch<SetStateAction<boolean>>;

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
  totalDurationTask: string;
  setTotalDurationTask: Dispatch<SetStateAction<string>>;
  totalDurationTaskCompare: string;
  setTotalDurationTaskCompare: Dispatch<SetStateAction<string>>;

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

  // View by
  lineChartViewBy: OptionDropdownType | null;
  setLineChartViewBy: Dispatch<SetStateAction<OptionDropdownType | null>>;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  removeTag: (selected: OptionDropdownType) => void;
  isHasLoading: boolean;
}

const defaultValue: ContextValue = {
  isHasLoading: false,
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
  totalDurationTask: '',
  totalDurationTaskCompare: '',

  totalDurationLargeCompare: '',
  totalDurationMediumCompare: '',
  totalDurationSmallCompare: '',
  totalDurationCategory: '',
  totalDurationCategoryCompare: '',

  setTotalDurationLarge: () => {},
  setTotalDurationMedium: () => {},
  setTotalDurationSmall: () => {},
  setTotalDurationTask: () => {},
  setTotalDurationTaskCompare: () => {},

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
  tagsOptions: [],
  selectedTags: [],
  setSelectedTags: () => {},
  setTagsOptions: () => {},

  isSkeletonCategoryTask: false,
  setIsSkeletonCategoryTask: () => {},
  isSkeletonCategoryTaskCompare: false,
  setIsSkeletonCategoryTaskCompare: () => {},

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

  lineChartViewBy: null,
  setLineChartViewBy: () => {},
  currentPage: 1,
  setCurrentPage: () => {},
  removeTag: () => {},
};

export const StatisticStateContext = createContext<ContextValue>(defaultValue);

export const StatisticStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Loading
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [isLoadingLarge, setIsLoadingLarge] = useState(false);
  const [isLoadingMedium, setIsLoadingMedium] = useState(false);
  const [isLoadingOrganizationCompare, setIsLoadingOrganizationCompare] =
    useState(false);
  const [isLoadingLargeCompare, setIsLoadingLargeCompare] = useState(false);
  const [isLoadingMediumCompare, setIsLoadingMediumCompare] = useState(false);

  const [isSkeletonCategoryTask, setIsSkeletonCategoryTask] = useState(false);
  const [isSkeletonCategoryTaskCompare, setIsSkeletonCategoryTaskCompare] =
    useState(false);

  const [smallOptions, setSmallOptions] = useState<OptionDropdownType[]>([]);
  const [largeOptions, setLargeOptions] = useState<OptionDropdownType[]>([]);
  const [mediumOptions, setMediumOptions] = useState<OptionDropdownType[]>([]);
  const [listOptionsOrganization, setListOptionsOrganization] = useState<
    OptionDropdownType[]
  >([]);

  // Select
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType | null>({
      label: '',
      value: '',
    });
  const [selectedLarge, setSelectedLarge] = useState<OptionDropdownType | null>(
    null,
  );
  const [selectedMedium, setSelectedMedium] =
    useState<OptionDropdownType | null>(null);
  const [selectedSmall, setSelectedSmall] = useState<OptionDropdownType | null>(
    null,
  );

  // Total
  // Total duration
  const [totalDurationTask, setTotalDurationTask] = useState<string>('');
  const [totalDurationTaskCompare, setTotalDurationTaskCompare] =
    useState<string>('');

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

  // Data Date calendar
  const [isCheckCompare, setIsCheckCompare] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const [startDate, setStartDate] = useState<Date>(
    getAdjustedStartDateDefault(),
  );

  // Tag
  const [tagsOptions, setTagsOptions] = useState<OptionDropdownType[]>([]);
  const [selectedTags, setSelectedTags] = useState<OptionDropdownType[]>([]);

  // Page task list

  const [currentPage, setCurrentPage] = useState<number>(1);

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

    setSelectedTags(updatedTagIds);
  };
  const isHasLoading =
    isLoadingLarge ||
    isLoadingMedium ||
    isLoadingOrganization ||
    isLoadingLargeCompare ||
    isLoadingMediumCompare ||
    isLoadingOrganizationCompare;

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
    totalDurationTask,
    setTotalDurationTask,
    totalDurationTaskCompare,
    setTotalDurationTaskCompare,

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
    isSkeletonCategoryTask,
    setIsSkeletonCategoryTask,
    isSkeletonCategoryTaskCompare,
    setIsSkeletonCategoryTaskCompare,

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

    lineChartViewBy,
    setLineChartViewBy,
    currentPage,
    setCurrentPage,
    removeTag,
    isHasLoading,
  };

  return (
    <StatisticStateContext.Provider value={contextValue}>
      {children}
    </StatisticStateContext.Provider>
  );
};
