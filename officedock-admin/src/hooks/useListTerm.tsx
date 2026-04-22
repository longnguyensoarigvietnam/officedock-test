import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_SM } from '@constants';

import { BasePagination } from '@interfaces/common';

import { LoadingContext } from '@providers/LoadingProvider';
import { Term } from '@interfaces/term';

interface FilterProps {
  title: string;
  status: string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useListTerm = (
  pagination?: PaginationProps,
  filter?: FilterProps,
  ordering?: string,
  type?: string,
) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get term list
  const getTermList = async () => {
    setIsLoading(true);
    const apiUrl = pagination?.page
      ? `${apiRouters.TERM_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_SM}${ordering ? `&ordering=${ordering}` : ''}${filter?.title ? `&title=${filter.title}` : ''}${filter?.status ? `&status=${filter.status}` : ''}${filter?.periodStart ? `&period_start=${filter.periodStart}` : ''}${type ? `&type=${type}` : ''}${filter?.periodEnd ? `&period_end=${filter.periodEnd}` : ''}`
      : `${apiRouters.TERM_LIST}`;

    const { data } = await api.get<BasePagination<Term[]>>(apiUrl);
    return data;
  };

  // Handle API get term list
  const {
    data: termList,
    refetch: refetchTermList,
    isFetched: isFetchedTerms,
  } = useQuery({
    queryKey: ['getTermList', [pagination, filter, ordering]],
    queryFn: getTermList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { termList, refetchTermList, isFetchedTerms };
};

export default useListTerm;
