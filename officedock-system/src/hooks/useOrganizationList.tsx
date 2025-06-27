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
import { Organizations } from '@interfaces/organization';
import { ResponseError } from '@interfaces/response';

import api from '@base/api';

interface FilterProps {
  name?: string;
  superiorName?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useOrganizationList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
  ordering?: string,
  hasStatistic?: boolean,
) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization list
  const getOrganizationList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.ORGANIZATION_LIST}?page=${pagination.page}${hasStatistic ? '&has_statistic_categories=true' : ''}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${ordering ? `&ordering=${ordering}` : ''}${filter?.name ? `&name=${filter.name}` : ''}${filter?.superiorName ? `&superior_name=${filter.superiorName}` : ''}`
      : `${apiRouters.ORGANIZATION_LIST}`;

    const { data } = await api.get<BasePagination<Organizations[]>>(apiUrl);
    return data;
  };

  // Handle API get organization list
  const {
    data: organizationList,
    refetch: refetchOrganizationList,
    isFetched: isFetchedOrganizations,
  } = useQuery({
    queryKey: ['getOrganizationList', [pagination, filter, ordering]],
    queryFn: getOrganizationList,
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

  return { organizationList, refetchOrganizationList, isFetchedOrganizations };
};

export default useOrganizationList;
