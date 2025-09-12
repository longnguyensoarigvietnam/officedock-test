'use client';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { CurrentPointDetail } from '@interfaces/point';

import api from '@base/api';

interface UseCurrentPointHooksProps {
  onSuccess?: (success: CurrentPointDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}
const useCurrentPoint = ({
  onError,
  onSuccess,
  onSettled,
}: UseCurrentPointHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get current point
  const getCurrentPointDetail = async () => {

    const apiUrl = `${apiRouters.CURRENT_POINT}`;

    const { data } = await api.get<CurrentPointDetail>(apiUrl);
    return data;
  };

  // Handle API get current point
  const {
    data: currentPointDetail,
    refetch: refetchCurrentPointDetail,
    isFetched: isFetchedCurrentPointDetail,
  } = useQuery({
    queryKey: ['getCurrentPointDetail'],
    queryFn: getCurrentPointDetail,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CurrentPointDetail) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { currentPointDetail, refetchCurrentPointDetail, isFetchedCurrentPointDetail };
};

export default useCurrentPoint;
