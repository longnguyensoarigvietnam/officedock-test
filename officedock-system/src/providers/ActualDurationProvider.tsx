'use client';
import { ActualDurationDetail } from '@interfaces/durations';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  selectedTaskSchedule: ActualDurationDetail | undefined;
  setSelectedTaskSchedule: Dispatch<
    SetStateAction<ActualDurationDetail | undefined>
  >;
}

const defaultValue: ContextValue = {
  selectedTaskSchedule: undefined,
  setSelectedTaskSchedule: () => {},
};

export const ActualDurationStateContext =
  createContext<ContextValue>(defaultValue);

export const ActualDurationStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [selectedTaskSchedule, setSelectedTaskSchedule] =
    useState<ActualDurationDetail>();

  const contextValue: ContextValue = {
    selectedTaskSchedule,
    setSelectedTaskSchedule,
  };

  return (
    <ActualDurationStateContext.Provider value={contextValue}>
      {children}
    </ActualDurationStateContext.Provider>
  );
};
