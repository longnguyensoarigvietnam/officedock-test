'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingContext } from '@providers/LoadingProvider';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { Task } from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';

const useTaskMeList = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get task me list
  const getTaskMeList = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.TASK_ME_LIST}`;

    const { data } = await api.get<Task[]>(apiUrl);
    return data;
  };

  // Handle API get task me list
  const {
    data: taskMeList,
    refetch: refetchTaskMeList,
    isFetched: isFetchedTaskMes,
  } = useQuery({
    queryKey: ['getTaskMeList'],
    queryFn: getTaskMeList,
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
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { taskMeList, refetchTaskMeList, isFetchedTaskMes };
};

export default useTaskMeList;
