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
import { RoleDetail } from '@interfaces/role';
import api from '@base/api';

interface FilterProps {
  name?: string;
  is_hidden?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useRoleList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
  ordering?: string,
) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get User list
  const getRoleList = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();

    if (pagination?.page) {
      params.append('page', String(pagination.page));
      params.append(
        'page_size',
        String(pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT),
      );
    }

    if (ordering) params.append('ordering', ordering);
    if (filter?.name) params.append('name', filter.name);
    if (filter?.is_hidden) params.append('is_hidden', filter?.is_hidden);

    const apiUrl = pagination?.page
      ? `${apiRouters.ROLE_LIST}?${params.toString()}`
      : apiRouters.ROLE_LIST;

    const { data } = await api.get<BasePagination<RoleDetail[]>>(apiUrl);
    return data;
  };

  // Handle API get User list
  const {
    data: roleList,
    refetch: refetchRoleList,
    isFetched: isFetchedRoles,
  } = useQuery({
    queryKey: ['getRoleList', [pagination, filter, ordering]],
    queryFn: getRoleList,
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

  return { roleList, refetchRoleList, isFetchedRoles };
};

export default useRoleList;
