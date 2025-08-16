'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { SurveyDetailType } from '@interfaces/survey';

interface UseSurveyDetailHooksProps {
  surveyId: string;
  condition?: boolean[];
  onSuccess?: (success: SurveyDetailType) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSurveyDetail = ({
  surveyId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseSurveyDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get Survey detail
  const getSurveyDetail = async () => {
    const apiUrl = apiRouters.SURVEY_DETAIL(surveyId);

    const { data } = await api.get<SurveyDetailType>(apiUrl);
    return data;
  };

  // Handle API get Survey detail
  const {
    data: surveyDetail,
    refetch: refetchSurveyDetail,
    isFetching: isFetchingSurveyDetail,
  } = useQuery({
    queryKey: ['getSurveyDetail', surveyId],
    queryFn: getSurveyDetail,
    retry: 0,
    enabled: Boolean(
      token && surveyId && (condition ? condition.every(Boolean) : true),
    ),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SurveyDetailType) => {
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
    surveyDetail,
    refetchSurveyDetail,
    isFetchingSurveyDetail,
  };
};

export default useSurveyDetail;
