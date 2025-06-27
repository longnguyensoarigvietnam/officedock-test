'use client';
import { signOut } from 'next-auth/react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { useSessionCache } from '@providers/SessionCacheProvider';

const useFrequentlyTasks = () => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get frequently tasks
  const getFrequentlyTasks = async () => {
    const apiUrl = `${apiRouters.FREQUENT_TASKS}`;
    const response = await api.get(apiUrl);
    return response;
  };

  // Handle API get frequently tasks
  const {
    data: frequentlyTasks,
    refetch: refetchFrequentlyTasks,
    isFetched: isFetchedFrequentlyTasks,
  } = useQuery({
    queryKey: ['getFrequentlyTasks'],
    queryFn: getFrequentlyTasks,
    retry: 0,
    enabled: !!token,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {},
  });

  return { frequentlyTasks, refetchFrequentlyTasks, isFetchedFrequentlyTasks };
};

export default useFrequentlyTasks;
