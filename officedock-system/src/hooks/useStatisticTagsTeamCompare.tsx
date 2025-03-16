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

const useStatisticTagsTeamCompare = ({
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
  const getStatisticTagsListTeamCompare = async () => {
    if (!filter?.organizationIds) return [];
    if (!filter?.isCompare) return [];

    const apiUrl = `${apiRouters.STATISTICS_TAGS_TEAM(parseInt(filter?.organizationIds))}?${
      filter?.fromDate ? `from_date=${filter.fromDate}` : ''
    }${filter?.endDate ? `&end_date=${filter.endDate}` : ''}${
      filter?.largeCategoryId
        ? `&large_category_id=${filter.largeCategoryId}`
        : ''
    }${
      filter?.mediumCategoryId
        ? `&medium_category_id=${filter.mediumCategoryId}`
        : ''
    }${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl);
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticTagsListTeamCompare,
    refetch: refetchStatisticTagsListTeamCompare,
    isFetched: isFetchedStatisticTagsListTeamCompare,
  } = useQuery({
    queryKey: ['getStatisticTagsListTeamCompare', [filter]],
    queryFn: getStatisticTagsListTeamCompare,
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
    statisticTagsListTeamCompare,
    refetchStatisticTagsListTeamCompare,
    isFetchedStatisticTagsListTeamCompare,
  };
};

export default useStatisticTagsTeamCompare;
