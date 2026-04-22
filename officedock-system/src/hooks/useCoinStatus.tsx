'use client';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { CoinStatusDetail } from '@interfaces/point';

import api from '@base/api';

interface UseCoinStatusHooksProps {
  conditions?: boolean[];
  onSuccess?: (success: CoinStatusDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}
const useCoinStatus = ({
  conditions,
  onError,
  onSuccess,
  onSettled,
}: UseCoinStatusHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get coin status
  const getCoinStatusDetail = async () => {

    const apiUrl = `${apiRouters.COIN_STATUS}`;

    const { data } = await api.get<CoinStatusDetail>(apiUrl);
    return data;
  };

  // Handle API get coin status
  const {
    data: coinStatus,
    refetch: refetchCoinStatus,
    isFetched: isFetchedCoinStatus,
  } = useQuery({
    queryKey: ['getCoinStatusDetail'],
    queryFn: getCoinStatusDetail,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CoinStatusDetail) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { coinStatus, refetchCoinStatus, isFetchedCoinStatus };
};

export default useCoinStatus;
