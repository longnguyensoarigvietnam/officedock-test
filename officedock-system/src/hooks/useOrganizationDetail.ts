'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { Organizations } from '@interfaces/organization';
import { LoadingContext } from '@providers/LoadingProvider';

interface UseOrganizationDetailHooksProps {
  organizationId: string;
  current_screen?: string;
  conditions?: boolean[];
  onSuccess?: (success: Organizations) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationDetail = ({
  organizationId,
  current_screen,
  conditions,
  onSuccess,
  onError,
  onSettled,
}: UseOrganizationDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization detail
  const getOrganizationDetail = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_DETAIL(organizationId)}${current_screen ? `?current_screen=${current_screen}` : ''} `;

    const { data } = await api.get<Organizations>(apiUrl);
    return data;
  };

  // Handle API get organization detail
  const {
    data: organizationDetail,
    refetch: refetchOrganizationDetail,
    isFetched: isFetchedOrganizationsDetail,
  } = useQuery({
    queryKey: ['getOrganizationDetail', organizationId],
    queryFn: getOrganizationDetail,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Organizations) => {
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
    organizationDetail,
    refetchOrganizationDetail,
    isFetchedOrganizationsDetail,
  };
};

export default useOrganizationDetail;
