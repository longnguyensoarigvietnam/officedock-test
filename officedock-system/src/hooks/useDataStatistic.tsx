'use client';
import { AxiosError } from 'axios';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useQuery } from 'react-query';

import { apiRouters } from '@constants/routers';
import { NO_SETTING_CATEGORY } from '@constants';

import {
  dataStatisticResponse,
  LargeCategory,
  MediumCategory,
  OrganizationCategories,
  SmallCategory,
} from '@interfaces/statistic';

import api from '@base/api';

interface useDataStatisticProps {
  date?: string;
  userId?: string;
  organizationId?: string;
  condition?: boolean[];
  current_screen?: string;
  onError?: (error: AxiosError) => void;
}

const useDataStatistic = ({
  date,
  userId,
  organizationId,
  condition,
  current_screen,
  onError,
}: useDataStatisticProps) => {
  const { data: session } = useSessionCache();

  const token = session?.accessToken;

  // Handle call API get task calendar
  const getDataStatistic = async () => {
    const params = new URLSearchParams();

    if (date) params.append('date', date);
    if (current_screen) params.append('current_screen', current_screen);

    if (userId) params.append('user_id', userId.toString());
    if (organizationId)
      params.append('organization_id', organizationId.toString());

    const apiUrl = `${apiRouters.DATA_DAILY_STATISTIC}?${params.toString()}`;
    const { data } = await api.get<dataStatisticResponse>(apiUrl);
    return data;
  };

  // Handle API get task calendar
  const {
    data: dataStatistic,
    refetch: refetchDataStatistic,
    isFetched: isFetchedDataStatistic,
  } = useQuery({
    queryKey: [
      'getDataStatistic',
      [date, userId, organizationId, current_screen],
    ],
    queryFn: getDataStatistic,
    select: (response) => {
      const updatedCategories: OrganizationCategories = {};

      for (const orgId in response.organizationCategories) {
        const originalCategories = response.organizationCategories[orgId];

        const updated = originalCategories.map((category): LargeCategory => {
          const updatedLarge =
            category.LARGE && category.LARGE.id != null
              ? category.LARGE
              : NO_SETTING_CATEGORY;

          let updatedMedium: MediumCategory[] = [];

          if (category.MEDIUM && category.MEDIUM.length > 0) {
            updatedMedium = category.MEDIUM.map(
              (mediumItem): MediumCategory => {
                const updatedMediumValue =
                  mediumItem.MEDIUM && mediumItem.MEDIUM.id != null
                    ? mediumItem.MEDIUM
                    : NO_SETTING_CATEGORY;

                const updatedSmall: SmallCategory[] = [
                  ...(mediumItem.SMALL || []).map((smallItem) =>
                    smallItem && smallItem.id != null
                      ? smallItem
                      : NO_SETTING_CATEGORY,
                  ),
                ];

                if (updatedSmall.length === 0) {
                  updatedSmall.push(NO_SETTING_CATEGORY);
                }

                return {
                  MEDIUM: updatedMediumValue,
                  SMALL: updatedSmall,
                };
              },
            );
          } else {
            updatedMedium = [
              {
                MEDIUM: NO_SETTING_CATEGORY,
                SMALL: [NO_SETTING_CATEGORY],
              },
            ];
          }

          return {
            LARGE: updatedLarge,
            MEDIUM: updatedMedium,
          };
        });

        updatedCategories[orgId] = updated;
      }

      return {
        ...response,
        organizationCategories: updatedCategories,
      };
    },
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return { dataStatistic, refetchDataStatistic, isFetchedDataStatistic };
};

export default useDataStatistic;
