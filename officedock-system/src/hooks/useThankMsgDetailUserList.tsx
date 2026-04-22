'use client';
import { AxiosError } from 'axios';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import api from '@base/api';
import { BasePagination } from '@interfaces/common';
import { ThankListDetailMsgType } from '@interfaces/thank';

interface UseThankMsgDetailUserListProps {
  type: 'received' | 'sent';
  user_id: string;
  onSuccess?: (success: BasePagination<ThankListDetailMsgType[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useThankMsgDetailUserList = ({
  type = 'received',
  user_id,
  onSuccess,
  onError,
  onSettled,
}: UseThankMsgDetailUserListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  /**
   * ThankListDetailMsgType: load the first page if pageParam has no URL
   * Otherwise if pageParam is a URL (string), call that URL directly
   */
  const getDetailThankMsgList = async ({
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
      params.append('type', type);
      params.append('user_id', String(user_id));

      apiUrl = `${apiRouters.LIST_THANKS_DETAIL_HISTORY}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<ThankListDetailMsgType[]>>(
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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['getDetailThankMsgList', [type, user_id]],
    queryFn: ({ pageParam, signal }) =>
      getDetailThankMsgList({ pageParam, signal }),
    enabled: !!token,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.LIST_THANKS_DETAIL_HISTORY}${lastPage?.next}`
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
    thankDetailList: data?.pages?.flatMap((p) => p?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useThankMsgDetailUserList;
