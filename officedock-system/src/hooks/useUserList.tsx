'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

import { BasePagination } from '@interfaces/common';
import { User } from '@interfaces/user';
import { ResponseError } from '@interfaces/response';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_SMALL } from '@constants';
import { ServerStatusCode } from '@constants/enums';

import api from '@base/api';

interface FilterProps {
  companyName?: string;
  fullName?: string;
  organizationId?: string;
  role?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useUserList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
  ordering?: string,
) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get User list
  const getUserList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.USER_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_SMALL}${ordering ? `&ordering=${ordering}` : ''}${filter?.fullName ? `&full_name=${filter.fullName}` : ''}${filter?.companyName ? `&company_name=${filter.companyName}` : ''}${filter?.organizationId ? `&organization_id=${filter.organizationId}` : ''}${filter?.role ? `&role_id=${filter.role}` : ''}`
      : `${apiRouters.USER_LIST}`;

    const { data } = await api.get<BasePagination<User[]>>(apiUrl);
    return data;
  };

  // Handle API get User list
  const {
    data: userList,
    refetch: refetchUserList,
    isFetched: isFetchedUsers,
  } = useQuery({
    queryKey: ['getUserList', [pagination, filter, ordering]],
    queryFn: getUserList,
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

  return { userList, refetchUserList, isFetchedUsers };
};

export default useUserList;
