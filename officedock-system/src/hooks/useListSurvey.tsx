'use client';
import { AxiosError } from 'axios';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import api from '@base/api';
import { BasePagination } from '@interfaces/common';
import { Survey } from '@interfaces/survey';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface UseSurveyListProps {
  screenName?: string;
  pagination?: PaginationProps;
  status: 'all' | 'closed' | 'my_survey' | 'open';
  onSuccess?: (success: BasePagination<Survey[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSurveyList = ({
  status = 'all',
  onSuccess,
  onError,
  onSettled,
  screenName,
}: UseSurveyListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  /**
   * getSurveyList: load the first page if pageParam has no URL
   * Otherwise if pageParam is a URL (string), call that URL directly
   */
  const getSurveyList = async ({
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
      params.append('status', status);
      apiUrl = `${apiRouters.SURVEY_LIST}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<Survey[]>>(apiUrl, {
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
    queryKey: ['getSurveyList', screenName, status],
    queryFn: ({ pageParam, signal }) => getSurveyList({ pageParam, signal }),
    enabled: !!token,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.SURVEY_LIST}${lastPage?.next}`
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
    surveyList: data?.pages?.flatMap((p) => p?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useSurveyList;
