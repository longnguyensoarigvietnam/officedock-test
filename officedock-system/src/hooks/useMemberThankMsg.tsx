'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { ThankListMemberMsgType } from '@interfaces/thank';

interface useMemberThankMsgHooksProps {
  search: string;
  organization_id?: string;
  onSuccess?: (success: ThankListMemberMsgType[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useMemberThankMsg = ({
  search,
  organization_id,
  onSuccess,
  onError,
  onSettled,
}: useMemberThankMsgHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get member thank
  const getMemberThankList = async () => {
    const apiUrl = `${apiRouters.LIST_MEMBER_THANKS_MSG}?search=${encodeURIComponent(search)}${organization_id ? `&organization_id=${organization_id}` : ''}`;

    const { data } = await api.get<ThankListMemberMsgType[]>(apiUrl);
    return data;
  };

  // Handle API get member
  const {
    data: memberThankMsgList,
    refetch: refetchMemberThankList,
    isFetched: isFetchedMemberThankList,
  } = useQuery({
    queryKey: ['getMemberThankMsgList', [search, organization_id]],
    queryFn: getMemberThankList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: ThankListMemberMsgType[]) => {
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
    memberThankMsgList,
    refetchMemberThankList,
    isFetchedMemberThankList,
  };
};

export default useMemberThankMsg;
