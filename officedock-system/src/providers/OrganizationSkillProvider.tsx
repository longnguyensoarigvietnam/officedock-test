'use client';
import { OrganizationSkillDetail } from '@interfaces/skills';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataOrganizationSkillDetail: OrganizationSkillDetail[] | undefined;
  setDataOrganizationSkillDetail: Dispatch<
    SetStateAction<OrganizationSkillDetail[] | undefined>
  >;
}

const defaultValue: ContextValue = {
  dataOrganizationSkillDetail: undefined,
  setDataOrganizationSkillDetail: () => {},
};

export const OrganizationSkillStateContext =
  createContext<ContextValue>(defaultValue);

export const OrganizationSkillStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataOrganizationSkillDetail, setDataOrganizationSkillDetail] =
    useState<OrganizationSkillDetail[] | undefined>();

  const contextValue: ContextValue = {
    dataOrganizationSkillDetail,
    setDataOrganizationSkillDetail,
  };

  return (
    <OrganizationSkillStateContext.Provider value={contextValue}>
      {children}
    </OrganizationSkillStateContext.Provider>
  );
};
