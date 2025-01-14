'use client';
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
  setIsExtendCalendar: Dispatch<SetStateAction<boolean>>;
  setTotalNotifications: Dispatch<SetStateAction<number>>;
  setExpanded: Dispatch<SetStateAction<boolean>>;
}

const defaultValue: ContextValue = {
  isExtendCalendar: false,
  totalNotifications: 0,
  expanded: true,
  setIsExtendCalendar: () => {},
  setTotalNotifications: () => {},
  setExpanded: () => {},
};

export const GlobalStateContext = createContext<ContextValue>(defaultValue);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [isExtendCalendar, setIsExtendCalendar] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);

  const contextValue: ContextValue = {
    isExtendCalendar,
    totalNotifications,
    expanded,
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
