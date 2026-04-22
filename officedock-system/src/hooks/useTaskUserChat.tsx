'use client';
import { AxiosError } from 'axios';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';
import { BasePagination } from '@interfaces/common';
import { TaskUserListChat } from '@interfaces/chat';

interface UseTaskUserChatHooksProps {
  roomCode: string;
  search?: string;
  onSuccess?: (success: BasePagination<TaskUserListChat[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTaskUserChat = ({
  roomCode,
  search,
  onSuccess,
  onError,
  onSettled,
}: UseTaskUserChatHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const getTaskUserChatList = async ({
    pageParam,
    signal,
  }: {
    pageParam?: number | string;
    signal?: AbortSignal;
  }) => {
    let apiUrl: string;

    if (typeof pageParam === 'string') {
      apiUrl = pageParam;
    } else {
      const params = new URLSearchParams({
        page: String(pageParam ?? 1),
        page_size: String(PAGINATION_PAGE_SIZE_MEDIUM),
        ...(search ? { search: encodeURIComponent(search) } : {}),
        ...(roomCode ? { chat_room_code: roomCode } : {}),
      });

      apiUrl = `${apiRouters.TASK_LIST_CHAT}?${params.toString()}`;
    }

    const { data } = await api.get<BasePagination<TaskUserListChat[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['getTaskUserChat', roomCode, search],
    queryFn: ({ pageParam, signal }) =>
      getTaskUserChatList({ pageParam, signal }),
    enabled: !!token,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next
        ? `${apiRouters.TASK_LIST_CHAT}${lastPage.next}`
        : undefined;
    },
    onSuccess: (allPages) => {
      const lastPage = allPages.pages[allPages.pages.length - 1];
      if (lastPage) onSuccess?.(lastPage);
    },
    onError: (error: AxiosError) => {
      onError?.(error);
    },
    onSettled: () => {
      onSettled?.();
    },
  });

  return {
    taskUserChatList: data?.pages?.flatMap((p) => p?.results ?? []) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useTaskUserChat;
