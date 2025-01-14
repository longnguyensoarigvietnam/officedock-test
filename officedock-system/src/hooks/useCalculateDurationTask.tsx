'use client';
import api from '@base/api';
import { AxiosError, AxiosResponse } from 'axios';
import { useMutation } from 'react-query';

import { apiRouters } from '@constants/routers';
import { useToast } from '@providers/ToastProvider';
import { ERROR_UPDATE_MESSAGE } from '@constants/message';

interface UseCalculateDurationTaskProps {
  onSuccess?: (success: AxiosResponse) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
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
  }: {
    id: string;
    type: string;
  }) => {
    return await api.post(apiRouters.TASK_CALCULATE_DURATION(), {
      id,
      type,
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
    onSuccess: async (response) => {
      onSuccess && onSuccess(response);
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
