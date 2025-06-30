'use client';

import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

interface FilterProps {
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

const useStatisticCategoriesTeam = ({
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
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
  } = useContext(StatisticTeamStateContext);

  // Handle call API get statistic category list team
  const getStatisticCategoryListTeam = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.organizationIds) return [];

    const params = new URLSearchParams();
    if (filter.organizationIds)
      params.append('organization_id', filter?.organizationIds.toString());
    if (filter.organizationMemberId)
      params.append(
        'organization_get_members_id',
        filter.organizationMemberId.toString(),
      );
    if (filter.fromDate) params.set('from_date', String(filter.fromDate));
    if (filter.endDate) params.set('end_date', String(filter.endDate));
    if (filter.largeCategoryId)
      params.set('large_category_id', String(filter.largeCategoryId));
    if (filter.mediumCategoryId)
      params.set('medium_category_id', String(filter.mediumCategoryId));
    if (filter.smallCategoryId)
      params.set('small_category_id', String(filter.smallCategoryId));

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

    const apiUrl = `${apiRouters.STATISTICS_CATEGORIES_TEAM}?${params.toString()}`;
    const { data } = await api.get<StatisticsCategories[]>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticCategoryListTeam,
    refetch: refetchStatisticCategoryListTeam,
    isFetched: isFetchedStatisticCategoryListTeam,
  } = useQuery({
    queryKey: ['getStatisticCategoryListTeam', [filter]],
    queryFn: ({ signal }) => getStatisticCategoryListTeam({ signal }),
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
      setIsLoadingLargeCompare(false);
      setIsLoadingMediumCompare(false);
      setIsLoadingOrganizationCompare(false);
    },
  });

  return {
    statisticCategoryListTeam,
    refetchStatisticCategoryListTeam,
    isFetchedStatisticCategoryListTeam,
  };
};

export default useStatisticCategoriesTeam;
