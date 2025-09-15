'use client';
import { ReactNode, createContext, useState } from 'react';

import { CurrentPointDetail } from '@interfaces/point';

interface ContextValue {
  pointDetail: CurrentPointDetail | null;
  setPointDetail: (voting: CurrentPointDetail | null) => void;
}

const defaultValue: ContextValue = {
  pointDetail: null,
  setPointDetail: () => {},
};

export const MyPageStateContext =
  createContext<ContextValue>(defaultValue);

export const MyPageStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [pointDetail, setPointDetail] = useState<CurrentPointDetail | null>(
    null,
  );

  const contextValue: ContextValue = {
    pointDetail,
    setPointDetail,
  };

  return (
    <MyPageStateContext.Provider value={contextValue}>
      {children}
    </MyPageStateContext.Provider>
  );
};
