'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';
import { Organizations } from '@interfaces/organization';
import api from '@base/api';
import { AxiosError } from 'axios';

interface useTeamListProps {
  condition?: boolean[];
  screenName?: string;
  onSuccess?: (success: Organizations[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTeamList = ({ onSuccess, onError, onSettled, screenName }: useTeamListProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;
  // Handle call API get User list
  const getTeamList = async () => {
    const apiUrl = apiRouters.TEAM_LIST;
    const { data } = await api.get<Organizations[]>(`${apiUrl}${screenName ? `?screen_name=${screenName}` : ''}`);
    return data;
  };

  // Handle API get User list
  const {
    data: teamList,
    refetch: refetchTeamList,
    isFetched: isFetchedTeams,
  } = useQuery({
    queryKey: ['getTeamList'],
    queryFn: getTeamList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Organizations[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return { teamList, refetchTeamList, isFetchedTeams };
};

export default useTeamList;
