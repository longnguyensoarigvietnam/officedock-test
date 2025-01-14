import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { Term } from '@interfaces/term';

interface useDetailTermHooksProps {
  termId: string;
  condition?: boolean[];
  onSuccess?: (success: Term) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useDetailTerm = ({
  termId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: useDetailTermHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get term detail
  const getTermDetail = async () => {
    setIsLoading(true);
    const apiUrl = apiRouters.TERM_DETAIL(termId);

    const { data } = await api.get<Term>(apiUrl);
    return data;
  };

  // Handle API get term detail
  const {
    data: termDetail,
    refetch: refetchTermDetail,
    isFetched: isFetchedTermsDetail,
  } = useQuery({
    queryKey: ['getTermDetail', termId],
    queryFn: getTermDetail,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Term) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
      onSettled && onSettled();
    },
  });

  return {
    termDetail,
    refetchTermDetail,
    isFetchedTermsDetail,
  };
};

export default useDetailTerm;
