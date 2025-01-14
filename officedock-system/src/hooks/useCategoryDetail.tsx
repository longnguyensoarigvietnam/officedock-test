'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { Category } from '@interfaces/category';

interface UseCategoryDetailHooksProps {
  categoryId: string;
  condition?: boolean[];
  onSuccess?: (success: Category) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCategoryDetail = ({
  categoryId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseCategoryDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get Category detail
  const getCategoryDetail = async () => {
    const apiUrl = apiRouters.CATEGORY_DETAIL(categoryId);

    const { data } = await api.get<Category>(apiUrl);
    return data;
  };

  // Handle API get Category detail
  const {
    data: categoryDetail,
    refetch: refetchCategoryDetail,
    isFetched: isFetchedCategoryDetail,
  } = useQuery({
    queryKey: ['getCategoryDetail', categoryId],
    queryFn: getCategoryDetail,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Category) => {
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
    categoryDetail,
    refetchCategoryDetail,
    isFetchedCategoryDetail,
  };
};

export default useCategoryDetail;
