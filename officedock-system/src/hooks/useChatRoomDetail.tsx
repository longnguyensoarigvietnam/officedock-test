'use client';
import { AxiosError } from 'axios';
import { useSession } from 'next-auth/react';
import { useQuery } from 'react-query';

import api from '@base/api';

import { apiRouters } from '@constants/routers';
import { ChatRoomDetail } from '@interfaces/chat';

interface UseChatRoomDetailHookProps {
  code: string;
  conditions?: boolean[];
  onSuccess?: (success: ChatRoomDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useChatRoomDetail = ({
  code,
  onSuccess,
  onError,
  onSettled,
  conditions,
}: UseChatRoomDetailHookProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const getChatRoomDetail = async (code: string) => {
    if (code !== 'null') {
      const { data: response } = await api.get(
        `${apiRouters.CHAT_DETAIL(code)}?is_read=true`,
      );
      return response;
    }
  };

  const {
    data: chatRoomDetail,
    refetch: refetchChatRoomDetail,
    isFetched: isFetchedChatRoomDetail,
  } = useQuery({
    queryKey: ['getChatRoomDetail', code],
    queryFn: () => getChatRoomDetail(code),
    retry: 0,
    enabled: !!token && !!code && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: ChatRoomDetail) => {
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
    chatRoomDetail,
    refetchChatRoomDetail,
    isFetchedChatRoomDetail,
  };
};

export default useChatRoomDetail;
