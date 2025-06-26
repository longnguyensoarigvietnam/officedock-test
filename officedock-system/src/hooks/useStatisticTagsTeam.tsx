'use client';

import { useQuery } from 'react-query';
import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  largeCategoryId?: number;
  mediumCategoryId?: number;
  smallCategoryId?: number;
  organizationIds?: string;
  organizationMemberId?: string;

  tagIds?: OptionDropdownType[];
}

const useStatisticTagsTeam = ({
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
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
    setIsLoadingSmall,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    setIsLoadingSmallCompare,
  } = useContext(StatisticTeamTagsStateContext);

  // Handle call API get statistic tags list team
  const getStatisticTagsListTeam = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.organizationIds) return [];

    const params = new URLSearchParams();

    if (filter.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter.endDate) params.append('end_date', String(filter.endDate));
    if (filter.organizationIds) {
      params.append('organization_id', filter.organizationIds.toString());
    }
    if (filter.organizationMemberId)
      params.append(
        'organization_get_members_id',
        filter.organizationMemberId.toString(),
      );
    if (filter.largeCategoryId)
      params.append('large_category_id', filter.largeCategoryId.toString());
    if (filter.mediumCategoryId)
      params.append('medium_category_id', filter.mediumCategoryId.toString());
    if (filter.smallCategoryId)
      params.append('small_category_id', filter.smallCategoryId.toString());

    if (filter.tagIds) {
      const tagIds = filter.tagIds.map((item) => item.value).join(',');
      params.append('tag_ids', tagIds);
    }

    const apiUrl = `${apiRouters.STATISTICS_TAGS_TEAM}?${params.toString()}`;

    const { data } = await api.get<StatisticsCategories[]>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic tag team list
  const {
    data: statisticTagsListTeam,
    refetch: refetchStatisticTagsListTeam,
    isFetched: isFetchedStatisticTagsListTeam,
  } = useQuery({
    queryKey: ['getStatisticTagsListTeam', [filter]],
    queryFn: ({ signal }) => getStatisticTagsListTeam({ signal }),

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
    onSettled: () => {
      setIsLoadingLarge(false);
      setIsLoadingMedium(false);
      setIsLoadingOrganization(false);
      setIsLoadingSmall(false);
      setIsLoadingLargeCompare(false);
      setIsLoadingMediumCompare(false);
      setIsLoadingOrganizationCompare(false);
      setIsLoadingSmallCompare(false);
    },
  });

  return {
    statisticTagsListTeam,
    refetchStatisticTagsListTeam,
    isFetchedStatisticTagsListTeam,
  };
};

export default useStatisticTagsTeam;
