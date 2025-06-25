'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';
import { useContext } from 'react';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

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

const useStatisticCategoriesTeamCompare = ({
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
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
  } = useContext(StatisticTeamStateContext);

  // Handle call API get statistic category list team
  const getStatisticCategoryListTeamCompare = async () => {
    if (!filter?.organizationIds || !filter?.isCompare) return [];

    const params = new URLSearchParams();

    if (filter.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter.endDate) params.append('end_date', String(filter.endDate));
    if (filter.organizationIds)
      params.append('organization_id', filter?.organizationIds.toString());
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

    const apiUrl = `${apiRouters.STATISTICS_CATEGORIES_TEAM}?${params.toString()}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl);
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticCategoryListTeamCompare,
    refetch: refetchStatisticCategoryListTeamCompare,
    isFetched: isFetchedStatisticCategoryListTeamCompare,
  } = useQuery({
    queryKey: ['getStatisticCategoryListTeamCompare', [filter]],
    queryFn: getStatisticCategoryListTeamCompare,
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
      setIsLoadingLargeCompare(false);
      setIsLoadingMediumCompare(false);
      setIsLoadingOrganizationCompare(false);
    },
  });

  return {
    statisticCategoryListTeamCompare,
    refetchStatisticCategoryListTeamCompare,
    isFetchedStatisticCategoryListTeamCompare,
  };
};

export default useStatisticCategoriesTeamCompare;
