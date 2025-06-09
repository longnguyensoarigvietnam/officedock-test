'use client';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';
import { useQuery } from 'react-query';

import { apiRouters } from '@constants/routers';

import { dataStatisticResponse } from '@interfaces/statistic';

import api from '@base/api';

interface useDataStatisticProps {
  date?: string;
  userId?: string;
  organizationId?: string;
  condition?: boolean[];
  onError?: (error: AxiosError) => void;
}

const useDataStatistic = ({
  date,
  userId,
  organizationId,
  condition,
  onError,
}: useDataStatisticProps) => {
  const { data: session } = useSession();

  const token = session?.accessToken;

  // Handle call API get task calendar
  const getDataStatistic = async () => {
    const apiUrl = `${apiRouters.DATA_DAILY_STATISTIC}?${date ? `date=${date}&` : ''}${userId ? `user_id=${userId}&` : ''}${organizationId ? `organization_id=${organizationId}` : ''}`;
    const { data } = await api.get<dataStatisticResponse>(apiUrl);
    return data;
  };

  // Handle API get task calendar
  const {
    data: dataStatistic,
    refetch: refetchDataStatistic,
    isFetched: isFetchedDataStatistic,
  } = useQuery({
    queryKey: ['getDataStatistic', [date, userId, organizationId]],
    queryFn: getDataStatistic,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return { dataStatistic, refetchDataStatistic, isFetchedDataStatistic };
};

export default useDataStatistic;
