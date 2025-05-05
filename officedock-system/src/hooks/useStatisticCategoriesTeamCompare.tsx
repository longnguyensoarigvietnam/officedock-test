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
    if (!filter?.organizationIds) return [];
    if (!filter?.isCompare) return [];

    const apiUrl = `${apiRouters.STATISTICS_CATEGORIES_TEAM(parseInt(filter?.organizationIds))}?${
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
    }${filter?.orderingOptions?.tag_ids ? `&tag_ids=${filter?.orderingOptions?.tag_ids.map((item) => item.value).join(',')}` : ''}
    ${filter?.orderingOptions?.user_ids ? `&user_ids=${filter?.orderingOptions?.user_ids.map((item) => item.value).join(',')}` : ''}`;

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
