'use client';
import { signOut, useSession } from 'next-auth/react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';

import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { BasePagination } from '@interfaces/common';
import { ChatRoomItem } from '@interfaces/chat';
import { ResponseError } from '@interfaces/response';

import api from '@base/api';
interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useChatList = (pagination?: PaginationProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get Chat list
  const getChatList = async ({ signal }: { signal?: AbortSignal }) => {
    const apiUrl = pagination?.page
      ? `${apiRouters.CHAT_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}`
      : `${apiRouters.CHAT_LIST}`;

    const { data } = await api.get<BasePagination<ChatRoomItem[]>>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get Chat list
  const {
    data: chatList,
    refetch: refetchChatList,
    isFetched: isFetchedChat,
  } = useQuery({
    queryKey: ['getChatList', pagination],
    queryFn: ({ signal }) => getChatList({ signal }),
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

  return { chatList, refetchChatList, isFetchedChat };
};

export default useChatList;
