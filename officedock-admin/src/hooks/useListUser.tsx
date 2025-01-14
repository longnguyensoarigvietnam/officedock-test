import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_SM } from '@constants';

import { BasePagination } from '@interfaces/common';
import { User } from '@interfaces/user';

import { LoadingContext } from '@providers/LoadingProvider';

interface FilterProps {
  fullName?: string;
  email?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useListUser = (
  pagination?: PaginationProps,
  filter?: FilterProps,
  orderRing?: string,
) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get user list
  const getUserList = async () => {
    setIsLoading(true);
    const apiUrl = pagination?.page
      ? `${apiRouters.USER_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_SM}${orderRing ? `&ordering=${orderRing}` : ''}${filter?.fullName ? `&full_name=${filter.fullName}` : ''}${filter?.email ? `&email=${filter.email}` : ''}`
      : `${apiRouters.USER_LIST}`;

    const { data } = await api.get<BasePagination<User[]>>(apiUrl);
    return data;
  };

  // Handle API get user list
  const {
    data: userList,
    refetch: refetchUserList,
    isFetched: isFetchedUsers,
  } = useQuery({
    queryKey: ['getUserList', [pagination, filter, orderRing]],
    queryFn: getUserList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { userList, refetchUserList, isFetchedUsers };
};

export default useListUser;
