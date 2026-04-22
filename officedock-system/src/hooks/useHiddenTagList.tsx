'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';

import { BasePagination } from '@interfaces/common';
import { Tags } from '@interfaces/tag';

import { LoadingContext } from '@providers/LoadingProvider';
import api from '@base/api';
import { AxiosError } from 'axios';

interface FilterProps {
  tagName?: string;
  personInChargeName?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useHiddenTagList = ({
  pagination,
  filter,
  ordering,
  onSuccess,
  onError,
  onSettled,
}: {
  pagination?: PaginationProps;
  filter?: FilterProps;
  ordering?: string;
  onSuccess?: (success: Tags[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get tag list
  const getHiddenTagList = async () => {
    setIsLoading(true);

    const apiUrl = pagination?.page
      ? `${apiRouters.HIDDEN_TAG_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${ordering ? `&ordering=${ordering}` : ''}${filter?.tagName ? `&name=${filter.tagName}` : ''}${filter?.personInChargeName ? `&responsible_person=${filter.personInChargeName}` : ''}`
      : `${apiRouters.HIDDEN_TAG_LIST}`;

    const { data } = await api.get<BasePagination<Tags[]>>(apiUrl);
    return data;
  };

  // Handle API get tag list
  const {
    data: hiddenTagList,
    refetch: refetchHiddenTagList,
    isFetched: isFetchedHiddenTags,
  } = useQuery({
    queryKey: ['getHiddenTagList', [pagination, filter, ordering]],
    queryFn: getHiddenTagList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Tags[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { hiddenTagList, refetchHiddenTagList, isFetchedHiddenTags };
};

export default useHiddenTagList;
