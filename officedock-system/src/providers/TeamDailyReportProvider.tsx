'use client';
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
}

const defaultValue: ContextValue = {
  dataDatePicker: new Date(),
  setDataDatePicker: () => {},
};

export const TeamDailyStateContext = createContext<ContextValue>(defaultValue);

export const TeamDailyStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataDatePicker, setDataDatePicker] = useState<Date>(new Date());

  const contextValue: ContextValue = {
    dataDatePicker,
    setDataDatePicker,
  };

  return (
    <TeamDailyStateContext.Provider value={contextValue}>
      {children}
    </TeamDailyStateContext.Provider>
  );
};
