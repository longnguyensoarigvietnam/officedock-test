'use client';

import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { AxiosError } from 'axios';

interface FilterProps {
  isCompare: boolean;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  organizationIds?: string;
  tagIds?: string;
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
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds}` : ''}`;

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
    onSettled: () => {},
  });

  return {
    statisticCategoryListTeamCompare,
    refetchStatisticCategoryListTeamCompare,
    isFetchedStatisticCategoryListTeamCompare,
  };
};

export default useStatisticCategoriesTeamCompare;
