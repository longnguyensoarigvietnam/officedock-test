'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { TaskDuration } from '@interfaces/task';
import { OPTION_DEFAULT_TASK } from '@constants';

interface UseTaskDurationDetailHooksProps {
  item: {
    id: string;
    type: string;
  };
  condition?: boolean[];
  onSuccess?: (success: TaskDuration) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTaskDurationDetail = ({
  item,
  onSuccess,
  onError,
  onSettled,
}: UseTaskDurationDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get task duration detail
  const getTaskDurationDetail = async () => {
    if (
      !item.id ||
      !item.type ||
      item.id === undefined ||
      item.id === 'undefined' ||
      item.id == OPTION_DEFAULT_TASK.value
    ) {
      return;
    } else {
      const apiUrl = `${apiRouters.TASK_DURATION_DETAIL()}?id=${item.id}&type=${item.type}`;
      const { data } = await api.get<TaskDuration>(apiUrl);
      return data;
    }
  };

  // Handle API get task duration detail
  const {
    data: taskDurationDetail,
    refetch: refetchTaskDurationDetail,
    isFetched: isFetchedTasksDetail,
  } = useQuery({
    queryKey: ['getTaskDurationDetail', item],
    queryFn: getTaskDurationDetail,
    retry: 0,
    enabled: !!token && !!item,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: TaskDuration) => {
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
    taskDurationDetail,
    refetchTaskDurationDetail,
    isFetchedTasksDetail,
  };
};

export default useTaskDurationDetail;
