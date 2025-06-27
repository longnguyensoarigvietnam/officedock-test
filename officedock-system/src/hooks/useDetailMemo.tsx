'use client';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

import { MemoDetailData } from '@interfaces/user';
import { ResponseError } from '@interfaces/response';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import api from '@base/api';
import { useSessionCache } from '@providers/SessionCacheProvider';

interface UseMemoDetailHooksProps {
  conditions?: boolean[];
  onSuccess?: (success: MemoDetailData) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}
const useMemoDetail = ({
  onSuccess,
  onSettled,
  conditions,
}: UseMemoDetailHooksProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get Memo detail
  const getMemoDetail = async () => {
    const apiUrl = apiRouters.MEMO_DETAIL;

    const { data } = await api.get<MemoDetailData>(apiUrl);
    return data;
  };

  // Handle API get Memo detail
  const {
    data: memoDetail,
    refetch: refetchMemoDetail,
    isFetched: isFetchedMemoDetail,
  } = useQuery({
    queryKey: ['getMemoDetail'],
    queryFn: getMemoDetail,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: MemoDetailData) => {
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
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    memoDetail,
    refetchMemoDetail,
    isFetchedMemoDetail,
  };
};

export default useMemoDetail;
