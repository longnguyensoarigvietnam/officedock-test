'use client';

import { AxiosError } from 'axios';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SkillMapLevelUp } from '@interfaces/skills';

import api from '@base/api';

interface useSkillMapLevelUpProps {
  skillMapId: number;
  onSuccess?: (success: SkillMapLevelUp) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSkillMapLevelUp = ({
  skillMapId,
  onSuccess,
  onError,
  onSettled,
}: useSkillMapLevelUpProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get skill level up
  const getSkillMapLevelUp = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SKILL_MAPS_LEVEL_UP(String(skillMapId))}`;

    const { data } = await api.get<SkillMapLevelUp>(apiUrl);
    return data;
  };

  // Handle API get skill comment
  const {
    data: skillMapLevelUp,
    refetch: refetchSkillMapLevelUp,
    isFetched: isFetchedSkillMapLevelUp,
  } = useQuery({
    queryKey: ['getSkillMapLevelUp', [skillMapId]],
    queryFn: getSkillMapLevelUp,
    retry: 0,
    enabled: !!token && !!skillMapId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SkillMapLevelUp) => {
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
    skillMapLevelUp,
    refetchSkillMapLevelUp,
    isFetchedSkillMapLevelUp,
  };
};

export default useSkillMapLevelUp;
