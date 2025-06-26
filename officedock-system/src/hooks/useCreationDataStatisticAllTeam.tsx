'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';
import api from '@base/api';
import { DataResponseStatisticCreationTeamType } from '@interfaces/statistic';

interface useCreationDataStatisticAllTeamHooksProps {
  condition?: boolean[];
  userId?: string | null;
  isTeam?: boolean;
  onSuccess?: (success: DataResponseStatisticCreationTeamType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatisticAllTeam = ({
  condition,
  isTeam = false,
  userId,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataStatisticAllTeamHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation Statistic data
  const getCreationDataStatistic = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (isTeam && !userId) return null;
    const apiUrl = `${apiRouters.ORGANIZATION_CREATION}?${userId ? `user_id=${userId}` : ''}&current_screen=${ScreenName.TEAM_DOCK}`;

    const { data } = await api.get<DataResponseStatisticCreationTeamType>(
      apiUrl,
      {
        signal,
      },
    );
    return data;
  };

  // Handle API get creation Statistic data
  const {
    data: creationDataStatisticDataAllTeam,
    refetch: refetchCreationDataStatistic,
    isFetched: isFetchedCreationDataStatistic,
  } = useQuery({
    queryKey: ['getCreationDataAllTeamStatistic', [userId]],
    queryFn: ({ signal }) => getCreationDataStatistic({ signal }),
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: DataResponseStatisticCreationTeamType) => {
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
    creationDataStatisticDataAllTeam,
    refetchCreationDataStatistic,
    isFetchedCreationDataStatistic,
  };
};

export default useCreationDataStatisticAllTeam;
