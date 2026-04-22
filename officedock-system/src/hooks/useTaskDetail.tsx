'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { Task } from '@interfaces/task';

interface UseTaskDetailHooksProps {
  taskId: string;
  condition?: boolean[];
  onSuccess?: (success: Task) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTaskDetail = ({
  taskId,
  onSuccess,
  onError,
  onSettled,
}: UseTaskDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get Task detail
  const getTaskDetail = async () => {
    setIsLoading(true);
    const apiUrl = apiRouters.TASK_DETAIL(taskId);

    const { data } = await api.get<Task>(apiUrl);
    return data;
  };

  // Handle API get task detail
  const {
    data: taskDetail,
    refetch: refetchTaskDetail,
    isFetched: isFetchedTasksDetail,
  } = useQuery({
    queryKey: ['getTaskDetail', taskId],
    queryFn: getTaskDetail,
    retry: 0,
    enabled: !!token && !!taskId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Task) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
      onSettled && onSettled();
    },
  });

  return {
    taskDetail,
    refetchTaskDetail,
    isFetchedTasksDetail,
  };
};

export default useTaskDetail;
