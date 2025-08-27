'use client';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { VotingManagementType } from '@constants/enums';

import { VotingListItem } from '@interfaces/mvp';

import api from '@base/api';

interface UseCurrentVotingDetailHooksProps {
  onSuccess?: (success: VotingListItem) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCurrentVotingDetail = ({
  onSuccess,
  onError,
  onSettled,
}: UseCurrentVotingDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get current voting detail
  const getCurrentVotingDetail = async () => {
    const { data } = await api.get<VotingListItem>(`${apiRouters.MVP_VOTING_LIST}?timeline=${VotingManagementType.PRESENT}`);
    return data;
  };

  // Handle API get current voting detail
  const {
    data: currentVotingDetail,
    refetch: refetchCurrentVotingDetail,
    isFetched: isFetchedCurrentVotingDetail,
    isLoading: isLoadingCurrentVotingDetail,
  } = useQuery({
    queryKey: ['getCurrentVotingDetail'],
    queryFn: getCurrentVotingDetail,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: VotingListItem) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    currentVotingDetail,
    refetchCurrentVotingDetail,
    isFetchedCurrentVotingDetail,
    isLoadingCurrentVotingDetail
  };
};

export default useCurrentVotingDetail;
