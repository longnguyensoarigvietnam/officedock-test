'use client';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';

import { KanbanDataResponse } from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import { useSessionCache } from '@providers/SessionCacheProvider';

interface FilterProps {
  userId?: OptionDropdownType[];
  tagId?: string;
  search?: string;
}

const useTaskNoSettingTeam = ({
  organization_id,
  filter,
  ordering,
  isReadyToFetch,
  onSuccess,
  onError,
}: {
  organization_id?: string;
  filter?: FilterProps;
  ordering?: string;

  isReadyToFetch?: boolean;
  onError?: () => void;

  onSuccess?: (data: KanbanDataResponse) => void;
}) => {
  const { data: session } = useSessionCache();
  const router = useRouter();

  const token = session?.accessToken;
  // Handle call API get task board list
  const getTaskBoardNoSettingTeam = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!organization_id) return null;

    const params = new URLSearchParams({
      organization_id: String(organization_id),
      page_size: `${PAGINATION_PAGE_SIZE_KANBAN}`,
      ...(ordering && { ordering }),
      ...(filter?.userId && {
        user_ids: filter.userId.map((item) => item.value).join(','),
      }),
      ...(filter?.tagId && { tag_id: String(filter.tagId) }),
      ...(filter?.search && { search: filter.search }),
    });

    const apiUrl = `${apiRouters.TASK_TEAM_NO_SETTING}?${params.toString()}&curren_screen=teamdock`;

    const { data } = await api.get<KanbanDataResponse>(apiUrl, { signal });
    return data;
  };

  // Handle API get task board list
  const {
    data: taskBoardNoSettingTeam,
    refetch: refetchTaskBoardNoSettingTeam,
    isFetched: isFetchedTaskNoSettingBoards,
  } = useQuery({
    queryKey: isReadyToFetch
      ? ['getTaskTeamNoSetting', [filter, ordering, organization_id]]
      : ['getTaskTeamNoSetting'],
    queryFn: ({ signal }) => getTaskBoardNoSettingTeam({ signal }),
    retry: 0,
    enabled: isReadyToFetch && !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: KanbanDataResponse) => {
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
    onSettled: () => {},
  });

  return {
    taskBoardNoSettingTeam,
    refetchTaskBoardNoSettingTeam,
    isFetchedTaskNoSettingBoards,
  };
};

export default useTaskNoSettingTeam;
