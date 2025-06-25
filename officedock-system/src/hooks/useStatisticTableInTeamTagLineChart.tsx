'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  smallCategoryId?: number;
  organizationIds?: string;
  organizationMemberId?: string;

  selectedTags: OptionDropdownType[];
  userIds: string;
}

const useStatisticTableInTeamTagLineChart = ({
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

  // Handle call API get statistic table in team tag line chart
  const getStatisticTableInTeamTagLineChart = async () => {
    if (!filter?.organizationIds || !filter?.userIds) return [];
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
    if (filter.organizationIds) {
      queryParams.push(`organization_id=${filter.organizationIds}`);
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
    if (filter.selectedTags) {
      queryParams.push(
        `tag_ids=${filter?.selectedTags.map((item) => item.value).join(',')}`,
      );
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const apiUrl = `${apiRouters.STATISTICS_TAGS_TEAM}${queryString}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl);
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticTableInTeamTagLineChart,
    refetch: refetchStatisticTableInTeamTagLineChart,
    isLoading: isLoadingStatisticTableInTeamTagLineChart,
  } = useQuery({
    queryKey: ['getStatisticTableInTeamTagLineChart', [filter]],
    queryFn: getStatisticTableInTeamTagLineChart,
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
  });

  return {
    statisticTableInTeamTagLineChart,
    refetchStatisticTableInTeamTagLineChart,
    isLoadingStatisticTableInTeamTagLineChart,
  };
};

export default useStatisticTableInTeamTagLineChart;
