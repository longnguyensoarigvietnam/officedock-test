'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { OrganizationCategoryHierarchyDetail } from '@interfaces/hierarchy';

import api from '@base/api';

interface UseOrganizationCategoryHierarchyListProps {
  conditions?: boolean[];
  currentScreen?: string;
  onSuccess?: (success: OrganizationCategoryHierarchyDetail[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationCategoryHierarchyList = ({
  conditions,
  currentScreen,
  onSuccess,
  onError,
  onSettled,
}: UseOrganizationCategoryHierarchyListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization category hierarchy list
  const getOrganizationCategoryHierarchyList = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_LIST}${currentScreen ? `?current_screen=${currentScreen}` : ''}`;

    const { data } =
      await api.get<OrganizationCategoryHierarchyDetail[]>(apiUrl);
    return data;
  };

  // Handle API get organization category hierarchy list
  const {
    data: organizationCategoryHierarchyList,
    refetch: refetchOrganizationCategoryHierarchyList,
    isFetched: isFetchedOrganizationCategoryHierarchyList,
  } = useQuery({
    queryKey: ['getOrganizationCategoryHierarchyList'],
    queryFn: getOrganizationCategoryHierarchyList,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: OrganizationCategoryHierarchyDetail[]) => {
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
    organizationCategoryHierarchyList,
    refetchOrganizationCategoryHierarchyList,
    isFetchedOrganizationCategoryHierarchyList,
  };
};

export default useOrganizationCategoryHierarchyList;
