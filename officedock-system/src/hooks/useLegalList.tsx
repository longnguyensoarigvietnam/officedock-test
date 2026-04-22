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

interface UseLegalHooksProps {
  conditions?: boolean[];
  onSuccess?: (data: TermsStep[]) => void;
}

const useLegalList = ({ onSuccess, conditions }: UseLegalHooksProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();

  // Handle call API get legal list
  const getLegalList = async () => {
    const apiUrl = `${apiRouters.RETRIEVE_TERM}`;

    const { data } = await api.get<TermsStep[]>(apiUrl);
    return data;
  };

  // Handle API get legal list
  const {
    data: legalList,
    refetch: refetchLegalList,
    isFetched: isFetchedLegalList,
  } = useQuery({
    queryKey: ['getLegalList'],
    queryFn: getLegalList,
    retry: 0,
    enabled: conditions?.every(Boolean),
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
    legalList,
    refetchLegalList,
    isFetchedLegalList,
  };
};

export default useLegalList;
