'use client';
import { User } from '@interfaces/user';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  dataUserDetail: User | undefined;
  setDataUserDetail: Dispatch<SetStateAction<User | undefined>>;
}

const defaultValue: ContextValue = {
  dataUserDetail: undefined,
  setDataUserDetail: () => {},
};

export const UserStateContext = createContext<ContextValue>(defaultValue);

export const UserStateProvider = ({ children }: { children: ReactNode }) => {
  const [dataUserDetail, setDataUserDetail] = useState<User | undefined>();

  const contextValue: ContextValue = {
    dataUserDetail,
    setDataUserDetail,
  };

  return (
    <UserStateContext.Provider value={contextValue}>
      {children}
    </UserStateContext.Provider>
  );
};
