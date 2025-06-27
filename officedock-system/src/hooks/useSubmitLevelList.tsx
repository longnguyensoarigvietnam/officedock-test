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

import api from '@base/api';
import { SubmitLevel } from '@interfaces/skills';

interface FilterProps {
  name?: string;
  status?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useSubmitLevelList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get level up confirmation list
  const getSubmitLevelList = async () => {
    setIsLoading(true);

    const apiUrl = pagination?.page
      ? `${apiRouters.SUBMIT_LEVELS_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${filter?.name ? `&skill_name=${filter.name}` : ''}${filter?.status ? `&status=${filter.status}` : ''}`
      : `${apiRouters.SUBMIT_LEVELS_LIST}`;

    const { data } = await api.get<BasePagination<SubmitLevel[]>>(apiUrl);
    return data;
  };

  // Handle API get level up confirmation list
  const {
    data: submitLevelList,
    refetch: refetchSubmitLevelList,
    isFetched: isFetchedSubmitLevels,
  } = useQuery({
    queryKey: ['getSubmitLevelList', [pagination, filter]],
    queryFn: getSubmitLevelList,
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

  return { submitLevelList, refetchSubmitLevelList, isFetchedSubmitLevels };
};

export default useSubmitLevelList;
