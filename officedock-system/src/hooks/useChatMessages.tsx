'use client';
import { signOut } from 'next-auth/react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';
import { ServerStatusCode } from '@constants/enums';
import { ChatMessageResponse } from '@interfaces/chat';
import { BasePagination } from '@interfaces/common';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { useSessionCache } from '@providers/SessionCacheProvider';

interface PaginationProps {
  page?: number;
  pageSize?: number;
  code: string;
}
interface dataId {
  messageId?: string | null;
}

const useChatMessages = (pagination: PaginationProps, dataItem: dataId) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const getChatMessages = async () => {
    if (pagination.code === 'null') {
      return;
    } else {
      const apiUrl = pagination?.page
        ? `${apiRouters.CHAT_MESSAGES(pagination.code)}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_MEDIUM}${dataItem.messageId ? `&message_id=${dataItem.messageId}` : ''}`
        : `${apiRouters.CHAT_MESSAGES(pagination.code)}`;

      const { data } =
        await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
      return data;
    }
  };

  const {
    data: chatMessages,
    refetch: refetchChatMessages,
    isFetched: isFetchedChatMessage,
  } = useQuery({
    queryKey: ['getChatMessages'],
    queryFn: getChatMessages,
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

  return {
    chatMessages,
    refetchChatMessages,
    isFetchedChatMessage,
  };
};

export default useChatMessages;
