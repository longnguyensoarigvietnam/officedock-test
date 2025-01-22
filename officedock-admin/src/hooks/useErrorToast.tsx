'use client';

import { ServerStatusCode } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { useToast } from '@providers/ToastProvider';
import { AxiosError } from 'axios';

export const useErrorToast = () => {
  const { showToast } = useToast();
  return (error: AxiosError<any>, defaultMessage: string) => {
    if (error.response) {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
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
