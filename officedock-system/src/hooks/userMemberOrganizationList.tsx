'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { UserOrganization } from '@interfaces/user';

interface UseMemberOrganizationListHooksProps {
  conditions?: boolean[];
  onSuccess?: (success: UserOrganization[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useMemberOrganizationList = ({
  conditions,
  onSuccess,
  onError,
  onSettled,
}: UseMemberOrganizationListHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get list member organization
  const getListMemberOrganization = async () => {
    setIsLoading(true);
    const apiUrl = apiRouters.MEMBER_ORGANIZATION_LIST;

    const { data } = await api.get<UserOrganization[]>(apiUrl);
    return data;
  };

  // Handle API get list member organization
  const {
    data: listMemberOrganization,
    refetch: refetchListMemberOrganization,
    isFetched: isFetchedListMemberOrganization,
  } = useQuery({
    queryKey: ['getListMemberOrganization'],
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
