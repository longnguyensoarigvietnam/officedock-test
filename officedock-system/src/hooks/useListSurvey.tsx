'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { Organizations } from '@interfaces/organization';
import api from '@base/api';
import { BasePagination } from '@interfaces/common';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

interface useSurveyListProps {
  condition?: boolean[];
  screenName?: string;
  pagination?: PaginationProps;
  status: 'all' | 'closed' | 'my_survey' | 'open';
  onSuccess?: (success: Organizations[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSurveyList = ({
  pagination,
  status = 'all',
  onSuccess,
  onError,
  onSettled,
  screenName,
}: useSurveyListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  // Handle call API get survey list
  const getSurveyList = async () => {
    const params = new URLSearchParams();

    if (pagination?.page) {
      params.append('page', String(pagination.page));
    }
    if (pagination?.pageSize) {
      params.append('page_size', String(pagination.pageSize));
    } else {
      params.append('page_size', String(PAGINATION_PAGE_SIZE_MEDIUM));
    }
    params.append('status', status);

    const apiUrl = `${apiRouters.SURVEY_LIST}?${params.toString()}`;

    const { data } = await api.get<BasePagination<any[]>>(apiUrl);
    return data;
  };

  // Handle API get Survey list
  const {
    data: surveyList,
    refetch: refetchSurveyList,
    isFetched: isFetchedTeams,
  } = useQuery({
    queryKey: ['getSurveyList', screenName],
    queryFn: getSurveyList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Organizations[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { surveyList, refetchSurveyList, isFetchedTeams };
};

export default useSurveyList;
