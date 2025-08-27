'use client';
import { ReactNode, createContext, useState } from 'react';

import { VotingListItem } from '@interfaces/mvp';

interface ContextValue {
  currentVoting: VotingListItem | null;
  setCurrentVoting: (voting: VotingListItem | null) => void;
}

const defaultValue: ContextValue = {
  currentVoting: null,
  setCurrentVoting: () => {},
};

export const MVPManagementStateContext =
  createContext<ContextValue>(defaultValue);

export const MVPManagementStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [currentVoting, setCurrentVoting] = useState<VotingListItem | null>(
    null,
  );

  const contextValue: ContextValue = {
    currentVoting,
    setCurrentVoting,
  };

  return (
    <MVPManagementStateContext.Provider value={contextValue}>
      {children}
    </MVPManagementStateContext.Provider>
  );
};
