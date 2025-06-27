'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { ResponseError } from '@interfaces/response';
import { ActualDurationDetail } from '@interfaces/durations';

import api from '@base/api';

interface UseCalculateDurationTaskProps {
  onSuccess?: (success: ActualDurationDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
  actualDurationId: number;
}

const useActualDurationDetail = ({
  actualDurationId,
  onSuccess,
  onError,
}: UseCalculateDurationTaskProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get actual duration list
  const getActualDurationDetail = async () => {
    setIsLoading(true);

    const { data } = await api.get<ActualDurationDetail>(
      apiRouters.ACTUAL_DURATION_DETAIL(actualDurationId),
    );
    return data;
  };

  // Handle API get actual duration detail
  const {
    data: actualDurationDetail,
    refetch: refetchActualDurationDetail,
    isFetched: isFetchedActualDurationDetail,
  } = useQuery({
    queryKey: ['getActualDurationDetail'],
    queryFn: getActualDurationDetail,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: ActualDurationDetail) => {
      onSuccess && onSuccess(response);
    },
    onError: (response: ResponseError<any>) => {
      onError && onError(response);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    actualDurationDetail,
    refetchActualDurationDetail,
    isFetchedActualDurationDetail,
  };
};

export default useActualDurationDetail;
