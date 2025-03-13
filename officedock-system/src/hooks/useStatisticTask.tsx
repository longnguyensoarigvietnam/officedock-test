'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { AxiosError } from 'axios';
import { BasePagination } from '@interfaces/common';
import { DataTaskListStatisticListType } from '@interfaces/statistic';
import { PAGINATION_PAGE_SIZE_KANBAN } from '@constants';

interface FilterProps {
  page: number;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | null;
  mediumCategoryId?: number | null;
  organizationIds?: string;
  tagIds?: string;
  totalDuration?: string;
  ordering: string;
}

const useStatisticTask = ({
  filter,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  onSuccess?: (data: BasePagination<DataTaskListStatisticListType[]>) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get statistic category list
  const getStatisticCategoryList = async () => {
    if (!filter?.organizationIds) return null;

    setIsLoading(true);

    const params = new URLSearchParams();

    if (filter?.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter?.endDate) params.append('end_date', String(filter.endDate));
    if (filter?.largeCategoryId)
      params.append('large_category_id', String(filter.largeCategoryId));
    if (filter?.mediumCategoryId)
      params.append('medium_category_id', String(filter.mediumCategoryId));
    if (filter?.organizationIds)
      params.append('organization_ids', filter.organizationIds);
    if (filter?.tagIds) params.append('tag_ids', filter.tagIds);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.totalDuration)
      params.append('total_duration', String(filter.totalDuration));
    if (filter?.ordering) params.append('ordering', String(filter.ordering));

    params.append('page_size', String(PAGINATION_PAGE_SIZE_KANBAN));

    const apiUrl = `${apiRouters.STATISTICS_TASKS}?${params.toString()}`;

    const { data } =
      await api.get<BasePagination<DataTaskListStatisticListType[]>>(apiUrl);
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticCategoryList,
    refetch: refetchStatisticCategoryList,
    isFetched: isFetchedStatisticCategoryList,
  } = useQuery({
    queryKey: ['getStatisticTaskList', [filter]],
    queryFn: getStatisticCategoryList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: BasePagination<DataTaskListStatisticListType[]>) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    statisticCategoryList,
    refetchStatisticCategoryList,
    isFetchedStatisticCategoryList,
  };
};

export default useStatisticTask;
