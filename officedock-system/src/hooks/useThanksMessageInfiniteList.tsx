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

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface FilterProps {
  isRead: boolean,
  isPagination: boolean
  type: ThanksMessageType
}

interface UseThanksMessageInfiniteListHooksProps {
  filter?: FilterProps,
  pagination?: PaginationProps;
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<ThanksMessageDetail[]>) => void;
}

const useThanksMessageInfiniteList = ({
  filter,
  pagination,
  conditions,
  onSuccess,
}: UseThanksMessageInfiniteListHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get thanks message list
  const fetchThanksMessageList = async ({ pageParam = 1 }) => {
    const params = new URLSearchParams();
    params.append('is_read', String(filter?.isRead));
    params.append('is_pagination', String(filter?.isPagination));
    if (filter?.type) {
      params.append('type', String(filter?.type));
    }
    if (pagination?.page) {
      params.append('page', String(pagination?.page));
    }
    if (pagination?.pageSize) {
      params.append('page_size', String(pagination?.pageSize || PAGINATION_PAGE_SIZE_MEDIUM));
    }
    const apiUrl = `${apiRouters.THANKS_MESSAGES_LIST}?${params.toString()}`;
    const { data } = await api.get<BasePagination<ThanksMessageDetail[]>>(apiUrl);

    return { ...data, currentPage: pageParam }; // add current page to track next
  };

  // Handle API get thanks message list
  const { data, fetchNextPage, refetch, hasNextPage, isFetchingNextPage, isFetched } =
    useInfiniteQuery({
      queryKey: ['fetchThanksMessageInfiniteList'],
      queryFn: fetchThanksMessageList,
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
    thanksMessageList: data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchThanksMessageList: refetch, 
    hasNextPage,
    isFetchingNextPage,
    isFetched,
  };
};

export default useThanksMessageInfiniteList;
