'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { OrganizationSkillMapDetail } from '@interfaces/skills';
import { LoadingContext } from '@providers/LoadingProvider';

interface UseOrganizationSkillMapDetailHooksProps {
  skillId: number;
  onSuccess?: (success: OrganizationSkillMapDetail[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationSkillMapDetail = ({
  skillId,
  onSuccess,
  onError,
  onSettled,
}: UseOrganizationSkillMapDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill detail
  const getOrganizationSkillMapDetail = async () => {
    if (!skillId) return;
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_SKILL_DETAIL(skillId)}`;

    const { data } = await api.get<OrganizationSkillMapDetail[]>(apiUrl);
    return data;
  };

  // Handle API get organization skill detail
  const {
    data: OrganizationSkillMapDetail,
    refetch: refetchOrganizationSkillMapDetail,
    isFetched: isFetchedOrganizationSkillMapDetail,
  } = useQuery({
    queryKey: ['getOrganizationSkillMapDetail', skillId],
    queryFn: getOrganizationSkillMapDetail,
    retry: 0,
    enabled: !!token && !!skillId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: OrganizationSkillMapDetail[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
      setIsLoading(false);
    },
  });

  return {
    OrganizationSkillMapDetail,
    refetchOrganizationSkillMapDetail,
    isFetchedOrganizationSkillMapDetail,
  };
};

export default useOrganizationSkillMapDetail;
