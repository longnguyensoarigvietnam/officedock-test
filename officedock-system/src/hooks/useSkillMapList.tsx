'use client';

import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import { SkillMapInfo } from '@interfaces/skills';

import api from '@base/api';

const useSkillMapInfo = ({
  organizationId,
  userId,
  onSuccess,
  onError,
  onSettled,
}: {
  organizationId?: number;
  userId?: number;
  onSuccess?: (success: SkillMapInfo) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill list
  const getSkillMapInfo = async () => {
    setIsLoading(true);
    const queryParams = [];

    if (organizationId) {
      queryParams.push(`organization_id=${organizationId}`);
    }
    if (userId) {
      queryParams.push(`user_id=${userId}`);
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SKILL_MAPS_LIST}${queryString}`;

    const { data } = await api.get<SkillMapInfo>(apiUrl);
    return data;
  };

  // Handle API get organization skill list
  const {
    data: skillMapInfo,
    refetch: refetchSkillMapInfo,
    isFetched: isFetchedSkillMapInfo,
  } = useQuery({
    queryKey: ['getSkillMapInfo', [organizationId, userId]],
    queryFn: getSkillMapInfo,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SkillMapInfo) => {
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
    skillMapInfo,
    refetchSkillMapInfo,
    isFetchedSkillMapInfo,
  };
};

export default useSkillMapInfo;
