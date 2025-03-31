'use client';

import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  smallCategoryId?: number;
  organizationIds?: string;
  tagIds?: OptionDropdownType[];
}

const useStatisticTagsTeam = ({
  filter,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  onSuccess?: (data: StatisticsCategories) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const {
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
    setIsLoadingSmall,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    setIsLoadingSmallCompare,
  } = useContext(StatisticTeamTagsStateContext);

  // Handle call API get statistic tags list team
  const getStatisticTagsListTeam = async () => {
    if (!filter?.organizationIds) return [];
    const apiUrl = `${apiRouters.STATISTICS_TAGS_TEAM(parseInt(filter?.organizationIds))}?${
      filter?.fromDate ? `from_date=${filter.fromDate}` : ''
    }${filter?.endDate ? `&end_date=${filter.endDate}` : ''}${
      filter?.largeCategoryId
        ? `&large_category_id=${filter.largeCategoryId}`
        : ''
    }${
      filter?.mediumCategoryId
        ? `&medium_category_id=${filter.mediumCategoryId}`
        : ''
    }${
      filter?.smallCategoryId
        ? `&small_category_id=${filter.smallCategoryId}`
        : ''
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl);
    return data;
  };

  // Handle API get statistic tag team list
  const {
    data: statisticTagsListTeam,
    refetch: refetchStatisticTagsListTeam,
    isFetched: isFetchedStatisticTagsListTeam,
  } = useQuery({
    queryKey: ['getStatisticTagsListTeam', [filter]],
    queryFn: getStatisticTagsListTeam,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: StatisticsCategories) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoadingLarge(false);
      setIsLoadingMedium(false);
      setIsLoadingOrganization(false);
      setIsLoadingSmall(false);
      setIsLoadingLargeCompare(false);
      setIsLoadingMediumCompare(false);
      setIsLoadingOrganizationCompare(false);
      setIsLoadingSmallCompare(false);
    },
  });

  return {
    statisticTagsListTeam,
    refetchStatisticTagsListTeam,
    isFetchedStatisticTagsListTeam,
  };
};

export default useStatisticTagsTeam;
