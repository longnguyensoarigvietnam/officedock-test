'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

interface FilterProps {
  isCompare: boolean;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  smallCategoryId?: number;

  organizationIds?: string;
  organizationMemberId?: string;

  orderingOptions: {
    tag_ids: OptionDropdownType[];
    user_ids: OptionDropdownType[];
  } | null;
}

const useStatisticTagsTeamCompare = ({
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
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    setIsLoadingSmallCompare,
  } = useContext(StatisticTeamTagsStateContext);

  // Handle call API get statistic category list team
  const getStatisticTagsListTeamCompare = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.organizationIds || !filter?.isCompare) return [];

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

    if (filter.orderingOptions?.tag_ids) {
      const tagIds = filter.orderingOptions.tag_ids
        .map((item) => item.value)
        .join(',');
      params.append('tag_ids', tagIds);
    }

    if (filter.orderingOptions?.user_ids) {
      const userIds = filter.orderingOptions.user_ids
        .map((item) => item.value)
        .join(',');
      params.append('user_ids', userIds);
    }

    const apiUrl = `${apiRouters.STATISTICS_TAGS_TEAM}?${params.toString()}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticTagsListTeamCompare,
    refetch: refetchStatisticTagsListTeamCompare,
    isFetched: isFetchedStatisticTagsListTeamCompare,
  } = useQuery({
    queryKey: ['getStatisticTagsListTeamCompare', [filter]],
    queryFn: ({ signal }) => getStatisticTagsListTeamCompare({ signal }),

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
      setIsLoadingLargeCompare(false);
      setIsLoadingMediumCompare(false);
      setIsLoadingOrganizationCompare(false);
      setIsLoadingSmallCompare(false);
    },
  });

  return {
    statisticTagsListTeamCompare,
    refetchStatisticTagsListTeamCompare,
    isFetchedStatisticTagsListTeamCompare,
  };
};

export default useStatisticTagsTeamCompare;
