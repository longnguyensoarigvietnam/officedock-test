'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

interface CreationDataTag {
  id: number;
  name: string;
}

interface useCreationDataTagHooksProps {
  condition?: boolean[];
  onSuccess?: (success: CreationDataTag[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataTag = ({
  condition,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataTagHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get creation tag data
  const getCreationDataTag = async () => {
    const apiUrl = `${apiRouters.TAG_CREATION}`;

    const { data } = await api.get<CreationDataTag[]>(apiUrl);
    return data;
  };

  // Handle API get creation tag data
  const {
    data: creationDataTagData,
    refetch: refetchCreationDataTag,
    isFetched: isFetchedCreationDataTag,
  } = useQuery({
    queryKey: ['getCreationDataTag'],
    queryFn: getCreationDataTag,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataTag[]) => {
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
    creationDataTagData,
    refetchCreationDataTag,
    isFetchedCreationDataTag,
  };
};

export default useCreationDataTag;
