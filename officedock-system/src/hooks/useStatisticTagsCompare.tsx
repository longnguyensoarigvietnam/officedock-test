'use client';

import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { AxiosError } from 'axios';
import { OptionDropdownType } from '@interfaces/common';

interface FilterProps {
  isCompare: boolean;
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
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

  // Handle call API get statistic tags list
  const getStatisticTagsList = async () => {
    if (!filter?.isCompare) return [];
    if (!filter?.organizationIds) return [];
    // setIsLoading(true);

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
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl);
    return data;
  };

  // Handle API get statistic tags list
  const {
    data: statisticTagsListCompare,
    refetch: refetchStatisticTagsListCompare,
    isFetched: isFetchedStatisticTagsListCompare,
  } = useQuery({
    queryKey: ['getStatisticTagsListCompare', [filter]],
    queryFn: getStatisticTagsList,
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
    statisticTagsListCompare,
    refetchStatisticTagsListCompare,
    isFetchedStatisticTagsListCompare,
  };
};

export default useStatisticsTagsCompare;
