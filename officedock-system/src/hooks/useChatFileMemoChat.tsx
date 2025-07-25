'use client';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';
import { ServerStatusCode } from '@constants/enums';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { BasePagination } from '@interfaces/common';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { DataChatFileMemo } from '@interfaces/chat';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useChatFileMemoChat = ({
  roomCode,
  pagination,
  onSuccess,
}: {
  roomCode: string;
  pagination?: PaginationProps;
  onSuccess?: (success: BasePagination<DataChatFileMemo[]>) => void;
}) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get chat file list
  const getChatFileMemoChat = async () => {
    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.LIST_CHAT_FILE}?chat_room_code=${roomCode}&page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}`
      : `${apiRouters.LIST_CHAT_FILE}`;

    const { data } = await api.get<BasePagination<DataChatFileMemo[]>>(apiUrl);
    return data;
  };

  // Handle API get chat file list
  const {
    data: chatFileMemoChat,
    refetch: refetchChatFileMemoChat,
    isFetching: isFetchingFileMemoChat,
  } = useQuery({
    queryKey: ['getChatFileMemoChat', [pagination, roomCode]],
    queryFn: getChatFileMemoChat,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      onSuccess && onSuccess(data);
    },
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

  return { chatFileMemoChat, refetchChatFileMemoChat, isFetchingFileMemoChat };
};

export default useChatFileMemoChat;
