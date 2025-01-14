'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { TagDetailData } from '@interfaces/tag';

interface UseTagDetailHooksProps {
  tagId: string;
  onSuccess?: (success: TagDetailData) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTagDetail = ({
  tagId,
  onSuccess,
  onError,
  onSettled,
}: UseTagDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get tag detail
  const getTagDetail = async () => {
    const apiUrl = apiRouters.TAG_DETAIL(tagId);

    const { data } = await api.get<TagDetailData>(apiUrl);
    return data;
  };

  // Handle API get tag detail
  const {
    data: tagDetail,
    refetch: refetchTagDetail,
    isFetched: isFetchedTagDetail,
  } = useQuery({
    queryKey: ['getTagDetail', tagId],
    queryFn: getTagDetail,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: TagDetailData) => {
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
    tagDetail,
    refetchTagDetail,
    isFetchedTagDetail,
  };
};

export default useTagDetail;
