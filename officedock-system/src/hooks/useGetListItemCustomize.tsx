'use client';
import { AxiosError } from 'axios';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import api from '@base/api';
import { BasePagination } from '@interfaces/common';
import { ShopItem } from '@interfaces/shop';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface UseGetListItemCustomizeProps {
  screenName?: string;
  pagination?: PaginationProps;
  type: string;
  onSuccess?: (success: BasePagination<ShopItem[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useGetListItemCustomize = ({
  type,
  onSuccess,
  onError,
  onSettled,
  screenName,
}: UseGetListItemCustomizeProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  /**
   * getGetListItemCustomize: load the first page if pageParam has no URL
   * Otherwise if pageParam is a URL (string), call that URL directly
   */
  const getGetListItemCustomize = async ({
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
      params.append('item_type', type);
      apiUrl = `${apiRouters.LIST_ITEM_CUSTOMIZE(String(session?.user.id))}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<ShopItem[]>>(apiUrl, {
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
    queryKey: ['getListItemCustomize', screenName, type],
    queryFn: ({ pageParam, signal }) =>
      getGetListItemCustomize({ pageParam, signal }),
    enabled: !!token,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.SHOP_ITEMS}${lastPage?.next}`
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
    listItemCustomize: data?.pages?.flatMap((p) => p?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useGetListItemCustomize;
