'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { ResponseError } from '@interfaces/response';
import { BasePagination } from '@interfaces/common';
import { MVPVotingComment } from '@interfaces/mvp';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

interface UseVoteCommentListHooksProps {
  mvpCandidateId: number;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<MVPVotingComment[]>) => void;
}

const useVoteCommentList = ({
  mvpCandidateId,
  conditions,
  onSuccess,
}: UseVoteCommentListHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get vote comment list
  const fetchVoteCommentList = async ({
    pageParam,
    signal,
  }: {
    pageParam?: number | string;
    signal?: AbortSignal;
  }) => {
    let apiUrl: string;

    if (typeof pageParam === 'string') {
      // next page url for API
      apiUrl = pageParam;
    } else {
      const params = new URLSearchParams();
      params.append('page', String(pageParam ?? 1));
      params.append('page_size', String(PAGINATION_PAGE_SIZE_MEDIUM));
      params.append('mvp_candidate_id', String(mvpCandidateId));
      apiUrl = `${apiRouters.MVP_VOTE_COMMENTS}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<MVPVotingComment[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  // Handle API get vote comment list
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['fetchVoteCommentList', mvpCandidateId],
    queryFn: ({ pageParam, signal }) =>
      fetchVoteCommentList({ pageParam, signal }),
    enabled: !!token && !!mvpCandidateId && conditions?.every(Boolean),
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.MVP_VOTE_COMMENTS}${lastPage?.next}`
        : undefined;
    },
    onSuccess: (allPages) => {
      const lastPage = allPages.pages[allPages.pages.length - 1];
      if (lastPage) {
        onSuccess?.(lastPage);
      }
    },
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
  });
  return {
    voteCommentList: data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchVoteCommentList: refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useVoteCommentList;
