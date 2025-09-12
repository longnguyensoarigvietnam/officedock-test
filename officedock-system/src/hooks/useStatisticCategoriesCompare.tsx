'use client';

import { AxiosError } from 'axios';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticStateContext } from '@providers/StatisticProvider';

interface FilterProps {
  isCompare: boolean;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | string;
  mediumCategoryId?: number | string;
  smallCategoryId?: number | string;
  organizationIds?: string;
  tagIds?: OptionDropdownType[];
}

const useStatisticCategoriesCompare = ({
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
  } = useContext(StatisticStateContext);

  // Handle call API get statistic category list
  const getStatisticCategoryList = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.isCompare) return [];
    if (!filter?.organizationIds) return [];

    const apiUrl = `${apiRouters.STATISTICS_CATEGORIES}?${
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
    }${
      filter?.organizationIds
        ? `&organization_ids=${filter.organizationIds}`
        : ''
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticCategoryCompareList,
    refetch: refetchStatisticCategoryList,
    isFetched: isFetchedStatisticCategoryList,
  } = useQuery({
    queryKey: ['getStatisticCategoryCompareList', [filter]],
    queryFn: ({ signal }) => getStatisticCategoryList({ signal }),

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
    },
  });

  return {
    statisticCategoryCompareList,
    refetchStatisticCategoryList,
    isFetchedStatisticCategoryList,
  };
};

export default useStatisticCategoriesCompare;
