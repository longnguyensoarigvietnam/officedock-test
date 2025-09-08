'use client';
import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { MVPVotingComment } from '@interfaces/mvp';

import api from '@base/api';

interface UseCurrentVotingCommentHooksProps {
  mvpCandidateId: number;
  onSuccess?: (success: MVPVotingComment) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCurrentVotingComment = ({
  mvpCandidateId,
  onSuccess,
  onError,
  onSettled,
}: UseCurrentVotingCommentHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get current voting comment
  const getVotingComment = async () => {
    if (!mvpCandidateId) return;
    setIsLoading(true);
    const apiUrl = apiRouters.CURRENT_VOTING_COMMENT;

    const { data } = await api.get<MVPVotingComment>(apiUrl, {
      params: {
        mvp_candidate_id: mvpCandidateId,
      },
    });
    return data;
  };

  // Handle API get current voting comment
  const {
    data: votingComment,
    refetch: refetchVotingComment,
    isFetched: isFetchedVotingComment,
  } = useQuery({
    queryKey: ['getVotingComment', mvpCandidateId],
    queryFn: getVotingComment,
    retry: 0,
    enabled: !!token && !!mvpCandidateId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: MVPVotingComment) => {
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
    votingComment,
    refetchVotingComment,
    isFetchedVotingComment,
  };
};

export default useCurrentVotingComment;
