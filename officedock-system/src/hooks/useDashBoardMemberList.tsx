'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Profile } from '@interfaces/user';
import { ResponseError } from '@interfaces/response';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import api from '@base/api';

const useDashboardMemberList = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get dashboard member list
  const getDashboardMemberList = async () => {
    const apiUrl = `${apiRouters.DASHBOARD_MEMBER_LIST}`;

    const { data } =
      await api.get<Omit<Profile, 'birthday' | 'gender'>[]>(apiUrl);
    return data;
  };

  // Handle API get dashboard member list
  const {
    data: dashboardMemberList,
    refetch: refetchDashboardMemberList,
    isFetched: isFetchedDashboardMembers,
  } = useQuery({
    queryKey: ['getDashboardMemberList'],
    queryFn: getDashboardMemberList,
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
    dashboardMemberList,
    refetchDashboardMemberList,
    isFetchedDashboardMembers,
  };
};

export default useDashboardMemberList;
