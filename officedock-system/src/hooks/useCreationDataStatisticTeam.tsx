'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { NO_SETTING_CATEGORY } from '@constants';
import { DataResponseStatisticCreationTeamType } from '@interfaces/statistic';

interface useCreationDataStatisticTeamHooksProps {
  condition?: boolean[];
  organization_id?: string;
  isTeam?: boolean;
  is_statistic?: boolean;
  onSuccess?: (success: DataResponseStatisticCreationTeamType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatisticTeam = ({
  condition,
  isTeam = false,
  organization_id,
  is_statistic,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataStatisticTeamHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get creation Statistic data
  const getCreationDataStatistic = async () => {
    const apiUrl = `${apiRouters.STATISTIC_CREATION}?${organization_id ? `organization_id=${organization_id}` : ''}${is_statistic ? `&is_statistic=true` : ''}`;

    const { data } =
      await api.get<DataResponseStatisticCreationTeamType>(apiUrl);
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
      [organization_id, is_statistic, isTeam],
    ],
    queryFn: getCreationDataStatistic,
    select: (response: DataResponseStatisticCreationTeamType) => {
      const updatedOrganizations = response.organizations.map((org) => {
        const updatedCategories = org.statisticCategories.map((category) => ({
          ...category,
          LARGE: category.LARGE ?? NO_SETTING_CATEGORY,
        }));

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
    enabled:
      !!token && condition?.every(Boolean) && (!isTeam || !!organization_id),
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
    creationDataStatisticData,
    refetchCreationDataStatistic,
    isFetchedCreationDataStatistic,
  };
};

export default useCreationDataStatisticTeam;
