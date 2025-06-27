'use client';
import { AxiosError } from 'axios';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useQuery } from 'react-query';
import { useContext } from 'react';

import { apiRouters } from '@constants/routers';

import { dataStatisticResponsePDF } from '@interfaces/statistic';

import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';

interface useDataStatisticPDFProps {
  date?: string;
  userId?: string;
  organizationId?: string;
  condition?: boolean[];
  current_screen?: string;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useDataStatisticPDF = ({
  date,
  userId,
  organizationId,
  condition,
  current_screen,
  onError,
  onSettled,
}: useDataStatisticPDFProps) => {
  const { data: session } = useSessionCache();
  const { setIsLoading } = useContext(LoadingContext);

  const token = session?.accessToken;

  // Handle call API get task calendar
  const getDataStatistic = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (userId) params.append('user_id', userId.toString());
    if (current_screen)
      params.append('current_screen', current_screen.toString());

    if (organizationId)
      params.append('organization_id', organizationId.toString());

    const apiUrl = `${apiRouters.DATA_DAILY_STATISTIC_PDF}?${params.toString()}`;
    const { data } = await api.get<dataStatisticResponsePDF>(apiUrl);
    return data;
  };

  // Handle API get task calendar
  const {
    data: dataStatisticPDF,
    refetch: refetchDataStatisticPDF,
    isFetched: isFetchedDataStatisticPDF,
  } = useQuery({
    queryKey: [
      'getDataStatisticPDF',
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
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    dataStatisticPDF,
    refetchDataStatisticPDF,
    isFetchedDataStatisticPDF,
  };
};

export default useDataStatisticPDF;
