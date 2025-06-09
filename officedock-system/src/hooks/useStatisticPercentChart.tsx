'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsPercentChart } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | string;
  mediumCategoryId?: number | string;
  smallCategoryId?: number | string;
  organizationIds?: string;
  tagIds?: OptionDropdownType[];
  statisticBy?: string;
  isTagPage?: boolean;
}

const useStatisticPercentChart = ({
  filter,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  onSuccess?: (data: StatisticsPercentChart[]) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get statistic task duration list
  const getStatisticPercentChart = async () => {
    if (!filter?.organizationIds) return [];
    const apiUrl = `${apiRouters.STATISTICS_PERCENT_CHART}?${
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
    }${filter?.statisticBy ? `&statistic_by=${filter.statisticBy}` : '&statistic_by=WEEK'}${
      filter?.isTagPage
        ? `&is_tag_page=${filter.isTagPage ? 'true' : 'false'}`
        : ''
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsPercentChart[]>(apiUrl);
    return data;
  };

  // Handle API get statistic task duration list
  const {
    data: statisticPercentChartList,
    refetch: refetchStatisticPercentChartList,
    isFetched: isFetchedStatisticPercentChartList,
  } = useQuery({
    queryKey: ['getStatisticPercentChart', [filter]],
    queryFn: getStatisticPercentChart,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: StatisticsPercentChart[]) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return {
    statisticPercentChartList,
    refetchStatisticPercentChartList,
    isFetchedStatisticPercentChartList,
  };
};

export default useStatisticPercentChart;
