'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

const SessionCacheContext = createContext<ReturnType<typeof useSession> | null>(
  null,
);

export const SessionCacheProvider = ({ children }: { children: ReactNode }) => {
  const session = useSession();

  const [cachedSession, setCachedSession] = useState<ReturnType<
    typeof useSession
  > | null>(null);

  useEffect(() => {
    if (session.status !== 'loading') {
      setCachedSession(session);
    }
  }, [session.status, session.data]);

  if (!cachedSession) return null;

  return (
    <SessionCacheContext.Provider value={cachedSession}>
      {children}
    </SessionCacheContext.Provider>
  );
};

export const useSessionCache = () => {
  const context = useContext(SessionCacheContext);
  if (!context) {
    throw new Error('');
  }
  return context;
};
