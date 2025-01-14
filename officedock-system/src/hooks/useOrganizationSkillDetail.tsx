'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { OrganizationSkillDetail } from '@interfaces/skills';
import { LoadingContext } from '@providers/LoadingProvider';

interface UseOrganizationSkillDetailHooksProps {
  organizationId: string;
  current_screen?: string;
  conditions?: boolean[];
  onSuccess?: (success: OrganizationSkillDetail[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationSkillDetail = ({
  organizationId,
  current_screen,
  conditions,
  onSuccess,
  onError,
  onSettled,
}: UseOrganizationSkillDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill detail
  const getOrganizationSkillDetail = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_SKILL_DETAIL(organizationId)}${current_screen ? `?current_screen=${current_screen}` : ''}`;

    const { data } = await api.get<OrganizationSkillDetail[]>(apiUrl);
    return data;
  };

  // Handle API get organization skill detail
  const {
    data: organizationSkillDetail,
    refetch: refetchOrganizationSkillDetail,
    isFetched: isFetchedOrganizationSkillDetail,
  } = useQuery({
    queryKey: ['getOrganizationSkillDetail', organizationId],
    queryFn: getOrganizationSkillDetail,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: OrganizationSkillDetail[]) => {
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
    organizationSkillDetail,
    refetchOrganizationSkillDetail,
    isFetchedOrganizationSkillDetail,
  };
};

export default useOrganizationSkillDetail;
