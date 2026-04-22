'use client';

import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SkillMapByOrganization } from '@interfaces/skills';

import api from '@base/api';

const useListSkillsInSkillMap = ({
  organizationId,
  onSuccess,
  onError,
  onSettled,
}: {
  organizationId?: string;
  onSuccess?: (success: SkillMapByOrganization[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill list
  const getListSkillsInSkillMap = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SKILL_MAPS_LIST_SKILLS}${organizationId ? `?organization_id=${organizationId}` : ''}`;

    const { data } = await api.get<SkillMapByOrganization[]>(apiUrl);
    return data;
  };

  // Handle API get organization skill list
  const {
    data: skillList,
    refetch: refetchSkillList,
    isFetched: isFetchedSkillList,
  } = useQuery({
    queryKey: ['getListSkillsInSkillMap', [organizationId]],
    queryFn: getListSkillsInSkillMap,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SkillMapByOrganization[]) => {
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

  return {
    skillList,
    refetchSkillList,
    isFetchedSkillList,
  };
};

export default useListSkillsInSkillMap;
