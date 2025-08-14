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
  condition?: boolean[];
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

  // API call with infinite scroll
  const getSurveyList = async ({
    pageParam = 1,
    signal,
  }: {
    pageParam?: number;
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams();
    params.append('page', String(pageParam));
    params.append('page_size', String(PAGINATION_PAGE_SIZE_MEDIUM));
    params.append('status', status);

    const apiUrl = `${apiRouters.SURVEY_LIST}?${params.toString()}`;
    const { data } = await api.get<BasePagination<Survey[]>>(apiUrl, {
      signal,
    });

    return { ...data, currentPage: pageParam };
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
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) =>
      lastPage?.hasNext ? lastPage.currentPage + 1 : undefined,
    onSuccess: (data) => {
      const lastPage = data.pages[data.pages.length - 1];
      if (lastPage) {
        onSuccess?.(lastPage);
      }
    },
    onError: (error: AxiosError) => {
      onError?.(error);
    },
    onSettled: () => {
      onSettled?.();
    },
  });

  return {
    surveyList: data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useSurveyList;
