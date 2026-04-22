'use client';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

import { BasePagination } from '@interfaces/common';
import { ResponseError } from '@interfaces/response';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import api from '@base/api';
import { PaymentMethod } from '@interfaces/payment';
import { useQuery } from '@tanstack/react-query';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useGetListPaymentCard = (pagination?: PaginationProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get payment list
  const getPaymentMethodList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.PAYMENT_METHOD}?page=${pagination.page}&page_size=${pagination.pageSize || 100}`
      : `${apiRouters.PAYMENT_METHOD}?page_size=100`;

    const { data } = await api.get<BasePagination<PaymentMethod[]>>(apiUrl);
    return data;
  };

  // Handle API get Payment list
  const {
    data: paymentList,
    refetch: refetchPaymentList,
    isFetched: isFetchedPayments,
  } = useQuery({
    queryKey: ['getPaymentMethodList', [pagination]],
    queryFn: getPaymentMethodList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { paymentList, refetchPaymentList, isFetchedPayments };
};

export default useGetListPaymentCard;
