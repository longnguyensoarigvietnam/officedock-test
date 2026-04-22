'use client';
import { Organizations } from '@interfaces/organization';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataHierarchyDetail: Organizations | undefined;
  setDataHierarchyDetail: Dispatch<SetStateAction<Organizations | undefined>>;
}

const defaultValue: ContextValue = {
  dataHierarchyDetail: undefined,
  setDataHierarchyDetail: () => {},
};

export const HierarchyStateContext = createContext<ContextValue>(defaultValue);

export const HierarchyStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataHierarchyDetail, setDataHierarchyDetail] = useState<
    Organizations | undefined
  >();

  const contextValue: ContextValue = {
    dataHierarchyDetail,
    setDataHierarchyDetail,
  };

  return (
    <HierarchyStateContext.Provider value={contextValue}>
      {children}
    </HierarchyStateContext.Provider>
  );
};
