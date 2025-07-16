'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { UserOrganization } from '@interfaces/user';

interface UseMemberOrganizationListHooksProps {
  conditions?: boolean[];
  search?: string;
  currentScreen?: string;
  onSuccess?: (success: UserOrganization[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useMemberOrganizationList = ({
  conditions,
  search,
  currentScreen,
  onSuccess,
  onError,
  onSettled,
}: UseMemberOrganizationListHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get list member organization
  const getListMemberOrganization = async () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (search) {
      params.append('search', search);
    }
    if (currentScreen) {
      params.append('current_screen', currentScreen);
    }

    const apiUrl = `${apiRouters.MEMBER_ORGANIZATION_LIST}?${params.toString()}`;

    const { data } = await api.get<UserOrganization[]>(apiUrl);
    return data;
  };

  // Handle API get list member organization
  const {
    data: listMemberOrganization,
    refetch: refetchListMemberOrganization,
    isFetched: isFetchedListMemberOrganization,
  } = useQuery({
    queryKey: ['getListMemberOrganization', search],
    queryFn: getListMemberOrganization,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: UserOrganization[]) => {
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
    listMemberOrganization,
    refetchListMemberOrganization,
    isFetchedListMemberOrganization,
  };
};

export default useMemberOrganizationList;
