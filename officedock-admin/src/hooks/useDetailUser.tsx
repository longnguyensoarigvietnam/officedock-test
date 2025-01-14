import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { User } from '@interfaces/user';

interface useDetailUserHooksProps {
  userId: string;
  condition?: boolean[];
  onSuccess?: (success: User) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useDetailUser = ({
  userId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: useDetailUserHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get user detail
  const getUserDetail = async () => {
    setIsLoading(true);
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
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: User) => {
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
    userDetail,
    refetchUserDetail,
    isFetchedUsersDetail,
  };
};

export default useDetailUser;
