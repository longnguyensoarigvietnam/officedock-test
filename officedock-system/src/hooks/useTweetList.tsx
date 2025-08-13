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
  isLoadingTweetRef: React.MutableRefObject<boolean>;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<TweetDetail[]>) => void;
}

const useTweetList = ({
  isLoadingTweetRef,
  conditions,
  onSuccess,
}: UseTweetHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get tweet list
  const fetchTweetList = async ({ pageParam = 1 }) => {
    isLoadingTweetRef.current = true;

    const apiUrl = `${apiRouters.TWEET_LIST}?page=${pageParam}&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}`;
    const { data } = await api.get<BasePagination<TweetDetail[]>>(apiUrl);

    return { ...data, currentPage: pageParam }; // add current page to track next
  };

  // Handle API get tweet list
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetched } =
    useInfiniteQuery({
      queryKey: ['fetchTweetList'],
      queryFn: fetchTweetList,
      retry: 0,
      enabled: 
        !!token && conditions?.every(Boolean),
      getNextPageParam: (lastPage) =>
        lastPage?.hasNext ? lastPage.currentPage + 1 : undefined,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        const lastPage = data.pages[data.pages.length - 1];
        if (lastPage) {
          onSuccess?.(lastPage);
        }
        isLoadingTweetRef.current = false;
      },
      onError: ({ response }: ResponseError<any>) => {
        isLoadingTweetRef.current = false;
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
    hasNextPage,
    isFetchingNextPage,
    isFetched,
  };
};

export default useTweetList;
