'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { NO_SETTING_CATEGORY } from '@constants';
import {
  DataResponseStatisticCreationType,
  LargeCategory,
  MediumCategory,
  SmallCategory,
} from '@interfaces/statistic';

interface useCreationDataStatisticHooksProps {
  condition?: boolean[];
  is_statistic?: boolean;
  is_calendar_page?: boolean;
  is_chat_page?: boolean;
  organization_id?: number;
  onSuccess?: (success: DataResponseStatisticCreationType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatistic = ({
  condition,
  is_statistic,
  is_calendar_page,
  is_chat_page,
  organization_id,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataStatisticHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get creation Statistic data
  const getCreationDataStatistic = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const apiUrl = `${apiRouters.STATISTIC_CREATION}${is_statistic ? `?is_statistic=true` : ''}${is_calendar_page ? `?is_calendar_page=true` : ''}${is_chat_page ? `?is_chat_page=true` : ''}${organization_id ? `?organization_id=${organization_id}` : ''}`;

    const { data } = await api.get<DataResponseStatisticCreationType>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get creation Statistic data
  const {
    data: creationDataStatisticData,
    refetch: refetchCreationDataStatistic,
    isFetched: isFetchedCreationDataStatistic,
  } = useQuery({
    queryKey: [
      'getCreationDataStatistic',
      { is_statistic, is_calendar_page, is_chat_page, organization_id },
    ],
    queryFn: ({ signal }) => getCreationDataStatistic({ signal }),
    select: (response: DataResponseStatisticCreationType) => {
      const normalizeCategories = (
        categories: LargeCategory[],
      ): LargeCategory[] => {
        return categories.map((category) => {
          const isLargeValid = category.LARGE && category.LARGE.id != null;
          const updatedLarge = isLargeValid
            ? category.LARGE
            : NO_SETTING_CATEGORY;

          let updatedMedium: MediumCategory[] = [];

          if (Array.isArray(category.MEDIUM) && category.MEDIUM.length > 0) {
            updatedMedium = category.MEDIUM.map(
              (mediumItem): MediumCategory => {
                const isMediumValid =
                  mediumItem.MEDIUM && mediumItem.MEDIUM.id != null;
                const updatedMediumValue = isMediumValid
                  ? mediumItem.MEDIUM
                  : NO_SETTING_CATEGORY;

                const updatedSmallRaw: SmallCategory[] = Array.isArray(
                  mediumItem.SMALL,
                )
                  ? mediumItem.SMALL.map((smallItem) =>
                      smallItem && smallItem.id != null
                        ? smallItem
                        : NO_SETTING_CATEGORY,
                    )
                  : [];

                const hasNoSettingSmall = updatedSmallRaw.some(
                  (s) => String(s.id) === String(NO_SETTING_CATEGORY.id),
                );

                const updatedSmall: SmallCategory[] = hasNoSettingSmall
                  ? updatedSmallRaw
                  : [NO_SETTING_CATEGORY, ...updatedSmallRaw];

                return {
                  MEDIUM: updatedMediumValue,
                  SMALL: updatedSmall,
                };
              },
            );

            const hasNoSettingMedium = updatedMedium.some(
              (m) => String(m.MEDIUM?.id) === String(NO_SETTING_CATEGORY.id),
            );

            if (!hasNoSettingMedium) {
              updatedMedium = [
                {
                  MEDIUM: NO_SETTING_CATEGORY,
                  SMALL: [NO_SETTING_CATEGORY],
                },
                ...updatedMedium,
              ];
            }
          } else {
            updatedMedium = [
              {
                MEDIUM: NO_SETTING_CATEGORY,
                SMALL: [NO_SETTING_CATEGORY],
              },
            ];
          }

          return {
            ...category,
            LARGE: updatedLarge,
            MEDIUM: updatedMedium,
          };
        });
      };

      if (is_calendar_page) {
        return {
          ...response,
          calendarOrganization: {
            ...response.calendarOrganization,
            statisticCategories: normalizeCategories(
              response.calendarOrganization.statisticCategories,
            ),
          },
        };
      }

      const updatedOrganizations = response.organizations.map(
        (organization) => ({
          ...organization,
          statisticCategories: organization.statisticCategories
            ? normalizeCategories(organization.statisticCategories)
            : [],
        }),
      );

      return {
        ...response,
        organizations: updatedOrganizations,
      };
    },

    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: DataResponseStatisticCreationType) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    creationDataStatisticData,
    refetchCreationDataStatistic,
    isFetchedCreationDataStatistic,
  };
};

export default useCreationDataStatistic;
