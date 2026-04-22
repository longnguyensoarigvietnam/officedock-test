'use client';
import api from '@base/api';
import { AxiosError, AxiosResponse } from 'axios';
import { useMutation } from 'react-query';

import { apiRouters } from '@constants/routers';
import { useToast } from '@providers/ToastProvider';
import { ERROR_UPDATE_MESSAGE } from '@constants/message';

interface UseCalculateDurationTaskProps {
  onSuccess?: (success: AxiosResponse, variant: variantType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}
interface variantType {
  id: string;
  type: string;
}

const useCalculateDurationTask = ({
  onSuccess,
  onError,
  onSettled,
}: UseCalculateDurationTaskProps) => {
  const { showToast } = useToast();

  const handleSwitchTaskState = async ({
    id,
    type,
    isStart,
  }: {
    id: string;
    type: string;
    isStart?: boolean;
  }) => {
    return await api.post(apiRouters.TASK_CALCULATE_DURATION(), {
      id,
      type,
      isStart,
    });
  };

  const {
    mutate: calculateDurationTask,
    isLoading,
    isError,
    isSuccess,
    data,
    error,
  } = useMutation(handleSwitchTaskState, {
    onSuccess: async (response, variant) => {
      onSuccess && onSuccess(response, variant);
    },
    onError: (error: AxiosError<{ task: string }>) => {
      showToast({
        variant: 'error',
        description: error.response?.data?.task?.[0] || ERROR_UPDATE_MESSAGE,
      });

      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { calculateDurationTask, isLoading, isError, isSuccess, data, error };
};

export default useCalculateDurationTask;
