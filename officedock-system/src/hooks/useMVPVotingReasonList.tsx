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

interface UseMVPVotingReasonListProps {
  mvpCandidateId?: number;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<MVPVotingComment[]>) => void;
}

const useMVPVotingReasonList = ({
  mvpCandidateId,
  conditions,
  onSuccess,
}: UseMVPVotingReasonListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get mvp voting reason list
  const fetchMVPVotingReasonList = async ({
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
      params.append('mvp_candidate', String(mvpCandidateId));
      apiUrl = `${apiRouters.VOTE_MVP}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<MVPVotingComment[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  // Handle API get mvp voting reason list
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['fetchMVPVotingReasonList', mvpCandidateId],
    queryFn: ({ pageParam, signal }) =>
      fetchMVPVotingReasonList({ pageParam, signal }),
    enabled: !!token && conditions?.every(Boolean) && !!mvpCandidateId,
    retry: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.VOTE_MVP}${lastPage?.next}`
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
    mvpVotingReasonList:
      data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchVotingList: refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useMVPVotingReasonList;
