'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';

interface UseEventDetailHooksProps {
  scheduleId: string;
  condition?: boolean[];
  onSuccess?: (success: any) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useEventDetail = ({
  scheduleId,
  onSuccess,
  onError,
  onSettled,
}: UseEventDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  const getEventDetail = async () => {
    const apiUrl = apiRouters.SCHEDULE_DETAIL(`${scheduleId}`);

    const { data } = await api.get(apiUrl);
    return data;
  };

  // Handle API get event detail
  const {
    data: eventDetail,
    refetch: refetchEventDetail,
    isFetched: isFetchedEventDetail,
  } = useQuery({
    queryKey: ['getEventDetail', scheduleId],
    queryFn: getEventDetail,
    retry: 0,
    enabled: !!token && !!scheduleId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: any) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
      onSettled && onSettled();
    },
  });

  return {
    eventDetail,
    refetchEventDetail,
    isFetchedEventDetail,
  };
};

export default useEventDetail;
