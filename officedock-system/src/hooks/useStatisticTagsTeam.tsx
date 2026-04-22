'use client';

import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | string;
  mediumCategoryId?: number | string;
  smallCategoryId?: number | string;
  organizationIds?: string;
  organizationMemberId?: string;
  orderingOptions: {
    tag_ids: OptionDropdownType[];
    user_ids: OptionDropdownType[];
  } | null;
}

const useStatisticTagsTeam = ({
  filter,
  condition,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  condition?: boolean[];
  onSuccess?: (data: StatisticsCategories) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
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
  const getStatisticTagsListTeam = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.organizationIds) return [];

    const params = new URLSearchParams();

    if (filter.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter.endDate) params.append('end_date', String(filter.endDate));
    if (filter.organizationIds) {
      params.append('organization_id', filter.organizationIds.toString());
    }
    if (filter.organizationMemberId)
      params.append(
        'organization_get_members_id',
        filter.organizationMemberId.toString(),
      );
    if (filter.largeCategoryId)
      params.append('large_category_id', filter.largeCategoryId.toString());
    if (filter.mediumCategoryId)
      params.append('medium_category_id', filter.mediumCategoryId.toString());
    if (filter.smallCategoryId)
      params.append('small_category_id', filter.smallCategoryId.toString());

    const tagIds = filter.orderingOptions?.tag_ids
      ?.map((item) => String(item.value).trim())
      .filter((val) => val !== '' && val !== undefined && val !== null)
      .join(',');
    if (tagIds && tagIds.length > 0) {
      params.set('tag_ids', tagIds);
    }

    const userIds = filter.orderingOptions?.user_ids
      ?.map((item) => String(item.value).trim())
      .filter((val) => val !== '' && val !== undefined && val !== null)
      .join(',');
    if (userIds && userIds.length > 0) {
      params.set('user_ids', userIds);
    }

    const apiUrl = `${apiRouters.STATISTICS_TAGS_TEAM}?${params.toString()}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic tag team list
  const {
    data: statisticTagsListTeam,
    refetch: refetchStatisticTagsListTeam,
    isFetched: isFetchedStatisticTagsListTeam,
  } = useQuery({
    queryKey: ['getStatisticTagsListTeam', JSON.stringify(filter)],
    queryFn: ({ signal }) => getStatisticTagsListTeam({ signal }),

    retry: 0,
    enabled: !!token && condition?.every(Boolean),
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
