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
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  tagIds?: OptionDropdownType[];
  userIds?: OptionDropdownType[];
  isTagPage?: boolean;
  mainOrganizationId?: number;
}

const useStatisticAllTeamCategories = ({
  isTeam,
  filter,
  condition,
  onSuccess,
  onError,
}: {
  isTeam?: boolean;
  filter?: FilterProps;
  condition?: boolean[];
  onSuccess?: (data: StatisticsAllTeams) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoadingLarge, setIsLoadingMedium, setIsLoadingOrganization } =
    useContext(StatisticStateContext);

  const {
    setIsLoadingLarge: setIsLoadingLargeTag,
    setIsLoadingMedium: setIsLoadingMediumTag,
    setIsLoadingSmall: setIsLoadingSmallTag,
    setIsLoadingOrganization: setIsLoadingOrganizationTag,
  } = useContext(StatisticTagStateContext);

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
    if (filter?.userIds?.length) {
      const userValues = filter.userIds.map((item) => item.value).join(',');
      params.append('user_ids', userValues);
    } else {
      if (isTeam) {
        params.append('user_ids', String(null));
      }
    }
    if (filter?.mainOrganizationId)
      params.append('main_organization_id', String(filter.mainOrganizationId));

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
    queryKey: ['getStatisticAllTeamCategoryList', JSON.stringify(filter)],
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
      setIsLoadingLargeTag(false);
      setIsLoadingMediumTag(false);
      setIsLoadingSmallTag(false);
      setIsLoadingOrganizationTag(false);
    },
  });

  return {
    statisticAllTeamCategoryList,
    refetchStatisticAllTeamCategoryList,
    isFetchedStatisticAllTeamCategoryList,
  };
};

export default useStatisticAllTeamCategories;
