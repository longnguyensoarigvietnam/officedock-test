'use client';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { ResponseError } from '@interfaces/response';
import { TermsStep } from '@interfaces/user';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

interface UseTermHooksProps {
  conditions?: boolean[];
  onSuccess?: (success: TermsStep[]) => void;
}

const useTermList = ({ onSuccess, conditions }: UseTermHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get term list
  const getTermList = async () => {
    const apiUrl = apiRouters.TERM_LIST;

    const { data } = await api.get<TermsStep[]>(apiUrl);
    return data;
  };

  // Handle API get term list
  const {
    data: termList,
    refetch: refetchTermList,
    isFetched: isFetchedTermList,
  } = useQuery({
    queryKey: ['getTermList'],
    queryFn: getTermList,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: TermsStep[]) => {
      onSuccess && onSuccess(response);
    },
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
  });

  return {
    termList,
    refetchTermList,
    isFetchedTermList,
  };
};

export default useTermList;
