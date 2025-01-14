'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { User } from '@interfaces/user';

interface UseUserDetailHooksProps {
  userId: string;
  onSuccess?: (success: User) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useUserDetail = ({
  userId,
  onSuccess,
  onError,
  onSettled,
}: UseUserDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get User detail
  const getUserDetail = async () => {
    const apiUrl = apiRouters.USER_DETAIL(userId);

    const { data } = await api.get<User>(apiUrl);
    return data;
  };

  // Handle API get user detail
  const {
    data: userDetail,
    refetch: refetchUserDetail,
    isFetched: isFetchedUsersDetail,
  } = useQuery({
    queryKey: ['getUserDetail', userId],
    queryFn: getUserDetail,
    retry: 0,
    enabled: !!token,
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
