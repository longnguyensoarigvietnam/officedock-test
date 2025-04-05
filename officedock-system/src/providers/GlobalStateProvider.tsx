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
  abortChatSendingMessageControllerRef: MutableRefObject<AbortController | null>
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
  cancelUploadChatFiles: () => void
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
  setIsExtendCalendar: () => {},
  setTotalNotifications: () => {},
  setExpanded: () => {},
  setDashboardMembersWithAvatars: () => {},
  setSelectedOrganization: () => {},
  setIsChatFilesUploading: () => {},
  cancelUploadChatFiles: () => {}
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
  const [isChatFilesUploading, setIsChatFilesUploading] = useState(false);
  const abortChatSendingMessageControllerRef = useRef<AbortController | null>(null);

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
    setSelectedOrganization,
    setDashboardMembersWithAvatars,
    setExpanded,
    setIsExtendCalendar,
    setTotalNotifications,
    setIsChatFilesUploading,
    cancelUploadChatFiles
  };

  return (
    <GlobalStateContext.Provider value={contextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
};
