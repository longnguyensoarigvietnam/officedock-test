'use client';

import { useQuery } from 'react-query';
import { useContext } from 'react';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

interface FilterProps {
  isCompare: boolean;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  smallCategoryId?: number;

  organizationIds?: string;
  tagIds?: OptionDropdownType[];
}

const useStatisticsTagsCompare = ({
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
    setIsLoadingSmallCompare,
  } = useContext(StatisticTagStateContext);

  // Handle call API get statistic tags list
  const getStatisticTagsList = async ({ signal }: { signal?: AbortSignal }) => {
    if (!filter?.isCompare) return [];
    if (!filter?.organizationIds) return [];

    const apiUrl = `${apiRouters.STATISTICS_TAGS}?${
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
      filter?.organizationIds
        ? `&organization_ids=${filter.organizationIds}`
        : ''
    }${
      filter?.smallCategoryId
        ? `&small_category_id=${filter.smallCategoryId}`
        : ''
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic tags list
  const {
    data: statisticTagsListCompare,
    refetch: refetchStatisticTagsListCompare,
    isFetched: isFetchedStatisticTagsListCompare,
  } = useQuery({
    queryKey: ['getStatisticTagsListCompare', [filter]],
    queryFn: ({ signal }) => getStatisticTagsList({ signal }),
    retry: 0,
    enabled: !!token,
    staleTime: 0,
    cacheTime: 0,
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
    statisticTagsListCompare,
    refetchStatisticTagsListCompare,
    isFetchedStatisticTagsListCompare,
  };
};

export default useStatisticsTagsCompare;
