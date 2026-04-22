'use client';
import { OptionDropdownType } from '@interfaces/common';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataDatePicker: Date;
  setDataDatePicker: Dispatch<SetStateAction<Date>>;
  selectedOrganization: OptionDropdownType;
  setSelectedOrganization: Dispatch<SetStateAction<OptionDropdownType>>;
}

const defaultValue: ContextValue = {
  dataDatePicker: new Date(),
  setDataDatePicker: () => {},
  selectedOrganization: {
    label: 'すべて',
    value: 'ALL',
  },
  setSelectedOrganization: () => {},
};

export const TeamDailyStateContext = createContext<ContextValue>(defaultValue);

export const TeamDailyStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataDatePicker, setDataDatePicker] = useState<Date>(new Date());
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType>({
      label: 'すべて',
      value: 'ALL',
    });

  const contextValue: ContextValue = {
    dataDatePicker,
    setDataDatePicker,
    selectedOrganization,
    setSelectedOrganization,
  };

  return (
    <TeamDailyStateContext.Provider value={contextValue}>
      {children}
    </TeamDailyStateContext.Provider>
  );
};
