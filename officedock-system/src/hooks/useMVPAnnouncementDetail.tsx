'use client';
import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { VotingDetail } from '@interfaces/mvp';

import api from '@base/api';

interface UseMVPAnnouncementDetailHooksProps {
  mvpVoteId?: number;
  condition?: boolean[];
  onSuccess?: (success: VotingDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useMVPAnnouncementDetail = ({
  mvpVoteId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseMVPAnnouncementDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get mvp announcement detail
  const getMVPAnnouncementDetail = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (mvpVoteId) {
      params.append('mvp_vote_id', String(mvpVoteId));
    }

    const apiUrl = `${apiRouters.MVP_ANNOUNCEMENT_DETAIL}${params.toString() ? `?${params.toString()}` : ''}`;

    const { data } = await api.get<VotingDetail>(apiUrl);
    return data;
  };

  // Handle API get mvp announcement detail
  const {
    data: mvpAnnouncementDetail,
    refetch: refetchMVPAnnouncementDetail,
    isFetched: isFetchedMVPAnnouncementDetail,
  } = useQuery({
    queryKey: ['getMVPAnnouncementDetail', mvpVoteId],
    queryFn: getMVPAnnouncementDetail,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: VotingDetail) => {
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
    mvpAnnouncementDetail,
    refetchMVPAnnouncementDetail,
    isFetchedMVPAnnouncementDetail,
  };
};

export default useMVPAnnouncementDetail;
