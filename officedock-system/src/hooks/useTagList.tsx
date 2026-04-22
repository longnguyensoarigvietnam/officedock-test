'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';

import { BasePagination } from '@interfaces/common';
import { Tags } from '@interfaces/tag';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import api from '@base/api';

interface FilterProps {
  tagName?: string;
  organizationIds?: string;
  isHidden?: boolean;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useTagList = ({
  pagination,
  filter,
  onSuccess,
  onError,
  onSettled,
}: {
  pagination?: PaginationProps;
  filter?: FilterProps;
  onSuccess?: (success: BasePagination<Tags[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get tag list
  const getTagList = async () => {
    setIsLoading(true);

    const apiUrl = pagination?.page
      ? `${apiRouters.TAG_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${filter?.tagName ? `&name=${filter.tagName}` : ''}${filter?.organizationIds ? `&organization_ids=${filter.organizationIds}` : ''}${`&is_hidden=${filter?.isHidden || false}`}`
      : `${apiRouters.TAG_LIST}`;

    const { data } = await api.get<BasePagination<Tags[]>>(apiUrl);
    return data;
  };

  // Handle API get tag list
  const {
    data: tagList,
    refetch: refetchTagList,
    isFetched: isFetchedTags,
  } = useQuery({
    queryKey: ['getTagList', [pagination, filter]],
    queryFn: getTagList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<Tags[]>) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
      setIsLoading(false);
    },
  });

  return { tagList, refetchTagList, isFetchedTags };
};

export default useTagList;
