'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { StatisticStateContext } from '@providers/StatisticProvider';

import { apiRouters } from '@constants/routers';

import { StatisticsAllTeams } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  tagIds?: OptionDropdownType[];
  isCompare: boolean;
}

const useStatisticAllTeamCategoriesCompare = ({
  filter,
  condition,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  condition?: boolean[];
  onSuccess?: (data: StatisticsAllTeams) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const {
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
  } = useContext(StatisticStateContext);

  // Handle call API get statistic category list
  const getStatisticAllTeamCategoryCompareList = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams();
    if (!filter?.isCompare) return [];
    if (filter?.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter?.endDate) params.append('end_date', String(filter.endDate));
    if (filter?.tagIds) {
      const tagValues = filter.tagIds.map((item) => item.value).join(',');
      params.append('tag_ids', tagValues);
    }

    const apiUrl = `${apiRouters.STATISTICS_ALL_TEAMS_CATEGORIES}?${params.toString()}`;
    const { data } = await api.get<StatisticsAllTeams>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic all team category list
  const {
    data: statisticAllTeamCategoryCompareList,
    refetch: refetchStatisticAllTeamCategoryCompareList,
    isFetched: isFetchedStatisticAllTeamCategoryCompareList,
  } = useQuery({
    queryKey: ['getStatisticAllTeamCategoryCompareList', [filter]],
    queryFn: ({ signal }) => getStatisticAllTeamCategoryCompareList({ signal }),

    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: StatisticsAllTeams) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoadingLargeCompare(false);
      setIsLoadingMediumCompare(false);
      setIsLoadingOrganizationCompare(false);
    },
  });

  return {
    statisticAllTeamCategoryCompareList,
    refetchStatisticAllTeamCategoryCompareList,
    isFetchedStatisticAllTeamCategoryCompareList,
  };
};

export default useStatisticAllTeamCategoriesCompare;
