'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';
import { ServerStatusCode } from '@constants/enums';

import { BasePagination } from '@interfaces/common';
import { Tags } from '@interfaces/tag';
import { ResponseError } from '@interfaces/response';

import { LoadingContext } from '@providers/LoadingProvider';
import api from '@base/api';

interface FilterProps {
  tagName?: string;
  personInChargeName?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useTagList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
  ordering?: string,
) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get tag list
  const getTagList = async () => {
    setIsLoading(true);

    const apiUrl = pagination?.page
      ? `${apiRouters.TAG_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${ordering ? `&ordering=${ordering}` : ''}${filter?.tagName ? `&name=${filter.tagName}` : ''}${filter?.personInChargeName ? `&responsible_person=${filter.personInChargeName}` : ''}`
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
    queryKey: ['getTagList', [pagination, filter, ordering]],
    queryFn: getTagList,
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

  return { tagList, refetchTagList, isFetchedTags };
};

export default useTagList;
