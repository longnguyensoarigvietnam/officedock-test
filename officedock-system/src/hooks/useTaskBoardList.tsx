'use client';

import { useContext, useState } from 'react';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import api from '@base/api';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';

import { KanbanDataResponse, StatusTask } from '@interfaces/task';
import { TaskContext } from '@providers/TaskProvider';
import { ResponseError } from '@interfaces/response';
import { OptionDropdownType } from '@interfaces/common';
import { useSessionCache } from '@providers/SessionCacheProvider';

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
  orderingOptions?: {
    category_ids: OptionDropdownType[];
    tag_ids: OptionDropdownType[];
    organization_ids: OptionDropdownType[];
  } | null,
) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoadingDataTask } = useContext(TaskContext);

  const [numberPages, setNumberPages] = useState<
    { id: string; count: number; numPages: number; hasMores: boolean }[]
  >([]);
  // Handle call API get task board list
  const getTaskBoardList = async ({ signal }: { signal?: AbortSignal }) => {
    setIsLoadingDataTask(true);
    if (!statusList || statusList.length === 0) {
      setIsLoadingDataTask(true);
      return [];
    }

    const fetchTasksForStatus = async (statusId: string) => {
      const params = new URLSearchParams({
        page_size: String(PAGINATION_PAGE_SIZE_KANBAN),
        status_id: String(statusId),
        ...(ordering && { ordering }),
        ...(filter?.userId && { user_id: String(filter.userId) }),
        ...(filter?.tagId && { tag_id: String(filter.tagId) }),
        ...(filter?.search && { search: filter.search }),

        ...(orderingOptions?.organization_ids?.length && {
          organization_ids: orderingOptions.organization_ids
            .map((item) => item.value)
            .join(','),
        }),
        ...(orderingOptions?.category_ids?.length && {
          category_ids: orderingOptions.category_ids
            .map((item) => item.value)
            .join(','),
        }),
        ...(orderingOptions?.tag_ids?.length && {
          tag_ids: orderingOptions.tag_ids.map((item) => item.value).join(','),
        }),
      });

      const apiUrl = `${apiRouters.TASK_BOARD_LIST}?${params.toString()}`;

      const { data } = await api.get<KanbanDataResponse>(apiUrl, { signal });
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
      ? ['getTaskBoardList', filter, ordering, statusList, orderingOptions]
      : ['getTaskBoardList'],
    queryFn: ({ signal }) => getTaskBoardList({ signal }),

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
