'use client';

import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { useContext } from 'react';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { BasePagination, OptionDropdownType } from '@interfaces/common';
import { DataTaskListStatisticListType } from '@interfaces/statistic';
import { StatisticStateContext } from '@providers/StatisticProvider';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

interface FilterProps {
  page: number;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | null;
  mediumCategoryId?: number | null;
  smallCategoryId?: number | null;
  organizationIds?: string;
  tagIds?: OptionDropdownType[];
  totalDuration?: string;
  ordering: string;
  pageSize: number;
  user_id?: number;
}

const useStatisticTask = ({
  created_at,
  filter,
  isTeam = false,
  is_tag_page = false,
  onSuccess,
  onError,
}: {
  is_tag_page?: boolean;

  isScroll?: boolean;
  created_at?: string;
  isTeam?: boolean;
  filter?: FilterProps;

  onSuccess?: (data: BasePagination<DataTaskListStatisticListType[]>) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { setIsSkeletonCategoryTask } = useContext(StatisticStateContext);
  const { setIsSkeletonTagTask } = useContext(StatisticTagStateContext);
  const { setIsSkeletonCategoryTeamTask } = useContext(
    StatisticTeamStateContext,
  );
  const { setIsSkeletonTagTeamTask } = useContext(
    StatisticTeamTagsStateContext,
  );

  // Handle call API get statistic category list
  const getStatisticCategoryList = async () => {
    if (!filter?.organizationIds) return null;
    if (isTeam && !filter.user_id) return [];
    setIsSkeletonCategoryTask(true);
    setIsSkeletonTagTask(true);
    setIsSkeletonCategoryTeamTask(true);
    setIsSkeletonTagTeamTask(true);

    const params = new URLSearchParams();
    if (filter?.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter?.endDate) params.append('end_date', String(filter.endDate));
    if (filter?.largeCategoryId && filter.largeCategoryId !== undefined)
      params.append('large_category_id', String(filter.largeCategoryId));
    if (filter?.mediumCategoryId)
      params.append('medium_category_id', String(filter.mediumCategoryId));
    if (filter?.smallCategoryId)
      params.append('small_category_id', String(filter.smallCategoryId));
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
    if (created_at) params.append('created_at', String(created_at));
    if (filter?.user_id) params.append('user_id', String(filter.user_id));
    if (is_tag_page) params.append('is_tag_page', String(is_tag_page));

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
      setIsSkeletonCategoryTask(false);
      setIsSkeletonTagTask(false);
      setIsSkeletonCategoryTeamTask(false);
      setIsSkeletonTagTeamTask(false);
    },
  });

  return {
    statisticCategoryList,
    refetchStatisticCategoryList,
    isFetchedStatisticCategoryList,
  };
};

export default useStatisticTask;
