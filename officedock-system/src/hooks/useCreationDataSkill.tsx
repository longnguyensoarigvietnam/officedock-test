'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

interface CreationDataSkill {
  organization: {
    id: number;
    name: string;
  };
  skills: {
    id: number;
    name: string;
  }[];
}

interface useCreationDataSkillHooksProps {
  organizationId: string;
  condition?: boolean[];
  current_screen?: string;
  onSuccess?: (success: CreationDataSkill[]) => void;
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

    const { data } = await api.get<CreationDataSkill[]>(apiUrl);
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
    onSuccess: (response: CreationDataSkill[]) => {
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
