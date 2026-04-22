'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

import { Tags } from '@interfaces/tag';

interface ContextValue {
  dataTagDetail: Tags | undefined;
  setDataTagDetail: Dispatch<SetStateAction<Tags | undefined>>;
}

const defaultValue: ContextValue = {
  dataTagDetail: undefined,
  setDataTagDetail: () => {},
};

export const TagStateContext = createContext<ContextValue>(defaultValue);

export const TagStateProvider = ({ children }: { children: ReactNode }) => {
  const [dataTagDetail, setDataTagDetail] = useState<Tags | undefined>();

  const contextValue: ContextValue = {
    dataTagDetail,
    setDataTagDetail,
  };

  return (
    <TagStateContext.Provider value={contextValue}>
      {children}
    </TagStateContext.Provider>
  );
};
