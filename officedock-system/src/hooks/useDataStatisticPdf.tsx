'use client';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';
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
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useDataStatisticPDF = ({
  date,
  userId,
  organizationId,
  condition,
  onError,
  onSettled,
}: useDataStatisticPDFProps) => {
  const { data: session } = useSession();
  const { setIsLoading } = useContext(LoadingContext);

  const token = session?.accessToken;

  // Handle call API get task calendar
  const getDataStatistic = async () => {
    const apiUrl = `${apiRouters.DATA_DAILY_STATISTIC_PDF}?${date ? `date=${date}` : ''}${userId ? `&user_id=${userId}` : ''}${organizationId ? `&organization_id=${organizationId}` : ''}`;
    const { data } = await api.get<dataStatisticResponsePDF>(apiUrl);
    return data;
  };

  // Handle API get task calendar
  const {
    data: dataStatisticPDF,
    refetch: refetchDataStatisticPDF,
    isFetched: isFetchedDataStatisticPDF,
  } = useQuery({
    queryKey: ['getDataStatisticPDF', [date, userId, organizationId]],
    queryFn: getDataStatistic,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
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
