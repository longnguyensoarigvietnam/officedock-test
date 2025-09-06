'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import {
  CategoryStructure,
  ChildCategory,
  NestedCategory,
} from '@interfaces/skills';
import { NO_SETTING_CATEGORY } from '@constants';
import { ScreenName } from '@constants/enums';

interface useCreationDataTaskHooksProps {
  organizationId?: number;
  condition?: boolean[];
  currentScreen?: string;
  onSuccess?: (success: CategoryStructure[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationStatisticCategories = ({
  organizationId,
  condition,
  currentScreen,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataTaskHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get organization statistic categories
  const getOrganizationStatisticCategories = async () => {
    const apiUrl = `${apiRouters.ACTION_STATISTIC_ORGANIZATION(
      `${organizationId}`,
    )}${currentScreen ? `?current_screen=${currentScreen}` : ''}`;

    const { data } = await api.get<CategoryStructure[]>(apiUrl);
    return data;
  };

  // Handle API get creation task data
  const {
    data: organizationStatisticCategories,
    refetch: refetchOrganizationStatisticCategories,
    isFetched: isFetchedOrganizationStatisticCategories,
    isFetching: isFetchingOrganizationStatisticCategories,
  } = useQuery({
    queryKey: ['getOrganizationStatisticCategories'],
    queryFn: getOrganizationStatisticCategories,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: (response: CategoryStructure[]): CategoryStructure[] => {
      if (currentScreen === ScreenName.SKILL_MAP) return response;
      return response.map((category): CategoryStructure => {
        const isLargeValid = category.LARGE && category.LARGE.id != null;

        const updatedLarge = isLargeValid
          ? category.LARGE
          : NO_SETTING_CATEGORY;

        const updatedMedium: NestedCategory[] = isLargeValid
          ? [
              {
                MEDIUM: NO_SETTING_CATEGORY,
                SMALL: [NO_SETTING_CATEGORY],
              },
              ...(category.MEDIUM || []).map((nested): NestedCategory => {
                const updatedMedium =
                  nested.MEDIUM && nested.MEDIUM.id != null
                    ? nested.MEDIUM
                    : NO_SETTING_CATEGORY;

                const updatedSmall: ChildCategory[] = [
                  NO_SETTING_CATEGORY,
                  ...(nested.SMALL || []).map(
                    (small): ChildCategory =>
                      small && small.id != null ? small : NO_SETTING_CATEGORY,
                  ),
                ];

                return {
                  MEDIUM: updatedMedium,
                  SMALL: updatedSmall,
                };
              }),
            ]
          : [
              {
                MEDIUM: NO_SETTING_CATEGORY,
                SMALL: [NO_SETTING_CATEGORY],
              },
            ];

        return {
          LARGE: updatedLarge,
          MEDIUM: updatedMedium,
        };
      });
    },

    onSuccess: (response: CategoryStructure[]) => {
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
    organizationStatisticCategories,
    isFetchedOrganizationStatisticCategories,
    isFetchingOrganizationStatisticCategories,
    refetchOrganizationStatisticCategories,
  };
};

export default useOrganizationStatisticCategories;
