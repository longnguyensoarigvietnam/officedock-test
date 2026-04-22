'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { ResponseError } from '@interfaces/response';
import { RoleUser } from '@interfaces/user';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import api from '@base/api';
import { useSessionCache } from '@providers/SessionCacheProvider';

interface UseCreationRoleUserHooksProps {
  condition?: boolean[];
  onSuccess?: (success: RoleUser[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationRoleUser = ({
  condition,
  onSuccess,
  onSettled,
}: UseCreationRoleUserHooksProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get creation role data
  const getCreationRoleUser = async () => {
    const apiUrl = apiRouters.ROLE_CREATION;

    const { data } = await api.get<RoleUser[]>(apiUrl);
    return data;
  };

  // Handle API get creation role data
  const {
    data: creationRoleUserData,
    refetch: refetchCreationRoleUser,
    isFetched: isFetchedCreationRoleUser,
  } = useQuery({
    queryKey: ['getCreationRoleUser'],
    queryFn: getCreationRoleUser,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: RoleUser[]) => {
      onSuccess && onSuccess(response);
    },
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    creationRoleUserData,
    refetchCreationRoleUser,
    isFetchedCreationRoleUser,
  };
};

export default useCreationRoleUser;
