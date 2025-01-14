'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

interface CreationDataCategory {
  type: string;
  category: string;
}

interface useCreationDataCategoryHooksProps {
  condition?: boolean[];
  onSuccess?: (success: CreationDataCategory[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataCategory = ({
  condition,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataCategoryHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation category data
  const getCreationDataCategory = async () => {
    const apiUrl = `${apiRouters.CATEGORY_FILTER_CREATION}`;

    const { data } = await api.get<CreationDataCategory[]>(apiUrl);
    return data;
  };

  // Handle API get creation category data
  const {
    data: creationDataCategoryData,
    refetch: refetchCreationDataCategory,
    isFetched: isFetchedCreationDataCategory,
  } = useQuery({
    queryKey: ['getCreationDataCategory'],
    queryFn: getCreationDataCategory,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataCategory[]) => {
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
    creationDataCategoryData,
    refetchCreationDataCategory,
    isFetchedCreationDataCategory,
  };
};

export default useCreationDataCategory;
