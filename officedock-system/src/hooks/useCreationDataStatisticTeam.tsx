'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { DataResponseStatisticCreationTeamType } from '@interfaces/statistic';

interface useCreationDataStatisticTeamHooksProps {
  condition?: boolean[];
  organization_id?: string;
  isTeam?: boolean;
  is_statistic?: boolean;
  onSuccess?: (success: DataResponseStatisticCreationTeamType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatisticTeam = ({
  condition,
  isTeam = false,
  organization_id,
  is_statistic,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataStatisticTeamHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation Statistic data
  const getCreationDataStatistic = async () => {
    if (isTeam && !organization_id) return null;
    const apiUrl = `${apiRouters.STATISTIC_CREATION}?${organization_id ? `organization_id=${organization_id}` : ''}${is_statistic ? `&is_statistic=true` : ''}`;

    const { data } =
      await api.get<DataResponseStatisticCreationTeamType>(apiUrl);
    return data;
  };

  // Handle API get creation Statistic data
  const {
    data: creationDataStatisticData,
    refetch: refetchCreationDataStatistic,
    isFetched: isFetchedCreationDataStatistic,
  } = useQuery({
    queryKey: ['getCreationDataStatistic', [organization_id]],
    queryFn: getCreationDataStatistic,
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
    creationDataStatisticData,
    refetchCreationDataStatistic,
    isFetchedCreationDataStatistic,
  };
};

export default useCreationDataStatisticTeam;
