'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';
import { ServerStatusCode } from '@constants/enums';

import { BasePagination } from '@interfaces/common';
import { ResponseError } from '@interfaces/response';
import { ActualDurationDetail } from '@interfaces/durations';

import api from '@base/api';

interface FilterProps {
  type?: string;
  title?: string;
  tagId?: string;
  staffId?: string;
  largeCategory?: string;
  mediumCategory?: string;
  smallCategory?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useActualDurationList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get actual duration list
  const getActualDurationList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.ACTUAL_DURATIONS_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${filter?.type ? `&type=${filter?.type}` : ''}${filter?.title ? `&title=${filter?.title}` : ''}${filter?.tagId ? `&tag_id=${filter?.tagId}` : ''}${filter?.staffId ? `&staff_id=${filter?.staffId}` : ''}${filter?.smallCategory ? `&small_category=${filter?.smallCategory}` : ''}${filter?.mediumCategory ? `&medium_category=${filter?.mediumCategory}` : ''}${filter?.largeCategory ? `&large_category=${filter?.largeCategory}` : ''}`
      : `${apiRouters.ACTUAL_DURATIONS_LIST}`;

    const { data } =
      await api.get<BasePagination<ActualDurationDetail[]>>(apiUrl);
    return data;
  };

  // Handle API get actual duration list
  const {
    data: actualDurationList,
    refetch: refetchActualDurationList,
    isFetched: isFetchedActualDurations,
  } = useQuery({
    queryKey: ['getActualDurationList', [pagination, filter]],
    queryFn: getActualDurationList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    actualDurationList,
    refetchActualDurationList,
    isFetchedActualDurations,
  };
};

export default useActualDurationList;
