'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { LoadingContext } from '@providers/LoadingProvider';
import { apiRouters } from '@constants/routers';
import { RoleDetail } from '@interfaces/role';

import api from '@base/api';

interface UseRoleDetailHooksProps {
  roleId: number;
  onSuccess?: (success: RoleDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}
const useRoleDetail = ({
  roleId,
  onError,
  onSuccess,
  onSettled,
}: UseRoleDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get role detail
  const getRoleDetail = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.ROLE_DETAIL(roleId)}`;

    const { data } = await api.get<RoleDetail>(apiUrl);
    return data;
  };

  // Handle API get role detail
  const {
    data: roleDetail,
    refetch: refetchRoleDetail,
    isFetched: isFetchedRoleDetail,
  } = useQuery({
    queryKey: ['getRoleDetail'],
    queryFn: getRoleDetail,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: RoleDetail) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { roleDetail, refetchRoleDetail, isFetchedRoleDetail };
};

export default useRoleDetail;
