'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { User } from '@interfaces/user';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';

const useAuthenticatedUser = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;
  const getAuthenticatedUser = async () => {
    const apiUrl = apiRouters.AUTHENTICATED_USER;

    const { data } = await api.get<User>(apiUrl);
    return data;
  };

  // Handle API get authenticated user
  const {
    data: authenticatedUser,
    refetch: refetchAuthenticatedUser,
    isFetched: isFetchedAuthenticatedUser,
  } = useQuery({
    queryKey: ['getAuthenticatedUser'],
    queryFn: getAuthenticatedUser,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
  });

  return {
    authenticatedUser,
    refetchAuthenticatedUser,
    isFetchedAuthenticatedUser,
  };
};

export default useAuthenticatedUser;
