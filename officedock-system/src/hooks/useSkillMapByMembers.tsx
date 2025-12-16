'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SkillMapByMembers } from '@interfaces/skills';

import api from '@base/api';

interface FilterProps {
  organizationId?: number | null;
  has_include_deleted_user?: string;
  has_include_deleted_skill?: string;
}

const useSkillMapByMembers = ({
  filter,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  onSuccess?: (data: SkillMapByMembers[]) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get skill map list by members
  const getSkillMapListByMembers = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();

    if (filter?.organizationId) {
      params.append('organization_id', String(filter.organizationId));
    }
    if (filter?.has_include_deleted_user) {
      params.append(
        'has_include_deleted_user',
        filter.has_include_deleted_user,
      );
    }
    if (filter?.has_include_deleted_skill) {
      params.append(
        'has_include_deleted_skill',
        filter.has_include_deleted_skill,
      );
    }

    const apiUrl = params.toString()
      ? `${apiRouters.MANAGE_SKILL_MAPS}?${params.toString()}`
      : apiRouters.MANAGE_SKILL_MAPS;

    const { data } = await api.get<SkillMapByMembers[]>(apiUrl);
    return data;
  };

  // Handle API get skill map list by members
  const {
    data: skillMapListByMembers,
    refetch: refetchSkillMapListByMembers,
    isFetched: isFetchedSkillMapsByMembers,
  } = useQuery({
    queryKey: ['getSkillMapListByMembers', [filter]],
    queryFn: getSkillMapListByMembers,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSuccess: (data: SkillMapByMembers[]) => {
      onSuccess && onSuccess(data);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    skillMapListByMembers,
    refetchSkillMapListByMembers,
    isFetchedSkillMapsByMembers,
  };
};

export default useSkillMapByMembers;
