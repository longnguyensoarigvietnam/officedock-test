'use client';

import { useContext, useState } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import api from '@base/api';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';

import { KanbanDataResponse, StatusTask } from '@interfaces/task';
import { TaskContext } from '@providers/TaskProvider';
import { ResponseError } from '@interfaces/response';

interface FilterProps {
  userId?: string;
  tagId?: string;
  search?: string;
}

const useTaskBoardList = (
  filter?: FilterProps,
  ordering?: string,
  statusList?: StatusTask[],
  isReadyToFetch?: boolean,
) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoadingDataTask } = useContext(TaskContext);

  const [numberPages, setNumberPages] = useState<
    { id: string; count: number; numPages: number; hasMores: boolean }[]
  >([]);
  // Handle call API get task board list
  const getTaskBoardList = async () => {
    setIsLoadingDataTask(true);
    if (!statusList || statusList.length === 0) {
      setIsLoadingDataTask(true);
      return [];
    }

    const fetchTasksForStatus = async (statusId: string) => {
      const apiUrl = `${apiRouters.TASK_BOARD_LIST}?page_size=${PAGINATION_PAGE_SIZE_KANBAN}&status_id=${statusId}${ordering ? `&ordering=${ordering}` : ''}${filter?.userId ? `&user_id=${filter.userId}` : ''}${filter?.tagId ? `&tag_id=${filter.tagId}` : ''}${filter?.search ? `&search=${filter.search}` : ''}`;
      const { data } = await api.get<KanbanDataResponse>(apiUrl);
      return {
        statusId,
        numberPages: data.numPages,
        results: data.results,
        count: data.count,
        hasMoreData: data.hasNext,
      };
    };

    const allTasks = await Promise.all(
      statusList.map((status) => fetchTasksForStatus(`${status.id}`)),
    );

    const items = allTasks.flatMap((taskData) => taskData.results);
    const pages = allTasks.map((taskData) => ({
      id: taskData.statusId,
      count: taskData.count,
      numPages: taskData.numberPages,
      hasMores: taskData.hasMoreData,
    }));

    setNumberPages(pages);
    setIsLoadingDataTask(false);

    return items;
  };
  // Handle API get task board list
  const {
    data: taskBoardList,
    refetch: refetchTaskBoardList,
    isFetched: isFetchedTaskBoards,
  } = useQuery({
    queryKey: isReadyToFetch
      ? ['getTaskBoardList', filter, ordering, statusList]
      : ['getTaskBoardList'],
    queryFn: getTaskBoardList,
    retry: 0,
    enabled: isReadyToFetch && !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {
      setIsLoadingDataTask(false);
    },
  });
  return {
    taskBoardList,
    numberPages,
    refetchTaskBoardList,
    isFetchedTaskBoards,
  };
};

export default useTaskBoardList;
