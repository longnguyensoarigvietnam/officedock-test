'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { KanbanDataResponse } from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { useRouter } from 'next/navigation';

interface FilterProps {
  userId?: string;
  tagId?: string;
  search?: string;
}

const useTaskBoardListMore = (
  filter?: FilterProps,
  ordering?: string,
  statusId?: string,
  page?: number,
) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;
  // Handle call API get task board list
  const getTaskBoardListMore = async () => {
    if (!page || page < 2) return;
    const apiUrl = `${apiRouters.TASK_BOARD_LIST}?status_id=${statusId}&page=${page}${ordering ? `&ordering=${ordering}` : ''}${filter?.userId ? `&user_id=${filter.userId}` : ''}${filter?.tagId ? `&tag_id=${filter.tagId}` : ''}${filter?.search ? `&search=${filter.search}` : ''}`;

    const { data } = await api.get<KanbanDataResponse>(apiUrl);
    return data.results;
  };

  // Handle API get task board list
  const {
    data: taskBoardListMore,
    refetch: refetchTaskBoardListMore,
    isFetched: isFetchedTaskBoards,
  } = useQuery({
    queryKey: ['getTaskBoardListMore', [filter, ordering, page, statusId]],
    queryFn: getTaskBoardListMore,
    retry: 0,
    enabled: !!token,
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
    onSettled: () => {},
  });

  return { taskBoardListMore, refetchTaskBoardListMore, isFetchedTaskBoards };
};

export default useTaskBoardListMore;
