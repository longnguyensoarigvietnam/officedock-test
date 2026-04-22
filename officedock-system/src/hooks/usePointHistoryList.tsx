'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { BasePagination } from '@interfaces/common';
import { HistoryPointDetail } from '@interfaces/point';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

import { useErrorToast } from './useErrorToast';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface UsePointHistoryListHooksProps {
  pagination?: PaginationProps;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<HistoryPointDetail[]>) => void;
}

const usePointHistoryList = ({
  conditions,
  onSuccess,
}: UsePointHistoryListHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const showErrorToast = useErrorToast();

  // Handle call API get point history list
  const fetchPointHistory = async ({
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
      apiUrl = `${apiRouters.POINT_LIST}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<HistoryPointDetail[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  // Handle API get point history list
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['fetchPointHistory'],
    queryFn: ({ pageParam, signal }) => fetchPointHistory({ pageParam, signal }),
    enabled: !!token && conditions?.every(Boolean),
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next ? `${apiRouters.POINT_LIST}${lastPage?.next}` : undefined;
    },
    onSuccess: (allPages) => {
      const lastPage = allPages.pages[allPages.pages.length - 1];
      if (lastPage) {
        onSuccess?.(lastPage);
      }
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
    },
  });
  return {
    pointHistoryList: data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchPointHistory: refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default usePointHistoryList;
