'use client';
import { useQuery } from 'react-query';
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
  pagination,
  isLoadingTweetRef,
  conditions,
  onSuccess,
}: UseTweetHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get tweet list
  const getTweetList = async () => {
    isLoadingTweetRef.current = true;
    const apiUrl = pagination?.page
      ? `${apiRouters.TWEET_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_MEDIUM}`
      : `${apiRouters.TWEET_LIST}`;

    const { data } = await api.get<BasePagination<TweetDetail[]>>(apiUrl);
    return data;
  };

  // Handle API get tweet list
  const {
    data: tweetList,
    refetch: refetchTweetList,
    isFetched: isFetchedTweetList,
  } = useQuery({
    queryKey: ['getTweetList', pagination?.page],
    queryFn: getTweetList,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<TweetDetail[]>) => {
      isLoadingTweetRef.current = false;
      onSuccess && onSuccess(response);
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
    tweetList,
    refetchTweetList,
    isFetchedTweetList,
  };
};

export default useTweetList;
