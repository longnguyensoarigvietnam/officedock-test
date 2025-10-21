'use client';
import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { CurrentMVPVotingDetail } from '@interfaces/mvp';

import api from '@base/api';

interface UseMVPVotingDetailHooksProps {
  showLoading?: boolean
  condition?: boolean[];
  onSuccess?: (success: CurrentMVPVotingDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useMVPVotingDetail = ({
  showLoading = true,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseMVPVotingDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get current mvp voting detail
  const getCurrentMVPVotingDetail = async () => {
    showLoading && setIsLoading(true);
    const apiUrl = apiRouters.CURRENT_MVP_VOTING;

    const { data } = await api.get<CurrentMVPVotingDetail>(apiUrl);
    return data;
  };

  // Handle API get current mvp voting detail
  const {
    data: currentMVPVotingDetail,
    refetch: refetchMVPVotingDetail,
    isFetched: isFetchedMVPVotingDetail,
    isLoading: isLoadingMVPVotingDetail,
  } = useQuery({
    queryKey: ['getCurrentMVPVotingDetail'],
    queryFn: getCurrentMVPVotingDetail,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CurrentMVPVotingDetail) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
      setIsLoading(false);
    },
  });

  return {
    currentMVPVotingDetail,
    refetchMVPVotingDetail,
    isFetchedMVPVotingDetail,
    isLoadingMVPVotingDetail
  };
};

export default useMVPVotingDetail;
