'use client';
import { CalendarDashboardMember } from '@interfaces/calendar';
import { OptionDropdownType } from '@interfaces/common';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
  useRef,
  MutableRefObject,
  createRef,
} from 'react';

interface ContextValue {
  isExtendCalendar: boolean;
  totalNotifications: number;
  expanded: boolean;
  dashboardMembersWithAvatars: CalendarDashboardMember[];
  selectedOrganization: OptionDropdownType | undefined;
  isChatFilesUploading: boolean;
  abortChatSendingMessageControllerRef: MutableRefObject<AbortController | null>;
  lastVisitedByTab: {
    firstTab: string;
    secondTab: string;
  };
  setIsExtendCalendar: Dispatch<SetStateAction<boolean>>;
  setTotalNotifications: Dispatch<SetStateAction<number>>;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  setDashboardMembersWithAvatars: Dispatch<
    SetStateAction<CalendarDashboardMember[]>
  >;
  setSelectedOrganization: Dispatch<
    SetStateAction<OptionDropdownType | undefined>
  >;
  setIsChatFilesUploading: Dispatch<SetStateAction<boolean>>;
  cancelUploadChatFiles: () => void;
  organizationTeamList: OptionDropdownType[];
  setOrganizationTeamList: Dispatch<SetStateAction<OptionDropdownType[]>>;
  getDelay: () => number;
  recordHover: () => void;
  setLastVisitedByTab: Dispatch<
    SetStateAction<{
      firstTab: string;
      secondTab: string;
    }>
  >;
}

const defaultValue: ContextValue = {
  isExtendCalendar: false,
  totalNotifications: 0,
  expanded: true,
  dashboardMembersWithAvatars: [],
  selectedOrganization: {
    label: '',
    value: '',
  },
  isChatFilesUploading: false,
  abortChatSendingMessageControllerRef: createRef<AbortController>(),
  lastVisitedByTab: {
    firstTab: '',
    secondTab: '',
  },
  setIsExtendCalendar: () => {},
  setTotalNotifications: () => {},
  setExpanded: () => {},
  setDashboardMembersWithAvatars: () => {},
  setSelectedOrganization: () => {},
  setIsChatFilesUploading: () => {},
  cancelUploadChatFiles: () => {},
  organizationTeamList: [],
  setOrganizationTeamList: () => {},
  getDelay: () => 100 | 1000,
  recordHover: () => {},
  setLastVisitedByTab: () => {},
};

export const GlobalStateContext = createContext<ContextValue>(defaultValue);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [isExtendCalendar, setIsExtendCalendar] = useState(false);
  const [dashboardMembersWithAvatars, setDashboardMembersWithAvatars] =
    useState<CalendarDashboardMember[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType>();

  const [organizationTeamList, setOrganizationTeamList] = useState<
    OptionDropdownType[]
  >([]);
  const [lastVisitedByTab, setLastVisitedByTab] = useState<{
    firstTab: string;
    secondTab: string;
  }>({
    firstTab: '',
    secondTab: '',
  });

  // Uploading files
  const [isChatFilesUploading, setIsChatFilesUploading] = useState(false);
  const abortChatSendingMessageControllerRef = useRef<AbortController | null>(
    null,
  );
  const lastHoverTimeRef = useRef(0);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDelay = () => {
    const now = Date.now();
    const diff = now - lastHoverTimeRef.current;
    return diff < 3000 ? 100 : 1000; // 100ms if recent, otherwise 1000ms
  };

  const recordHover = () => {
    lastHoverTimeRef.current = Date.now();

    // reset reference after 3000ms
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = setTimeout(() => {
      lastHoverTimeRef.current = 0;
    }, 3000);
  };

  const cancelUploadChatFiles = () => {
    abortChatSendingMessageControllerRef.current?.abort();
    abortChatSendingMessageControllerRef.current = null;
    setIsChatFilesUploading(false);
  };

  const contextValue: ContextValue = {
    isExtendCalendar,
    totalNotifications,
    expanded,
    dashboardMembersWithAvatars,
    selectedOrganization,
    isChatFilesUploading,
    abortChatSendingMessageControllerRef,
    organizationTeamList,
    lastVisitedByTab,
    setOrganizationTeamList,
    setSelectedOrganization,
    setDashboardMembersWithAvatars,
    setExpanded,
    setIsExtendCalendar,
    setTotalNotifications,
    setIsChatFilesUploading,
    cancelUploadChatFiles,
    getDelay,
    recordHover,
    setLastVisitedByTab,
  };

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
};
