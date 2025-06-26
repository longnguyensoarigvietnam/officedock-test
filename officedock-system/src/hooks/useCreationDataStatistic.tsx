'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { DataResponseStatisticCreationType } from '@interfaces/statistic';

interface useCreationDataStatisticHooksProps {
  condition?: boolean[];
  is_statistic?: boolean;
  is_calendar_page?: boolean;
  organization_id?: number;
  onSuccess?: (success: DataResponseStatisticCreationType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatistic = ({
  condition,
  is_statistic,
  is_calendar_page,
  organization_id,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataStatisticHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation Statistic data
  const getCreationDataStatistic = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const apiUrl = `${apiRouters.STATISTIC_CREATION}${is_statistic ? `?is_statistic=true` : ''}${is_calendar_page ? `?is_calendar_page=true` : ''}${organization_id ? `?organization_id=${organization_id}` : ''}`;

    const { data } = await api.get<DataResponseStatisticCreationType>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get creation Statistic data
  const {
    data: creationDataStatisticData,
    refetch: refetchCreationDataStatistic,
    isFetched: isFetchedCreationDataStatistic,
  } = useQuery({
    queryKey: [
      'getCreationDataStatistic',
      { is_statistic, is_calendar_page, organization_id },
    ],
    queryFn: ({ signal }) => getCreationDataStatistic({ signal }),
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: DataResponseStatisticCreationType) => {
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

export default useCreationDataStatistic;
