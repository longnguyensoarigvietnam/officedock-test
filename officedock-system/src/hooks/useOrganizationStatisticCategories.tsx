'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { CategoryStructure } from '@interfaces/skills';

interface useCreationDataTaskHooksProps {
  organizationId?: number;
  condition?: boolean[];
  currentScreen?: string;
  onSuccess?: (success: CategoryStructure[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationStatisticCategories = ({
  organizationId,
  condition,
  currentScreen,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataTaskHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get organization statistic categories
  const getOrganizationStatisticCategories = async () => {
    const apiUrl = `${apiRouters.ACTION_STATISTIC_ORGANIZATION(
      `${organizationId}`,
    )}${currentScreen ? `?current_screen=${currentScreen}` : ''}`;

    const { data } = await api.get<CategoryStructure[]>(apiUrl);
    return data;
  };

  // Handle API get creation task data
  const {
    data: organizationStatisticCategories,
    refetch: refetchOrganizationStatisticCategories,
    isFetched: isFetchedOrganizationStatisticCategories,
  } = useQuery({
    queryKey: ['getOrganizationStatisticCategories'],
    queryFn: getOrganizationStatisticCategories,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CategoryStructure[]) => {
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
    organizationStatisticCategories,
    refetchOrganizationStatisticCategories,
    isFetchedOrganizationStatisticCategories,
  };
};

export default useOrganizationStatisticCategories;
