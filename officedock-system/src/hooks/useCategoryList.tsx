'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';
import { ServerStatusCode } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { BasePagination } from '@interfaces/common';
import { ResponseError } from '@interfaces/response';
import { Category } from '@interfaces/category';
import api from '@base/api';

interface FilterProps {
  name?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useCategoryList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get Category list
  const getCategoryList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.CATEGORY_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${filter?.name ? `&name=${filter.name}` : ''}`
      : `${apiRouters.CATEGORY_LIST}`;

    const { data } = await api.get<BasePagination<Category[]>>(apiUrl);
    return data;
  };

  // Handle API get Category list
  const {
    data: categoryList,
    refetch: refetchCategoryList,
    isFetched: isFetchedCategory,
  } = useQuery({
    queryKey: ['getCategoryList', [pagination, filter]],
    queryFn: getCategoryList,
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

  return { categoryList, refetchCategoryList, isFetchedCategory };
};

export default useCategoryList;
