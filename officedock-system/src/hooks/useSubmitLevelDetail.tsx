'use client';

import { useContext } from 'react';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { SubmitLevel } from '@interfaces/skills';

interface useSubmitLevelDetailProps {
  submitLevelId: number | string;
  onSuccess?: (data: SubmitLevel) => void;
  onError?: (error: AxiosError) => void;
}

const useSubmitLevelDetail = ({
  submitLevelId,
  onSuccess,
  onError,
}: useSubmitLevelDetailProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get submit level detail
  const getSubmitLevelDetail = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.SUBMIT_LEVELS_DETAIL(`${submitLevelId}`)}`;

    const { data } = await api.get<SubmitLevel>(apiUrl);
    return data;
  };

  // Handle API get submit level detail
  const {
    data: submitLevelDetail,
    refetch: refetchSubmitLevelDetail,
    isFetched: isFetchedSubmitLevelDetail,
  } = useQuery({
    queryKey: ['getSubmitLevelDetail'],
    queryFn: getSubmitLevelDetail,
    retry: 0,
    enabled: !!token && !!submitLevelId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: SubmitLevel) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return {
    submitLevelDetail,
    refetchSubmitLevelDetail,
    isFetchedSubmitLevelDetail,
  };
};

export default useSubmitLevelDetail;
