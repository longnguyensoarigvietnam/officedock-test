'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingContext } from '@providers/LoadingProvider';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { Tags } from '@interfaces/tag';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';

const useDashboardTagList = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get dashboard tag list
  const getDashboardTagList = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.DASHBOARD_TAG_LIST}`;

    const { data } = await api.get<Tags[]>(apiUrl);
    return data;
  };

  // Handle API get dashboard tag list
  const {
    data: dashboardTagList,
    refetch: refetchDashboardTagList,
    isFetched: isFetchedDashboardTags,
  } = useQuery({
    queryKey: ['getDashboardTagList'],
    queryFn: getDashboardTagList,
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

  return {
    dashboardTagList,
    refetchDashboardTagList,
    isFetchedDashboardTags,
  };
};

export default useDashboardTagList;
