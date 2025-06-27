'use client';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { KanbanDataTeamResponse } from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { useContext } from 'react';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import { OptionDropdownType } from '@interfaces/common';
import { useSessionCache } from '@providers/SessionCacheProvider';

interface FilterProps {
  userId?: OptionDropdownType[];
  tagId?: string;
  search?: string;
  is_cross_team_task?: boolean;
}

const useTaskBoardTeam = ({
  organization_id,
  current_screen,
  filter,
  ordering,
  isReadyToFetch,
  onSuccess,
  onError,
}: {
  current_screen?: string;
  organization_id?: string;
  filter?: FilterProps;
  ordering?: string;

  isReadyToFetch?: boolean;
  onError?: () => void;

  onSuccess?: (data: KanbanDataTeamResponse) => void;
}) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const { setIsLoadingDataTask } = useContext(TaskTeamStateContext);

  const token = session?.accessToken;
  // Handle call API get task board list
  const getTaskBoardListTeam = async ({ signal }: { signal?: AbortSignal }) => {
    if (!organization_id) return null;

    setIsLoadingDataTask(true);
    const params = new URLSearchParams({
      organization_id: String(organization_id),
      page_size: '10',
      ...(ordering && { ordering }),
      ...(filter?.userId && {
        user_ids: filter.userId.map((item) => item.value).join(','),
      }),
      ...(filter?.tagId && { tag_id: String(filter.tagId) }),
      ...(filter?.is_cross_team_task && {
        is_cross_team_task: String(filter.is_cross_team_task),
      }),
      ...(filter?.search && { search: filter.search }),
      ...(current_screen && { current_screen: current_screen }),
    });

    const apiUrl = `${apiRouters.TASK_TEAM_LIST}?${params.toString()}`;

    const { data } = await api.get<KanbanDataTeamResponse>(apiUrl, { signal });
    return data;
  };

  // Handle API get task board list
  const {
    data: taskBoardListTeam,
    refetch: refetchTaskBoardListTeam,
    isFetched: isFetchedTaskBoards,
  } = useQuery({
    queryKey: isReadyToFetch
      ? ['getTaskTeamList', [filter, ordering, organization_id]]
      : ['getTaskTeamList'],
    queryFn: ({ signal }) => getTaskBoardListTeam({ signal }),
    retry: 0,
    enabled: isReadyToFetch && !!token,
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
      onError && onError();
    },
    onSettled: () => {
      setIsLoadingDataTask(false);
    },
  });

  return { taskBoardListTeam, refetchTaskBoardListTeam, isFetchedTaskBoards };
};

export default useTaskBoardTeam;
