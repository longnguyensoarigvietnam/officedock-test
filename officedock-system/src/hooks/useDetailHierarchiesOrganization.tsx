'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { ConfigNode } from '@interfaces/organization';

interface UseDetailHierarchiesOrganizationHooksProps {
  condition?: boolean[];
  has_children?: boolean;
  onSuccess?: (success: ConfigNode[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useDetailHierarchiesOrganization = ({
  has_children = true,
  onSuccess,
  onError,
  onSettled,
}: UseDetailHierarchiesOrganizationHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get detail hierarchies organization
  const getDetailHierarchiesOrganization = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_HIERARCHY}?has_children=${has_children}`;

    const { data } = await api.get<ConfigNode[]>(apiUrl);
    return data;
  };

  // Handle API get detail hierarchies organization
  const {
    data: detailHierarchiesOrganization,
    refetch: refetchDetailHierarchiesOrganization,
    isFetched: isFetchedDetailHierarchiesOrganization,
  } = useQuery({
    queryKey: ['getDetailHierarchiesOrganization', has_children],
    queryFn: getDetailHierarchiesOrganization,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: ConfigNode[]) => {
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
    detailHierarchiesOrganization,
    refetchDetailHierarchiesOrganization,
    isFetchedDetailHierarchiesOrganization,
  };
};

export default useDetailHierarchiesOrganization;
