'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { ChatFileDetailResponse } from '@interfaces/chat';

interface UseFileDetailHooksProps {
  fileUuid: string;
  condition?: boolean[];
  onSuccess?: (success: ChatFileDetailResponse) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useFileDetail = ({
  fileUuid,
  onSuccess,
  onError,
  onSettled,
}: UseFileDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  const getFileDetail = async () => {
    const apiUrl = apiRouters.FILE_DETAIL(`${fileUuid}`);

    const { data } = await api.get<ChatFileDetailResponse>(apiUrl);
    return data;
  };

  // Handle API get file detail
  const {
    data: fileDetail,
    refetch: refetchFileDetail,
    isFetching: isFetchingFileDetail,
  } = useQuery({
    queryKey: ['getFileDetail', fileUuid],
    queryFn: getFileDetail,
    retry: 0,
    enabled: !!token && !!fileUuid,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: ChatFileDetailResponse) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
      onSettled && onSettled();
    },
  });

  return {
    fileDetail,
    refetchFileDetail,
    isFetchingFileDetail,
  };
};

export default useFileDetail;
