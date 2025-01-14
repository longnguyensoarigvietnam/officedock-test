'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { ResponseError } from '@interfaces/response';
import { dataStatisticResponse } from '@interfaces/statistic';

import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';

interface useDataStatisticProps {
  date?: string;
  condition?: boolean[];
}

const useDataStatistic = ({ date, condition }: useDataStatisticProps) => {
  const { data: session } = useSession();
  const { setIsLoading } = useContext(LoadingContext);

  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get task calendar
  const getDataStatistic = async () => {
    const apiUrl = `${apiRouters.DATA_DAILY_STATISTIC}?${date && `date=${date}`}`;
    const { data } = await api.get<dataStatisticResponse>(apiUrl);
    return data;
  };

  // Handle API get task calendar
  const {
    data: dataStatistic,
    refetch: refetchDataStatistic,
    isFetched: isFetchedDataStatistic,
  } = useQuery({
    queryKey: ['getDataStatistic', [date]],
    queryFn: getDataStatistic,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { dataStatistic, refetchDataStatistic, isFetchedDataStatistic };
};

export default useDataStatistic;
