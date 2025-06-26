'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticStateContext } from '@providers/StatisticProvider';

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

const useStatisticCategories = ({
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

  const { setIsLoadingLarge, setIsLoadingMedium, setIsLoadingOrganization } =
    useContext(StatisticStateContext);

  // Handle call API get statistic category list
  const getStatisticCategoryList = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    if (!filter?.organizationIds) return [];

    const params = new URLSearchParams();

    if (filter.fromDate) params.append('from_date', String(filter.fromDate));
    if (filter.endDate) params.append('end_date', String(filter.endDate));
    if (filter.largeCategoryId)
      params.append('large_category_id', filter.largeCategoryId.toString());
    if (filter.mediumCategoryId)
      params.append('medium_category_id', filter.mediumCategoryId.toString());
    if (filter.smallCategoryId)
      params.append('small_category_id', filter.smallCategoryId.toString());
    if (filter.organizationIds)
      params.append('organization_ids', filter.organizationIds.toString());
    if (filter.organizationMemberId)
      params.append(
        'organization_get_members_id',
        filter.organizationMemberId.toString(),
      );
    if (filter.tagIds) {
      const tagValues = filter.tagIds.map((item) => item.value).join(',');
      params.append('tag_ids', tagValues);
    }

    const apiUrl = `${apiRouters.STATISTICS_CATEGORIES}?${params.toString()}`;
    const { data } = await api.get<StatisticsCategories[]>(apiUrl, { signal });
    return data;
  };

  // Handle API get statistic category list
  const {
    data: statisticCategoryList,
    refetch: refetchStatisticCategoryList,
    isFetched: isFetchedStatisticCategoryList,
  } = useQuery({
    queryKey: ['getStatisticCategoryList', [filter]],
    queryFn: ({ signal }) => getStatisticCategoryList({ signal }),

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
    },
  });

  return {
    statisticCategoryList,
    refetchStatisticCategoryList,
    isFetchedStatisticCategoryList,
  };
};

export default useStatisticCategories;
