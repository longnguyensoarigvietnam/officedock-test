import axios, { AxiosInstance } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { ServerStatusCode } from '@constants/enums';

const instance: AxiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin`,
  timeout: 50000, // Request timeout in milliseconds
});

// TODO: Implement for refresh token

// Add an interceptor to include the session token in all requests
instance.interceptors.request.use(async (config) => {
  const session = await getSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (
      error.response?.status === ServerStatusCode.UNAUTHORIZED ||
      error.response?.status === ServerStatusCode.FORBIDDEN
    ) {
      const session = await getSession();
      if (session) {
        await signOut();
      }
    }
    return Promise.reject(error);
  },
);
export default instance;
