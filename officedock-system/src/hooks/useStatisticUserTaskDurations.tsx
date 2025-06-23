'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import { StatisticsUserTaskDuration } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number | string;
  mediumCategoryId?: number | string;
  smallCategoryId?: number | string;
  userIds?: string;
  tagIds?: OptionDropdownType[];
  statisticBy?: string;
  selectedOrganization?: string;
}

const useStatisticUserTaskDurations = ({
  filter,
  condition,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  condition?: boolean[];
  onSuccess?: (data: StatisticsUserTaskDuration[]) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get statistic task duration list
  const getStatisticUserTaskDurations = async () => {
    if (!filter?.selectedOrganization) return [];
    const queryParams = [];
    if (filter.fromDate) {
      queryParams.push(`from_date=${filter.fromDate}`);
    }
    if (filter.endDate) {
      queryParams.push(`end_date=${filter.endDate}`);
    }
    if (filter.largeCategoryId) {
      queryParams.push(`large_category_id=${filter.largeCategoryId}`);
    }
    if (filter.mediumCategoryId) {
      queryParams.push(`medium_category_id=${filter.mediumCategoryId}`);
    }
    if (filter.smallCategoryId) {
      queryParams.push(`small_category_id=${filter.smallCategoryId}`);
    }
    if (filter.userIds) {
      queryParams.push(`user_ids=${filter.userIds}`);
    }
    if (filter.statisticBy) {
      queryParams.push(`statistic_by=${filter.statisticBy}`);
    } else {
      queryParams.push('statistic_by=WEEK');
    }
    if (filter.tagIds && filter.tagIds?.length > 0) {
      queryParams.push(
        `tag_ids=${filter.tagIds.map((item) => item.value).join(',')}`,
      );
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    const apiUrl = `${apiRouters.STATISTICS_USER_TASK_DURATIONS(Number(filter.selectedOrganization))}${queryString}`;

    const { data } = await api.get<StatisticsUserTaskDuration[]>(apiUrl);
    return data;
  };

  // Handle API get statistic task duration list
  const {
    data: statisticUserTaskDurationsList,
    refetch: refetchStatisticUserTaskDurationsList,
    isLoading: isLoadingStatisticUserTaskDurationsList,
  } = useQuery({
    queryKey: ['getStatisticUserTaskDurations', [filter]],
    queryFn: getStatisticUserTaskDurations,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // data is considered immediately stale
    cacheTime: 0, // disable in-memory caching
    onSuccess: (data: StatisticsUserTaskDuration[]) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return {
    statisticUserTaskDurationsList,
    refetchStatisticUserTaskDurationsList,
    isLoadingStatisticUserTaskDurationsList,
  };
};

export default useStatisticUserTaskDurations;
