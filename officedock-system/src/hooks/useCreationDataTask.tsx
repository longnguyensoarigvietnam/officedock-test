'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { CreationDataTask } from '@interfaces/task';

interface useCreationDataTaskHooksProps {
  condition?: boolean[];
  onSuccess?: (success: CreationDataTask) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataTask = ({
  condition,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataTaskHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation task data
  const getCreationDataTask = async () => {
    const apiUrl = apiRouters.TASK_CREATION;

    const { data } = await api.get<CreationDataTask>(apiUrl);
    return data;
  };

  // Handle API get creation task data
  const {
    data: creationDataTaskData,
    refetch: refetchCreationDataTask,
    isFetched: isFetchedCreationDataTask,
  } = useQuery({
    queryKey: ['getCreationDataTask'],
    queryFn: getCreationDataTask,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataTask) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    creationDataTaskData,
    refetchCreationDataTask,
    isFetchedCreationDataTask,
  };
};

export default useCreationDataTask;
