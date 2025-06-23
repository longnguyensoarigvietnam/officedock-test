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
  isTagPage?: boolean;
  selectedOrganization?: string;
  organizationMemberId?: string;
}

const useStatisticUserTaskDurationsCompare = ({
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
  const getStatisticUserTaskDurationsCompare = async () => {
    if (!filter?.selectedOrganization || !filter.userIds) return [];
    const queryParams = [];
    if (filter.fromDate) {
      queryParams.push(`from_date=${filter.fromDate}`);
    }
    if (filter.endDate) {
      queryParams.push(`end_date=${filter.endDate}`);
    }
    if (filter.organizationMemberId) {
      queryParams.push(
        `organization_get_members_id=${filter.organizationMemberId.toString()}`,
      );
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
    if (filter.isTagPage) {
      queryParams.push(`is_tag_page=${filter.isTagPage}`);
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

  // Handle API get statistic task duration compare list
  const {
    data: statisticUserTaskDurationsCompareList,
    refetch: refetchStatisticUserTaskDurationsCompareList,
    isLoading: isLoadingStatisticUserTaskDurationsCompareList,
  } = useQuery({
    queryKey: ['getStatisticUserTaskDurationsCompare', [filter]],
    queryFn: getStatisticUserTaskDurationsCompare,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: StatisticsUserTaskDuration[]) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return {
    statisticUserTaskDurationsCompareList,
    refetchStatisticUserTaskDurationsCompareList,
    isLoadingStatisticUserTaskDurationsCompareList,
  };
};

export default useStatisticUserTaskDurationsCompare;
