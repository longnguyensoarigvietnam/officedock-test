'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import api from '@base/api';

interface UseUnansweredSurveyDataType {
  count: number;
  isOpenSurveys: boolean;
}

interface UseUnansweredSurveyHooksProps {
  onSuccess?: (success: UseUnansweredSurveyDataType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}
const useUnansweredSurveyCount = ({
  onError,
  onSuccess,
  onSettled,
}: UseUnansweredSurveyHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get unanswered survey count
  const getUnansweredSurveyCount = async () => {
    setIsLoading(true);

    const { data } = await api.get<UseUnansweredSurveyDataType>(
      apiRouters.UNANSWERED_COUNT,
    );
    return data;
  };

  // Handle API get unanswered survey count
  const {
    data: unansweredSurveyCount,
    refetch: refetchUnansweredSurveyCount,
    isFetched: isFetchedUnansweredSurveyCount,
  } = useQuery({
    queryKey: ['getUnansweredSurveyCount'],
    queryFn: getUnansweredSurveyCount,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: UseUnansweredSurveyDataType) => {
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
    unansweredSurveyCount,
    refetchUnansweredSurveyCount,
    isFetchedUnansweredSurveyCount,
  };
};

export default useUnansweredSurveyCount;
