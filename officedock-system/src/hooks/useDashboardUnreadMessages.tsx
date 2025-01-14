'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';

const useDashboardUnreadMessages = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get dashboard unread messages
  const getDashboardUnreadMessages = async () => {
    const apiUrl = `${apiRouters.DASHBOARD_UNREAD_MESSAGES}`;

    const { data } = await api.get<{ total: number }>(apiUrl);
    return data;
  };

  // Handle API get dashboard unread messages
  const {
    data: dashboardUnreadMessages,
    refetch: refetchDashboardUnreadMessages,
    isFetched: isFetchedDashboardUnreadMessages,
  } = useQuery({
    queryKey: ['getDashboardUnreadMessages'],
    queryFn: getDashboardUnreadMessages,
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
    onSettled: () => {},
  });

  return {
    dashboardUnreadMessages,
    refetchDashboardUnreadMessages,
    isFetchedDashboardUnreadMessages,
  };
};

export default useDashboardUnreadMessages;
