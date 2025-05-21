'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { OrganizationSkillMapDetail } from '@interfaces/skills';
import { LoadingContext } from '@providers/LoadingProvider';
import { apiRouters } from '@constants/routers';
import api from '@base/api';

interface UseOrganizationSkillMapDetailHooksProps {
  skillId: number;
  onSuccess?: (success: OrganizationSkillMapDetail[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSkillMapUserDetail = ({
  skillId,
  onSuccess,
  onError,
  onSettled,
}: UseOrganizationSkillMapDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill detail
  const getOrganizationSkillMapDetail = async () => {
    if (!skillId) return;
    setIsLoading(true);
    const apiUrl = `${apiRouters.SKILL_MAPS_DETAIL_SKILL}?skill_id=${skillId}`;

    const { data } = await api.get<OrganizationSkillMapDetail[]>(apiUrl);
    return data;
  };

  // Handle API get organization skill detail
  const {
    data: skillMapUserDetail,
    refetch: refetchSkillMapUserDetail,
    isFetched: isFetchedSkillMapUserDetail,
  } = useQuery({
    queryKey: ['getSkillMapUserDetail', skillId],
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
    skillMapUserDetail,
    refetchSkillMapUserDetail,
    isFetchedSkillMapUserDetail,
  };
};

export default useSkillMapUserDetail;
