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
  isTagPage?: boolean;
}

const useStatisticAllTeamCategories = ({
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

  const { setIsLoadingLarge, setIsLoadingMedium, setIsLoadingOrganization } =
    useContext(StatisticStateContext);

  // Handle call API get statistic category list
  const getStatisticAllTeamCategoryList = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams();

    if (filter?.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter?.endDate) params.append('end_date', String(filter.endDate));
    if (filter?.tagIds) {
      const tagValues = filter.tagIds.map((item) => item.value).join(',');
      params.append('tag_ids', tagValues);
    }
    if (filter?.isTagPage) {
      params.append('is_tag_page', String(true));
    }

    const apiUrl = `${apiRouters.STATISTICS_ALL_TEAMS_CATEGORIES}?${params.toString()}`;
    const { data } = await api.get<StatisticsAllTeams>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic all team category list
  const {
    data: statisticAllTeamCategoryList,
    refetch: refetchStatisticAllTeamCategoryList,
    isFetched: isFetchedStatisticAllTeamCategoryList,
  } = useQuery({
    queryKey: ['getStatisticAllTeamCategoryList', [filter]],
    queryFn: ({ signal }) => getStatisticAllTeamCategoryList({ signal }),

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
      setIsLoadingLarge(false);
      setIsLoadingMedium(false);
      setIsLoadingOrganization(false);
    },
  });

  return {
    statisticAllTeamCategoryList,
    refetchStatisticAllTeamCategoryList,
    isFetchedStatisticAllTeamCategoryList,
  };
};

export default useStatisticAllTeamCategories;
