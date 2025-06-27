'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';
import { BasePagination } from '@interfaces/common';
import { TaskUserListChat } from '@interfaces/chat';

interface UseTaskUserChatHooksProps {
  page: number;
  roomCode: string;
  isShowList: boolean;
  search?: string;
  onSuccess?: (success: BasePagination<TaskUserListChat[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTaskUserChat = ({
  page,
  roomCode,
  search,
  isShowList,
  onSuccess,
  onError,
  onSettled,
}: UseTaskUserChatHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get task user chat
  const getTaskUserChat = async () => {
    const apiUrl = `${apiRouters.TASK_LIST_CHAT}?page_size=${PAGINATION_PAGE_SIZE_MEDIUM}&page=${page}${search && `&search=${search}`}${roomCode ? `&chat_room_code=${roomCode}` : ''}`;

    const { data } = await api.get<BasePagination<TaskUserListChat[]>>(apiUrl);
    return data;
  };

  // Handle API get task user chat
  const {
    data: taskUserChat,
    refetch: refetchTaskUserChat,
    isFetched: isFetchedTaskUserChat,
  } = useQuery({
    queryKey: ['getTaskUserChat', page, search, roomCode, isShowList],
    queryFn: getTaskUserChat,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<TaskUserListChat[]>) => {
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
    taskUserChat,
    refetchTaskUserChat,
    isFetchedTaskUserChat,
  };
};

export default useTaskUserChat;
