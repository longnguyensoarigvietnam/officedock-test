'use client';
import { SkillMap } from '@interfaces/skills';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataSkillMapDetail: SkillMap | undefined;
  setDataSkillMapDetail: Dispatch<SetStateAction<SkillMap | undefined>>;
}

const defaultValue: ContextValue = {
  dataSkillMapDetail: undefined,
  setDataSkillMapDetail: () => {},
};

export const SkillMapStateContext = createContext<ContextValue>(defaultValue);

export const SkillMapStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataSkillMapDetail, setDataSkillMapDetail] = useState<
    SkillMap | undefined
  >();

  const contextValue: ContextValue = {
    dataSkillMapDetail,
    setDataSkillMapDetail,
  };

  return (
    <SkillMapStateContext.Provider value={contextValue}>
      {children}
    </SkillMapStateContext.Provider>
  );
};
