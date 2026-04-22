'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

import { Organizations } from '@interfaces/organization';

interface ContextValue {
  dataOrganizationDetail: Organizations | undefined;
  setDataOrganizationDetail: Dispatch<
    SetStateAction<Organizations | undefined>
  >;
}

const defaultValue: ContextValue = {
  dataOrganizationDetail: undefined,
  setDataOrganizationDetail: () => {},
};

export const OrganizationStateContext =
  createContext<ContextValue>(defaultValue);

export const OrganizationStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataOrganizationDetail, setDataOrganizationDetail] = useState<
    Organizations | undefined
  >();

  const contextValue: ContextValue = {
    dataOrganizationDetail,
    setDataOrganizationDetail,
  };

  return (
    <OrganizationStateContext.Provider value={contextValue}>
      {children}
    </OrganizationStateContext.Provider>
  );
};
