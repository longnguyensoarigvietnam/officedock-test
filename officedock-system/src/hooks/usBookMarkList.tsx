'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';
import { BasePagination } from '@interfaces/common';
import { ChatMessageResponse } from '@interfaces/chat';

interface UseBookMarkListHooksProps {
  page: number;
  onSuccess?: (success: BasePagination<ChatMessageResponse[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useBookMarkList = ({
  page,
  onSuccess,
  onError,
  onSettled,
}: UseBookMarkListHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get Bookmark
  const getBookMarkList = async () => {
    const apiUrl = `${apiRouters.BOOKMARK_LIST}?is_bookmark=true&page_size=${PAGINATION_PAGE_SIZE_MEDIUM}&page=${page}`;

    const { data } =
      await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    return data;
  };

  // Handle API get tag detail
  const {
    data: bookMarkList,
    refetch: refetchBookMarkList,
    isFetched: isFetchedBookMarkList,
  } = useQuery({
    queryKey: ['getBookMarkList', page],
    queryFn: getBookMarkList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<ChatMessageResponse[]>) => {
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
    bookMarkList,
    refetchBookMarkList,
    isFetchedBookMarkList,
  };
};

export default useBookMarkList;
