'use client';
import { AxiosError } from 'axios';
import { useInfiniteQuery } from '@tanstack/react-query';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { BasePagination } from '@interfaces/common';
import { HistoryPoint } from '@interfaces/history';

import api from '@base/api';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface UseHistoryListProps {
  screenName?: string;
  pagination?: PaginationProps;
  type: 'COIN' | 'PEARL';
  onSuccess?: (success: BasePagination<HistoryPoint[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useHistoryPointList = ({
  type = 'COIN',
  onSuccess,
  onError,
  onSettled,
  screenName,
}: UseHistoryListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  /**
   * getHistoryPontList: load the first page if pageParam has no URL
   * Otherwise if pageParam is a URL (string), call that URL directly
   */
  const getHistoryPontList = async ({
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
      params.append('page_size', String(PAGINATION_PAGE_SIZE_MEDIUM));
      params.append('type', type);
      apiUrl = `${apiRouters.POINT_HISTORY}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<HistoryPoint[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['getHistoryPointList', screenName, type],
    queryFn: ({ pageParam, signal }) =>
      getHistoryPontList({ pageParam, signal }),
    enabled: !!token,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.POINT_HISTORY}${lastPage?.next}`
        : undefined;
    },
    onSuccess: (allPages) => {
      const lastPage = allPages.pages[allPages.pages.length - 1];
      if (lastPage) onSuccess?.(lastPage);
    },
    onError: (error: AxiosError) => {
      onError?.(error);
    },
    onSettled: () => {
      onSettled?.();
    },
  });

  return {
    historyPointList: data?.pages?.flatMap((p) => p?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useHistoryPointList;
