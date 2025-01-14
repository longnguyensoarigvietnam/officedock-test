'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { Skill } from '@interfaces/skills';

interface UseSkillDetailHooksProps {
  skillId: string;
  condition?: boolean[];
  onSuccess?: (success: Skill) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSkillDetail = ({
  skillId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseSkillDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get Skill detail
  const getSkillDetail = async () => {
    const apiUrl = apiRouters.SKILL_DETAIL(skillId);

    const { data } = await api.get<Skill>(apiUrl);
    return data;
  };

  // Handle API get SKill detail
  const {
    data: skillDetail,
    refetch: refetchSkillDetail,
    isFetched: isFetchedSkillDetail,
  } = useQuery({
    queryKey: ['getSkillDetail', skillId],
    queryFn: getSkillDetail,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Skill) => {
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
    skillDetail,
    refetchSkillDetail,
    isFetchedSkillDetail,
  };
};

export default useSkillDetail;
