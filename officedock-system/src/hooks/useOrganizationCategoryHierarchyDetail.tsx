'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { OrganizationCategoryHierarchyDetail } from '@interfaces/hierarchy';

interface UseOrganizationCategoryHierarchyDetailProps {
  organizationId: number;
  conditions?: boolean[];
  onSuccess?: (success: OrganizationCategoryHierarchyDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useOrganizationCategoryHierarchyDetail = ({
  organizationId,
  conditions,
  onSuccess,
  onError,
  onSettled,
}: UseOrganizationCategoryHierarchyDetailProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization category hierarchy detail
  const getOrganizationCategoryHierarchyDetail = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_DETAIL(organizationId)}`;

    const { data } = await api.get<OrganizationCategoryHierarchyDetail>(apiUrl);
    return data;
  };

  // Handle API get organization category hierarchy detail
  const {
    data: organizationCategoryHierarchyDetail,
    refetch: refetchOrganizationCategoryHierarchyDetail,
    isFetched: isFetchedOrganizationCategoryHierarchyDetail,
  } = useQuery({
    queryKey: ['getOrganizationCategoryHierarchyDetail', organizationId],
    queryFn: getOrganizationCategoryHierarchyDetail,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: OrganizationCategoryHierarchyDetail) => {
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
    organizationCategoryHierarchyDetail,
    refetchOrganizationCategoryHierarchyDetail,
    isFetchedOrganizationCategoryHierarchyDetail,
  };
};

export default useOrganizationCategoryHierarchyDetail;
