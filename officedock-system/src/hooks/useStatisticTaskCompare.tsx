'use client';

import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { AxiosError } from 'axios';
import { BasePagination, OptionDropdownType } from '@interfaces/common';
import { DataTaskListStatisticListType } from '@interfaces/statistic';

interface FilterProps {
  page: number;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | null;
  mediumCategoryId?: number | null;
  organizationIds?: string;
  totalDuration?: string;
  ordering: string;
  pageSize: number;
  isCompare: boolean;
  tagIds?: OptionDropdownType[];
}

const useStatisticTaskCompare = ({
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

  // Handle call API get statistic category list
  const getStatisticCategoryList = async () => {
    if (!filter?.isCompare) return null;
    if (!filter?.organizationIds) return null;

    const params = new URLSearchParams();

    if (filter?.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter?.endDate) params.append('end_date', String(filter.endDate));
    if (filter?.largeCategoryId)
      params.append('large_category_id', String(filter.largeCategoryId));
    if (filter?.mediumCategoryId)
      params.append('medium_category_id', String(filter.mediumCategoryId));
    if (filter?.organizationIds)
      params.append('organization_ids', filter.organizationIds);
    if (filter?.tagIds)
      params.append(
        'tag_ids',
        filter.tagIds.map((item) => item.value).join(','),
      );
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.totalDuration)
      params.append('total_duration', String(filter.totalDuration));
    if (filter?.ordering) params.append('ordering', String(filter.ordering));
    if (filter?.pageSize) params.append('page_size', String(filter.pageSize));

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
    queryKey: ['getStatisticTaskListCompare', [filter]],
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
    onSettled: () => {},
  });

  return {
    statisticCategoryList,
    refetchStatisticCategoryList,
    isFetchedStatisticCategoryList,
  };
};

export default useStatisticTaskCompare;
