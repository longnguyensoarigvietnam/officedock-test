'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

interface CreationDataStatisticCategory {
  id: number;
  name: string;
  uuid: string;
  team?: number | null;
}

interface useCreationDataTaskHooksProps {
  condition?: boolean[];
  onSuccess?: (success: CreationDataStatisticCategory[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataStatisticOrganization = ({
  condition,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataTaskHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get creation task data
  const getCreationDataTask = async () => {
    const apiUrl = apiRouters.STATISTIC_ORGANIZATION_CREATION;

    const { data } = await api.get<CreationDataStatisticCategory[]>(apiUrl);
    return data;
  };

  // Handle API get creation task data
  const {
    data: creationDataCategoryData,
    refetch: refetchCreationDataCategory,
    isFetched: isFetchedCreationDataCategory,
  } = useQuery({
    queryKey: ['getCreationDataCategory'],
    queryFn: getCreationDataTask,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataStatisticCategory[]) => {
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

export default useCreationDataStatisticOrganization;
