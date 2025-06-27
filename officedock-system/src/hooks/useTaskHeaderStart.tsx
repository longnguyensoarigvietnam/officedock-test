'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { TaskRunningType } from '@interfaces/task';

interface UseTaskHeaderStartHooksProps {
  userId: string;
  condition?: boolean[];
  onSuccess?: (success: TaskRunningType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTaskHeaderStart = ({
  userId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseTaskHeaderStartHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get User detail
  const getTaskHeaderStart = async () => {
    const apiUrl = apiRouters.TASK_HEADER_START;
    const { data } = await api.get<TaskRunningType>(apiUrl);
    return data;
  };

  // Handle API get user detail
  const {
    data: dataTaskHeaderStart,
    refetch: refetchTaskHeaderStart,
    isFetched: isFetchedUsersDetail,
  } = useQuery({
    queryKey: ['getTaskHeaderStart', userId],
    queryFn: getTaskHeaderStart,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),

    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: TaskRunningType) => {
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
    dataTaskHeaderStart,
    refetchTaskHeaderStart,
    isFetchedUsersDetail,
  };
};

export default useTaskHeaderStart;
