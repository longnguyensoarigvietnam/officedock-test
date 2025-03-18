'use client';
import { CalendarDashboardMember } from '@interfaces/calendar';
import { OptionDropdownType } from '@interfaces/common';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  isExtendCalendar: boolean;
  totalNotifications: number;
  expanded: boolean;
  dashboardMembersWithAvatars: CalendarDashboardMember[];
  selectedOrganization: OptionDropdownType | undefined;
  setIsExtendCalendar: Dispatch<SetStateAction<boolean>>;
  setTotalNotifications: Dispatch<SetStateAction<number>>;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  setDashboardMembersWithAvatars: Dispatch<SetStateAction<CalendarDashboardMember[]>>;
  setSelectedOrganization: Dispatch<SetStateAction<OptionDropdownType | undefined>>
}

const defaultValue: ContextValue = {
  isExtendCalendar: false,
  totalNotifications: 0,
  expanded: true,
  dashboardMembersWithAvatars: [],
  selectedOrganization: {
    label: '',
    value: ''
  },
  setIsExtendCalendar: () => {},
  setTotalNotifications: () => {},
  setExpanded: () => {},
  setDashboardMembersWithAvatars: () => {},
  setSelectedOrganization: () => {}
};

export const GlobalStateContext = createContext<ContextValue>(defaultValue);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [isExtendCalendar, setIsExtendCalendar] = useState(false);
  const [dashboardMembersWithAvatars, setDashboardMembersWithAvatars] = useState<
    CalendarDashboardMember[]
  >([]);
  const [expanded, setExpanded] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [selectedOrganization, setSelectedOrganization] =
      useState<OptionDropdownType>();

  const contextValue: ContextValue = {
    isExtendCalendar,
    totalNotifications,
    expanded,
    dashboardMembersWithAvatars,
    selectedOrganization,
    setSelectedOrganization,
    setDashboardMembersWithAvatars,
    setExpanded,
    setIsExtendCalendar,
    setTotalNotifications,
  };

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
};
