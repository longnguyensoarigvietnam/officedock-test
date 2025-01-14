'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

import { Skill } from '@interfaces/skills';

interface ContextValue {
  dataSkillDetail: Skill | undefined;
  setDataSkillDetail: Dispatch<SetStateAction<Skill | undefined>>;
}

const defaultValue: ContextValue = {
  dataSkillDetail: undefined,
  setDataSkillDetail: () => {},
};

export const SkillStateContext = createContext<ContextValue>(defaultValue);

export const SkillStateProvider = ({ children }: { children: ReactNode }) => {
  const [dataSkillDetail, setDataSkillDetail] = useState<Skill | undefined>();

  const contextValue: ContextValue = {
    dataSkillDetail,
    setDataSkillDetail,
  };

  return (
    <SkillStateContext.Provider value={contextValue}>
      {children}
    </SkillStateContext.Provider>
  );
};
