'use client';
import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { VotingDetail } from '@interfaces/mvp';

import api from '@base/api';

interface UseVotingDetailHooksProps {
  id: number;
  onSuccess?: (success: VotingDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useVotingDetail = ({
  id,
  onSuccess,
  onError,
  onSettled,
}: UseVotingDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get voting detail
  const getVotingDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    const apiUrl = apiRouters.MVP_VOTING_DETAIL(String(id));

    const { data } = await api.get<VotingDetail>(apiUrl);
    return data;
  };

  // Handle API get voting detail
  const {
    data: votingDetail,
    refetch: refetchVotingDetail,
    isFetched: isFetchedVotingDetail,
  } = useQuery({
    queryKey: ['getVotingDetail', id],
    queryFn: getVotingDetail,
    retry: 0,
    enabled: !!token && !!id,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: VotingDetail) => {
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
    votingDetail,
    refetchVotingDetail,
    isFetchedVotingDetail,
  };
};

export default useVotingDetail;
