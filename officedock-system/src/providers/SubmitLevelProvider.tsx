'use client';
import { SubmitLevel } from '@interfaces/skills';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataSubmitLevelDetail: SubmitLevel | undefined;
  setDataSubmitLevelDetail: Dispatch<SetStateAction<SubmitLevel | undefined>>;
}

const defaultValue: ContextValue = {
  dataSubmitLevelDetail: undefined,
  setDataSubmitLevelDetail: () => {},
};

export const SubmitLevelStateContext =
  createContext<ContextValue>(defaultValue);

export const SubmitLevelStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataSubmitLevelDetail, setDataSubmitLevelDetail] = useState<
    SubmitLevel | undefined
  >();

  const contextValue: ContextValue = {
    dataSubmitLevelDetail,
    setDataSubmitLevelDetail,
  };

  return (
    <SubmitLevelStateContext.Provider value={contextValue}>
      {children}
    </SubmitLevelStateContext.Provider>
  );
};
