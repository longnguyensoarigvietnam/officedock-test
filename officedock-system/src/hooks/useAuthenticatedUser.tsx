'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { User } from '@interfaces/user';
import api from '@base/api';
import { AxiosError } from 'axios';

const useAuthenticatedUser = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: User) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
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
    onSuccess: (data: User) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
  });

  return {
    authenticatedUser,
    refetchAuthenticatedUser,
    isFetchedAuthenticatedUser,
  };
};

export default useAuthenticatedUser;
