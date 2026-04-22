'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { ResponseError } from '@interfaces/response';
import { BasePagination } from '@interfaces/common';
import { ThanksMessageDetail } from '@interfaces/thanks-message';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode, ThanksMessageType } from '@constants/enums';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

interface FilterProps {
  type: ThanksMessageType;
}

interface UseThanksMessageInfiniteListHooksProps {
  filter?: FilterProps;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<ThanksMessageDetail[]>) => void;
}

const useThanksMessageInfiniteList = ({
  filter,
  conditions,
  onSuccess,
}: UseThanksMessageInfiniteListHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get thanks message list
  const fetchThanksMessageList = async ({
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
      if (filter?.type) {
        params.append('type', String(filter?.type));
      }
      params.append('page', String(pageParam ?? 1));
      params.append('page_size', String(PAGINATION_PAGE_SIZE_MEDIUM));
      apiUrl = `${apiRouters.THANKS_MESSAGES_LIST}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<ThanksMessageDetail[]>>(
      apiUrl,
      {
        signal,
      },
    );

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  // Handle API get thanks message list
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['fetchThanksMessageInfiniteList', filter],
    queryFn: ({ pageParam, signal }) =>
      fetchThanksMessageList({ pageParam, signal }),
    enabled: !!token && conditions?.every(Boolean),
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    cacheTime: 0,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.THANKS_MESSAGES_LIST}${lastPage?.next}`
        : undefined;
    },
    onSuccess: (data) => {
      const lastPage = data.pages[data.pages.length - 1];
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
    thanksMessageList:
      data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchThanksMessageList: refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useThanksMessageInfiniteList;
