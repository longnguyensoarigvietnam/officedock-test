'use client';

import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { signOut } from 'next-auth/react';

import { ServerStatusCode } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { pageRouters } from '@constants/routers';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { useToast } from '@providers/ToastProvider';

export const useErrorToast = () => {
  const { showToast } = useToast();
  const router = useRouter();
  const { data: session } = useSessionCache();

  return (error: AxiosError<any>, defaultMessage: string) => {
    if (error.response) {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      } else if (error.response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      } else {
        const errorDetail = error.response.data?.detail || defaultMessage;
        showToast({
          variant: 'error',
          description: errorDetail,
        });
      }
    }
  };
};
