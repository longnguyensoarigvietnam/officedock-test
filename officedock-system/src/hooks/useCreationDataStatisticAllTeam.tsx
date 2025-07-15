'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';
import api from '@base/api';
import {
  DataResponseStatisticCreationTeamType,
  MediumCategory,
  SmallCategory,
} from '@interfaces/statistic';
import { NO_SETTING_CATEGORY } from '@constants';

interface useCreationDataStatisticAllTeamHooksProps {
  condition?: boolean[];
  userId?: string | null;
  isTeam?: boolean;
  onSuccess?: (success: DataResponseStatisticCreationTeamType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatisticAllTeam = ({
  condition,
  isTeam = false,
  userId,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataStatisticAllTeamHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get creation Statistic data
  const getCreationDataStatistic = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const apiUrl = `${apiRouters.ORGANIZATION_CREATION}?${userId ? `user_id=${userId}` : ''}&current_screen=${ScreenName.TEAM_DOCK}`;

    const { data } = await api.get<DataResponseStatisticCreationTeamType>(
      apiUrl,
      {
        signal,
      },
    );
    return data;
  };

  // Handle API get creation Statistic data
  const {
    data: creationDataStatisticDataAllTeam,
    refetch: refetchCreationDataStatistic,
    isFetched: isFetchedCreationDataStatistic,
  } = useQuery({
    queryKey: ['getCreationDataAllTeamStatistic', [userId]],
    queryFn: ({ signal }) => getCreationDataStatistic({ signal }),
    select: (response: DataResponseStatisticCreationTeamType) => {
      const updatedOrganizations = response.organizations.map((org) => {
        const updatedCategories = org.statisticCategories.map((category) => {
          const updatedLarge =
            category.LARGE && category.LARGE.id != null
              ? category.LARGE
              : NO_SETTING_CATEGORY;

          const updatedMedium: MediumCategory[] = [
            ...(category.MEDIUM || []).map((mediumItem): MediumCategory => {
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
            }),
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
        });

        return {
          ...org,
          statisticCategories: updatedCategories,
        };
      });

      return {
        ...response,
        organizations: updatedOrganizations,
      };
    },
    retry: 0,
    enabled: !!token && condition?.every(Boolean) && (!isTeam || !!userId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: DataResponseStatisticCreationTeamType) => {
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
    creationDataStatisticDataAllTeam,
    refetchCreationDataStatistic,
    isFetchedCreationDataStatistic,
  };
};

export default useCreationDataStatisticAllTeam;
