'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { CreationDataCommon } from '@interfaces/common';
import {
  LargeCategory,
  MediumCategory,
  SmallCategory,
} from '@interfaces/statistic';
import { NO_SETTING_CATEGORY } from '@constants';

interface useCreationDataCommonHooksProps {
  condition?: boolean[];
  organizationId?: string;
  userId?: string | number;
  screenName?: string;
  options?: {
    get_all_members?: boolean;
    get_all_organizations?: boolean;
    get_calendar_organization?: boolean;
    get_event_locations?: boolean;
    get_event_types?: boolean;
    get_organization_for_team_statistic?: boolean;
    get_organization_members?: boolean;
    get_organization_skills?: boolean;
    get_organization_with_categories?: boolean;
    get_organizations_of_user_by_screen?: string;
    get_roles?: boolean;
    get_statistic_categories?: boolean;
    get_tags?: boolean;
    get_tags_of_organization?: boolean;
    get_task_status?: boolean;
    get_user_setting?: boolean;
    get_filter_organization_categories?: boolean;
    get_organization_with_users?: boolean;
    is_organization_calendar?: boolean;
    get_organization_for_my_statistic?: boolean;
    get_company?: boolean;
    get_unanswered_count_of_survey?: boolean;
    get_current_mvp_vote?: boolean;
    get_balances_of_user?: boolean;
    get_items_of_user?: boolean;
    get_organizations_for_all_team_statistic?: boolean;
    has_include_deleted_user?: string;
  };
  onSuccess?: (success: CreationDataCommon) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataCommon = ({
  organizationId,
  userId,
  screenName,
  options,
  condition,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataCommonHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();

    if (organizationId) params.append('organization_id', organizationId);
    if (userId) params.append('user_id', String(userId));
    if (screenName) params.append('screen_name', String(screenName));

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (typeof value === 'boolean' && value) {
          params.append(key, 'true');
        } else if (typeof value === 'string' && value) {
          params.append(key, value);
        }
      });
    }

    return params.toString() ? `?${params.toString()}` : '';
  };

  const getCreationDataCommon = async () => {
    const apiUrl = `${apiRouters.COMMON_CREATION}${buildQueryString()}`;
    const { data } = await api.get<CreationDataCommon>(apiUrl);
    return data;
  };

  const {
    data: creationDataCommonData,
    refetch: refetchCreationDataCommon,
    isFetching: isFetchingCreationDataCommon,
  } = useQuery({
    queryKey: ['getCreationDataCommon', organizationId, options],
    queryFn: getCreationDataCommon,
    select: (response: CreationDataCommon) => {
      let responseCustom = { ...response };
      if (response.organizationCategories) {
        const updatedOrganizations = response.organizationCategories.map(
          (org) => {
            const updatedCategories = org.statisticCategories.map(
              (category) => {
                const updatedLarge =
                  category.LARGE && category.LARGE.id != null
                    ? category.LARGE
                    : NO_SETTING_CATEGORY;

                const updatedMedium: MediumCategory[] = [
                  ...(category.MEDIUM || []).map(
                    (mediumItem): MediumCategory => {
                      const updatedMediumValue =
                        mediumItem.MEDIUM && mediumItem.MEDIUM.id != null
                          ? mediumItem.MEDIUM
                          : NO_SETTING_CATEGORY;

                      const updatedSmall: SmallCategory[] = [
                        ...(mediumItem.SMALL || []).map(
                          (smallItem): SmallCategory =>
                            smallItem && smallItem.id != null
                              ? smallItem
                              : NO_SETTING_CATEGORY,
                        ),
                        NO_SETTING_CATEGORY,
                      ];

                      return {
                        MEDIUM: updatedMediumValue,
                        SMALL: updatedSmall,
                      };
                    },
                  ),
                  {
                    MEDIUM: NO_SETTING_CATEGORY,
                    SMALL: [NO_SETTING_CATEGORY],
                  },
                ];

                // remove duplicate MEDIUM by id
                const uniqueUpdatedMedium = Array.from(
                  new Map(
                    updatedMedium.map((medium) => [
                      medium.MEDIUM?.id ?? NO_SETTING_CATEGORY,
                      medium,
                    ]),
                  ).values(),
                );

                return {
                  ...category,
                  LARGE: updatedLarge,
                  MEDIUM: uniqueUpdatedMedium,
                };
              },
            );

            return {
              ...org,
              statisticCategories: updatedCategories,
            };
          },
        );
        responseCustom = {
          ...responseCustom,
          organizationCategories: updatedOrganizations,
        };
      }
      if (response.myStatistics) {
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
                    : [...updatedSmallRaw, NO_SETTING_CATEGORY];

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
                  ...updatedMedium,
                  {
                    MEDIUM: NO_SETTING_CATEGORY,
                    SMALL: [NO_SETTING_CATEGORY],
                  },
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

        const updatedOrganizations = response.myStatistics.map(
          (organization) => ({
            ...organization,
            statisticCategories: organization.statisticCategories
              ? normalizeCategories(organization.statisticCategories)
              : [],
          }),
        );

        responseCustom = {
          ...responseCustom,
          myStatistics: updatedOrganizations,
        };
      }
      if (response.organizationStatistics) {
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
                    : [...updatedSmallRaw, NO_SETTING_CATEGORY];

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
                  ...updatedMedium,
                  {
                    MEDIUM: NO_SETTING_CATEGORY,
                    SMALL: [NO_SETTING_CATEGORY],
                  },
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

        const updatedOrganizations = response.organizationStatistics.map(
          (organization) => ({
            ...organization,
            statisticCategories: organization.statisticCategories
              ? normalizeCategories(organization.statisticCategories)
              : [],
          }),
        );

        responseCustom = {
          ...responseCustom,
          organizationStatistics: updatedOrganizations,
        };
      }
      if (response.organizationsOfAllTeamStatistic) {
        const updatedOrganizations =
          response.organizationsOfAllTeamStatistic.map((org) => {
            const updatedCategories = org.statisticCategories.map(
              (category) => {
                const updatedLarge =
                  category.LARGE && category.LARGE.id != null
                    ? category.LARGE
                    : NO_SETTING_CATEGORY;

                const updatedMedium: MediumCategory[] = [
                  ...(category.MEDIUM || []).map(
                    (mediumItem): MediumCategory => {
                      const updatedMediumValue =
                        mediumItem.MEDIUM && mediumItem.MEDIUM.id != null
                          ? mediumItem.MEDIUM
                          : NO_SETTING_CATEGORY;

                      const updatedSmall: SmallCategory[] = [
                        ...(mediumItem.SMALL || []).map(
                          (smallItem): SmallCategory =>
                            smallItem && smallItem.id != null
                              ? smallItem
                              : NO_SETTING_CATEGORY,
                        ),
                        NO_SETTING_CATEGORY,
                      ];

                      return {
                        MEDIUM: updatedMediumValue,
                        SMALL: updatedSmall,
                      };
                    },
                  ),
                  {
                    MEDIUM: NO_SETTING_CATEGORY,
                    SMALL: [NO_SETTING_CATEGORY],
                  },
                ];

                return {
                  ...category,
                  LARGE: updatedLarge,
                  MEDIUM: updatedMedium,
                };
              },
            );

            return {
              ...org,
              statisticCategories: updatedCategories,
            };
          });

        responseCustom = {
          ...responseCustom,
          organizationsOfAllTeamStatistic: updatedOrganizations,
        };
      }

      return {
        ...responseCustom,
      };
    },
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataCommon) => {
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
    creationDataCommonData,
    refetchCreationDataCommon,
    isFetchingCreationDataCommon,
  };
};

export default useCreationDataCommon;
