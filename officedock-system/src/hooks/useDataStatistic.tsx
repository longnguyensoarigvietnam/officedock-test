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
  current_screen?: string;
  onError?: (error: AxiosError) => void;
}

const useDataStatistic = ({
  date,
  userId,
  organizationId,
  condition,
  current_screen,
  onError,
}: useDataStatisticProps) => {
  const { data: session } = useSession();

  const token = session?.accessToken;

  // Handle call API get task calendar
  const getDataStatistic = async () => {
    const params = new URLSearchParams();

    if (date) params.append('date', date);
    if (current_screen) params.append('current_screen', current_screen);

    if (userId) params.append('user_id', userId.toString());
    if (organizationId)
      params.append('organization_id', organizationId.toString());

    const apiUrl = `${apiRouters.DATA_DAILY_STATISTIC}?${params.toString()}`;
    const { data } = await api.get<dataStatisticResponse>(apiUrl);
    return data;
  };

  // Handle API get task calendar
  const {
    data: dataStatistic,
    refetch: refetchDataStatistic,
    isFetched: isFetchedDataStatistic,
  } = useQuery({
    queryKey: [
      'getDataStatistic',
      [date, userId, organizationId, current_screen],
    ],
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
