'use client';
import { createContext, useState, ReactNode } from 'react';

import Spinner from '@components/common/Spinner';

export interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
});

const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setLoading] = useState(false);

  const setIsLoading = (value: boolean) => setLoading(value);
  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && (
        <div className="z-[90] top-0 fixed overflow-hidden h-screen left-0 bg-slate-100 opacity-50 w-full flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
};

export { LoadingContext, LoadingProvider };
