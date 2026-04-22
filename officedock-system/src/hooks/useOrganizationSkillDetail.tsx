'use client';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { OrganizationSkillMapDetail } from '@interfaces/skills';

import api from '@base/api';

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

  // Handle call API get organization skill detail
  const getOrganizationSkillMapDetail = async () => {
    if (!skillId) return;
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
    },
  });

  return {
    OrganizationSkillMapDetail,
    refetchOrganizationSkillMapDetail,
    isFetchedOrganizationSkillMapDetail,
  };
};

export default useOrganizationSkillMapDetail;
