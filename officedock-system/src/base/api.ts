import axios, { AxiosInstance } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { Session } from 'next-auth';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';

const instance: AxiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/system`,
  timeout: 3600000, // Request timeout in milliseconds
});

let cachedSession: Awaited<ReturnType<typeof getSession>> | null = null;
let isFetching = false;
let waiting: ((value: Awaited<ReturnType<typeof getSession>>) => void)[] = [];

const getCachedSession = async () => {
  if (
    !cachedSession ||
    new Date(cachedSession.expires) <= new Date()
  ) {
    if (isFetching) {
      return new Promise((resolve) => waiting.push(resolve));
    }

    isFetching = true;
    cachedSession = await getSession();

    // Resolve all pending consumers
    waiting.forEach((resolve) => resolve(cachedSession!));
    waiting = [];
    isFetching = false;
  }

  return cachedSession;
};

instance.interceptors.request.use(async (config) => {
  const session = await getCachedSession();

  if ((session as Session)?.accessToken) {
    config.headers.Authorization = `Bearer ${(session as Session).accessToken}`;
  }

  return config;
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (
      status === ServerStatusCode.UNAUTHORIZED ||
      status === ServerStatusCode.LOCKED || 
      status === ServerStatusCode.FORBIDDEN
    ) {
      const session = await getCachedSession();
      if (session) {
        await signOut({ redirect: false });
        window.location.href = pageRouters.LOGIN.href;
      }
    }

    return Promise.reject(error);
  },
);

export default instance;
