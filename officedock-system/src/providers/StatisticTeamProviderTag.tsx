'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

import { OptionDropdownType } from '@interfaces/common';

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
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
  }[];
  tagsOptions: OptionDropdownType[];
  selectedTags: OptionDropdownType[];
  setTotalDurationCategory: Dispatch<SetStateAction<string>>;
  setTotalDurationCategoryCompare: Dispatch<SetStateAction<string>>;

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
  setListMemberTeam: Dispatch<
    SetStateAction<
      {
        id: number;
        fullName: string;
        color: string;
      }[]
    >
  >;
}

const defaultValue: ContextValue = {
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
  setTotalDurationCategory: () => {},
  setTotalDurationCategoryCompare: () => {},

  totalDurationLargeCompare: '',
  totalDurationMediumCompare: '',
  totalDurationSmallCompare: '',
  totalDurationCategoryCompare: '',

  setTotalDurationLarge: () => {},
  setTotalDurationMedium: () => {},
  setTotalDurationSmall: () => {},
  setTotalDurationLargeCompare: () => {},
  setTotalDurationMediumCompare: () => {},
  setTotalDurationSmallCompare: () => {},

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
  selectedTags: [],
  setSelectedTags: () => {},
  setTagsOptions: () => {},
};

export const StatisticTeamTagsStateContext =
  createContext<ContextValue>(defaultValue);

export const StatisticTeamTagsStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
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
    new Date(
      new Date().setMonth(new Date().getMonth() - 1) + 24 * 60 * 60 * 1000,
    ),
  );

  // Data Date calendar compare
  const [endDateCompare, setEndDateCompare] = useState<Date | null>(new Date());
  const [startDateCompare, setStartDateCompare] = useState<Date>(
    new Date(
      new Date().setMonth(new Date().getMonth() - 1) + 24 * 60 * 60 * 1000,
    ),
  );

  // Tag
  const [tagsOptions, setTagsOptions] = useState<OptionDropdownType[]>([]);
  const [selectedTags, setSelectedTags] = useState<OptionDropdownType[]>([]);

  // Member
  const [listMemberTeam, setListMemberTeam] = useState<
    {
      id: number;
      fullName: string;
      color: string;
    }[]
  >([]);

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
    selectedTags,
    setSelectedTags,
    setTagsOptions,
  };

  return (
    <StatisticTeamTagsStateContext.Provider value={contextValue}>
      {children}
    </StatisticTeamTagsStateContext.Provider>
  );
};
