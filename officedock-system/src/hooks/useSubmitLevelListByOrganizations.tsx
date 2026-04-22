'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';

import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SubmitLevelByOrganization } from '@interfaces/skills';

import api from '@base/api';

const useSubmitLevelListByOrganizations = ({
  organizationId,
  currentScreen,
  onSuccess,
  onError,
  onSettled,
}: {
  organizationId?: number;
  currentScreen?: string;
  onSuccess?: (success: SubmitLevelByOrganization[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get level up confirmation list
  const getSubmitLevelList = async () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (organizationId) {
      params.append('organization_id', String(organizationId));
    }
    if (currentScreen) {
      params.append('current_screen', currentScreen);
    }

    const apiUrl = `${apiRouters.SUBMIT_LEVELS_LIST}?${params.toString()}`;

    const { data } = await api.get<SubmitLevelByOrganization[]>(apiUrl);
    return data;
  };

  // Handle API get level up confirmation list
  const {
    data: submitLevelList,
    refetch: refetchSubmitLevelList,
    isFetched: isFetchedSubmitLevels,
  } = useQuery({
    queryKey: ['getSubmitLevelList', []],
    queryFn: getSubmitLevelList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SubmitLevelByOrganization[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
      onSettled && onSettled();
    },
  });

  return { submitLevelList, refetchSubmitLevelList, isFetchedSubmitLevels };
};

export default useSubmitLevelListByOrganizations;
