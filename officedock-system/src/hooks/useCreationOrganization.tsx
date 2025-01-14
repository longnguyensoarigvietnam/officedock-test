'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { Organizations } from '@interfaces/organization';

interface UseCreationOrganizationHooksProps {
  current_screen?: string;
  condition?: boolean[];
  onSuccess?: (success: Omit<Organizations, 'userCount'>[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationOrganization = ({
  current_screen,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseCreationOrganizationHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation organization data
  const getCreationOrganization = async () => {
    const apiUrl = `${apiRouters.ORGANIZATION_CREATION}${current_screen ? `?current_screen=${current_screen}` : ''}   `;

    const { data } = await api.get<Omit<Organizations, 'userCount'>[]>(apiUrl);
    return data;
  };

  // Handle API get creation organization
  const {
    data: creationOrganization,
    refetch: refetchCreationOrganization,
    isFetched: isFetchedCreationOrganization,
  } = useQuery({
    queryKey: ['getCreationOrganization'],
    queryFn: getCreationOrganization,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Omit<Organizations, 'userCount'>[]) => {
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
    creationOrganization,
    refetchCreationOrganization,
    isFetchedCreationOrganization,
  };
};

export default useCreationOrganization;
