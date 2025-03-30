'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsTagTaskDuration } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  smallCategoryId?: number;
  organizationIds?: string;
  tagIds?: OptionDropdownType[];
  statisticBy?: OptionDropdownType;
}

const useStatisticTagTaskDurationsCompare = ({
  filter,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  onSuccess?: (data: StatisticsTagTaskDuration[]) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get statistic task duration list
  const getStatisticTagTaskDurationsCompare = async () => {
    if (!filter?.organizationIds) return [];
    const apiUrl = `${apiRouters.STATISTICS_TASK_DURATIONS}?is_tag_page=true&${
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
    }${filter?.statisticBy ? `&statistic_by=${filter.statisticBy.value}` : '&statistic_by=WEEK'}
    ${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsTagTaskDuration[]>(apiUrl);
    return data;
  };

  // Handle API get statistic task duration list
  const {
    data: statisticTagTaskDurationsCompareList,
    refetch: refetchStatisticTagTaskDurationsCompareList,
    isFetched: isFetchedStatisticTagTaskDurationsCompareList,
  } = useQuery({
    queryKey: ['getStatisticTagTaskDurationsCompare', [filter]],
    queryFn: getStatisticTagTaskDurationsCompare,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: StatisticsTagTaskDuration[]) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return {
    statisticTagTaskDurationsCompareList,
    refetchStatisticTagTaskDurationsCompareList,
    isFetchedStatisticTagTaskDurationsCompareList,
  };
};

export default useStatisticTagTaskDurationsCompare;
