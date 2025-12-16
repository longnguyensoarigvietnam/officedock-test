'use client';

import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

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
  largeCategoryId?: number | string | null;
  mediumCategoryId?: number | string | null;
  smallCategoryId?: number | string | null;
  organizationIds?: string;
  organizationId?: string;
  tagIds?: OptionDropdownType[];
  totalDuration?: string;
  ordering: string;
  pageSize: number;
  user_id?: number;
  user_ids?: OptionDropdownType[];
  mainOrganizationId?: number;
}

const useStatisticTask = ({
  cursor_id,
  cursor,
  filter,
  isTeam = false,
  is_tag_page = false,
  conditions,
  onSuccess,
  onError,
}: {
  is_tag_page?: boolean;
  isScroll?: boolean;
  cursor_id?: string;
  cursor?: string;
  isTeam?: boolean;
  filter?: FilterProps;
  conditions?: boolean[];
  onSuccess?: (data: BasePagination<DataTaskListStatisticListType[]>) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
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
  const getStatisticCategoryList = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.organizationIds) return null;

    if (filter?.totalDuration === '') return null;

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
    if (filter?.organizationId)
      params.append('organization_id', filter.organizationId);
    if (filter?.organizationIds)
      params.append('organization_ids', filter.organizationIds);
    if (filter?.mainOrganizationId)
      params.append('main_organization_id', String(filter.mainOrganizationId));
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
    if (cursor_id) params.append('cursor_id', String(cursor_id));
    if (cursor) params.append('cursor', String(cursor));
    if (filter?.user_id) params.append('user_id', String(filter.user_id));
    if (is_tag_page) params.append('is_tag_page', String(is_tag_page));
    if (isTeam) params.append('current_screen', 'teamdock');
    if (filter.user_ids) {
      const tagValues = filter.user_ids.map((item) => item.value).join(',');
      params.append('user_ids', tagValues);
    }

    const apiUrl = `${apiRouters.STATISTICS_TASKS}?${params.toString()}`;

    const { data } = await api.get<
      BasePagination<DataTaskListStatisticListType[]>
    >(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticCategoryList,
    refetch: refetchStatisticCategoryList,
    isFetched: isFetchedStatisticCategoryList,
  } = useQuery({
    queryKey: ['getStatisticTaskList', [filter]],
    queryFn: ({ signal }) => getStatisticCategoryList({ signal }),

    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
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
