'use client';

import { AxiosError } from 'axios';
import { useContext } from 'react';
import { useQuery } from 'react-query';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SkillMapComment } from '@interfaces/skills';

import api from '@base/api';

interface useSkillMapCommentProps {
  skillMapId: number;
  onSuccess?: (success: SkillMapComment[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSkillMapComment = ({
  skillMapId,
  onSuccess,
  onError,
  onSettled,
}: useSkillMapCommentProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get skill comment
  const getSkillMapComment = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SKILL_MAPS_COMMENT(String(skillMapId))}`;

    const { data } = await api.get<SkillMapComment[]>(apiUrl);
    return data;
  };

  // Handle API get skill comment
  const {
    data: skillMapComment,
    refetch: refetchSkillMapComment,
    isFetched: isFetchedSkillMapComment,
  } = useQuery({
    queryKey: ['getSkillMapComment', [skillMapId]],
    queryFn: getSkillMapComment,
    retry: 0,
    enabled: !!token && !!skillMapId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SkillMapComment[]) => {
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
    skillMapComment,
    refetchSkillMapComment,
    isFetchedSkillMapComment,
  };
};

export default useSkillMapComment;
