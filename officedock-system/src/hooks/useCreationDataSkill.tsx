'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';
import { CreationDataSkill, Skill } from '@interfaces/skills';
import api from '@base/api';



interface useCreationDataSkillHooksProps {
  organizationId: string;
  condition?: boolean[];
  current_screen?: string;
  onSuccess?: (success: CreationDataSkill[] | Skill[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataSkill = ({
  organizationId,
  condition,
  current_screen,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataSkillHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation task data
  const getCreationDataSkill = async () => {
    const apiUrl = `${apiRouters.SKILL_CREATION}?organization_id=${organizationId}${current_screen ? `&current_screen=${current_screen}` : ''}`;

    const { data } = await api.get<CreationDataSkill[] | Skill[]>(apiUrl);
    return data;
  };

  // Handle API get creation skill data
  const {
    data: creationDataSkillData,
    refetch: refetchCreationDataSkill,
    isFetched: isFetchedCreationDataSkill,
  } = useQuery({
    queryKey: ['getCreationDataSkill', [organizationId]],
    queryFn: getCreationDataSkill,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataSkill[] | Skill[]) => {
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
    creationDataSkillData,
    refetchCreationDataSkill,
    isFetchedCreationDataSkill,
  };
};

export default useCreationDataSkill;
