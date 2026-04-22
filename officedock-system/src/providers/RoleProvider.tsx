'use client';
import { RoleDetail } from '@interfaces/role';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataRoleDetail: RoleDetail | undefined;
  setDataRoleDetail: Dispatch<SetStateAction<RoleDetail | undefined>>;
}

const defaultValue: ContextValue = {
  dataRoleDetail: undefined,
  setDataRoleDetail: () => {},
};

export const RoleStateContext = createContext<ContextValue>(defaultValue);

export const RoleStateProvider = ({ children }: { children: ReactNode }) => {
  const [dataRoleDetail, setDataRoleDetail] = useState<
    RoleDetail | undefined
  >();

  const contextValue: ContextValue = {
    dataRoleDetail,
    setDataRoleDetail,
  };

  return (
    <RoleStateContext.Provider value={contextValue}>
      {children}
    </RoleStateContext.Provider>
  );
};
