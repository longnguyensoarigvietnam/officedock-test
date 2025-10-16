'use client';
import { AxiosError } from 'axios';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import api from '@base/api';
import { BasePagination, OptionDropdownType } from '@interfaces/common';
import { TaskArchive } from '@interfaces/task';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface UseListTaskArchiveProps {
  orderingOptions?: {
    category_ids: OptionDropdownType[];
    tag_ids: OptionDropdownType[];
    organization_ids: OptionDropdownType[];
  } | null;
  pagination?: PaginationProps;
  ordering?: string;
  onSuccess?: (success: BasePagination<TaskArchive[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTaskArchiveList = ({
  orderingOptions,
  ordering,
  onSuccess,
  onError,
  onSettled,
}: UseListTaskArchiveProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  /**
   * getTaskArchiveList: load the first page if pageParam has no URL
   * Otherwise if pageParam is a URL (string), call that URL directly
   */
  const getTaskArchiveList = async ({
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
      const makeParam = (list?: OptionDropdownType[]) =>
        list?.length ? list.map((i) => i.value).join(',') : undefined;

      const params = new URLSearchParams({
        ...(ordering && { ordering }),
        ...(makeParam(orderingOptions?.organization_ids) && {
          organization_ids: makeParam(orderingOptions?.organization_ids)!,
        }),
        ...(makeParam(orderingOptions?.category_ids) && {
          category_ids: makeParam(orderingOptions?.category_ids)!,
        }),
        ...(makeParam(orderingOptions?.tag_ids) && {
          tag_ids: makeParam(orderingOptions?.tag_ids)!,
        }),
        page: String(pageParam ?? 1),
        page_size: String(PAGINATION_PAGE_SIZE_MEDIUM),
      });

      apiUrl = `${apiRouters.ARCHIVE_LIST}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<TaskArchive[]>>(apiUrl, {
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
    queryKey: ['getTaskArchiveList', orderingOptions, ordering],
    queryFn: ({ pageParam, signal }) =>
      getTaskArchiveList({ pageParam, signal }),
    enabled: !!token,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.ARCHIVE_LIST}${lastPage?.next}`
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
    archiveTaskList: data?.pages?.flatMap((p) => p?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useTaskArchiveList;
