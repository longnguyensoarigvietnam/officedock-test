'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';

import { CommonCreationData } from '@interfaces/creation-data';

import api from '@base/api';

interface useCommonCreationDataHooksProps {
  condition?: boolean[];
  options?: {
    get_company_status?: boolean;
    get_plans?: boolean;
    get_industry?: boolean;
    get_system_main_purpose?: boolean;
    get_implementation_main_issues?: boolean;
  };
  onSuccess?: (success: CommonCreationData) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCommonCreationData = ({
  condition,
  options,
  onSuccess,
  onError,
  onSettled,
}: useCommonCreationDataHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get common creation data
  const getCommonCreationData = async () => {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (typeof value === 'boolean' && value) {
          params.append(key, 'true');
        } else if (typeof value === 'string' && value) {
          params.append(key, value);
        }
      });
    }

    const apiUrl = `${apiRouters.COMMON_CREATION_DATA}?${params.toString()}`;

    const { data } = await api.get<CommonCreationData>(apiUrl);
    return data;
  };

  // Handle API get common creation data
  const {
    data: commonCreationData,
    refetch: refetchCommonCreationData,
    isFetched: isFetchedCommonCreationData,
  } = useQuery({
    queryKey: ['getCommonCreationData'],
    queryFn: getCommonCreationData,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CommonCreationData) => {
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
    commonCreationData,
    refetchCommonCreationData,
    isFetchedCommonCreationData,
  };
};

export default useCommonCreationData;
