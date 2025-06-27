'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { Tags } from '@interfaces/tag';

interface UseTagDetailHooksProps {
  tagId: number;
  onSuccess?: (success: Tags) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useTagDetail = ({
  tagId,
  onSuccess,
  onError,
  onSettled,
}: UseTagDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get tag detail
  const getTagDetail = async () => {
    if (!tagId) return;
    const apiUrl = apiRouters.TAG_DETAIL(String(tagId));

    const { data } = await api.get<Tags>(apiUrl);
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
    onSuccess: (response: Tags) => {
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
