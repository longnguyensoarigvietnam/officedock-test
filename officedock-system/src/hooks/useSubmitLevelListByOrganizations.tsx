'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SubmitLevelByOrganization } from '@interfaces/skills';

import api from '@base/api';

const useSubmitLevelListByOrganizations = ({
  organizationId,
  onSuccess,
  onError,
  onSettled,
}: {
  organizationId?: number;
  onSuccess?: (success: SubmitLevelByOrganization[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get level up confirmation list
  const getSubmitLevelList = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.SUBMIT_LEVELS_LIST}?${organizationId ? `&organization_id=${organizationId}` : ''}`;

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
