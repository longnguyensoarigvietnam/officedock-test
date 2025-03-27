'use client';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { KanbanDataTeamResponse } from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { useContext } from 'react';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';

interface FilterProps {
  userId?: string;
  tagId?: string;
  search?: string;
}

const useTaskBoardTeam = ({
  organization_id,
  filter,
  ordering,
  onSuccess,
}: {
  organization_id?: string;
  filter?: FilterProps;
  ordering?: string;
  onSuccess?: (data: KanbanDataTeamResponse) => void;
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { setIsLoadingDataTask } = useContext(TaskTeamStateContext);

  const token = session?.accessToken;
  // Handle call API get task board list
  const getTaskBoardListTeam = async () => {
    if (!organization_id) return null;
    setIsLoadingDataTask(true);
    const apiUrl = `${apiRouters.TASK_TEAM_LIST}?organization_id=${organization_id}&page_size=10${ordering ? `&ordering=${ordering}` : ''}${filter?.userId ? `&user_id=${filter.userId}` : ''}${filter?.tagId ? `&tag_id=${filter.tagId}` : ''}${filter?.search ? `&search=${filter.search}` : ''}`;

    const { data } = await api.get<KanbanDataTeamResponse>(apiUrl);
    return data;
  };

  // Handle API get task board list
  const {
    data: taskBoardListTeam,
    refetch: refetchTaskBoardListTeam,
    isFetched: isFetchedTaskBoards,
  } = useQuery({
    queryKey: ['getTaskTeamList', [filter, ordering, organization_id]],
    queryFn: getTaskBoardListTeam,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: KanbanDataTeamResponse) => {
      onSuccess && onSuccess(data);
    },
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

  return { taskBoardListTeam, refetchTaskBoardListTeam, isFetchedTaskBoards };
};

export default useTaskBoardTeam;
