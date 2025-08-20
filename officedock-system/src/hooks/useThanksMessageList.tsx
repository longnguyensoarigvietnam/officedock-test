'use client';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'react-query';

import { ResponseError } from '@interfaces/response';
import { ThanksMessageDetail } from '@interfaces/thanks-message';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode, ThanksMessageType } from '@constants/enums';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

interface FilterProps {
  isRead: boolean;
  isPagination: boolean;
  type: ThanksMessageType;
}

interface UseThanksMessageListHooksProps {
  filter?: FilterProps;
  conditions?: boolean[];
  onSuccess?: (success: ThanksMessageDetail[]) => void;
}

const useThanksMessageList = ({
  filter,
  conditions,
  onSuccess,
}: UseThanksMessageListHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get thanks message list
  const fetchThanksMessageList = async () => {
    const params = new URLSearchParams();
    params.append('is_read', String(filter?.isRead));
    params.append('is_pagination', String(filter?.isPagination));
    if (filter?.type) {
      params.append('type', String(filter?.type));
    }
    const apiUrl = `${apiRouters.THANKS_MESSAGES_LIST}?${params.toString()}`;
    const { data } = await api.get<ThanksMessageDetail[]>(apiUrl);

    return data; 
  };

  // Handle API get thanks message list
  const {
    data: thanksMessageList,
    refetch: refetchThanksMessageList,
    isFetched: isFetchedThanksMessageList,
  } = useQuery({
    queryKey: ['fetchThanksMessageList'],
    queryFn: fetchThanksMessageList,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: ThanksMessageDetail[]) => {
      onSuccess && onSuccess(response);
    },
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
  });
  return {
    thanksMessageList,
    refetchThanksMessageList,
    isFetchedThanksMessageList,
  };
};

export default useThanksMessageList;
