'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { User } from '@interfaces/user';

interface UseUserDetailHooksProps {
  userId?: string | number;
  current_screen?: string;
  onSuccess?: (success: User) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useUserDetail = ({
  userId,
  current_screen,
  onSuccess,
  onError,
  onSettled,
}: UseUserDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get User detail
  const getUserDetail = async () => {
    if (!userId) return;
    const apiUrl = `${apiRouters.USER_DETAIL(userId)}${current_screen ? `?current_screen=${current_screen}` : ''}`;

    const { data } = await api.get<User>(apiUrl);
    return data;
  };

  // Handle API get user detail
  const {
    data: userDetail,
    refetch: refetchUserDetail,
    isFetched: isFetchedUsersDetail,
  } = useQuery({
    queryKey: ['getUserDetail', userId, current_screen],
    queryFn: getUserDetail,
    retry: 0,
    enabled: !!token && !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: User) => {
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
    userDetail,
    refetchUserDetail,
    isFetchedUsersDetail,
  };
};

export default useUserDetail;
