'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { ResponseError } from '@interfaces/response';
import { BasePagination } from '@interfaces/common';
import { TweetDetail } from '@interfaces/tweet';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface UseTweetHooksProps {
  pagination?: PaginationProps;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<TweetDetail[]>) => void;
}

const useTweetList = ({
  conditions,
  onSuccess,
}: UseTweetHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get tweet list
  const fetchTweetList = async ({
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
      apiUrl = `${apiRouters.TWEET_LIST}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<TweetDetail[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  // Handle API get tweet list
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['fetchTweetList'],
    queryFn: ({ pageParam, signal }) => fetchTweetList({ pageParam, signal }),
    enabled: !!token && conditions?.every(Boolean),
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next ? `/tweets/${lastPage?.next}` : undefined;
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
    tweetList: data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchTweetList: refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useTweetList;
