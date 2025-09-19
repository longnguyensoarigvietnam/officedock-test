import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_SM } from '@constants';
import { CompanyTransactionType } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';

import { BasePagination } from '@interfaces/common';
import { CompanyTransaction } from '@interfaces/company';

import api from '@base/api';

interface FilterProps {
  id: number;
  type: CompanyTransactionType;
}

const useListCompanyTransactions = ({
  page,
  filter,
  onSuccess,
  onError,
  onSettled,
}: {
  page?: number;
  filter?: FilterProps;
  onSuccess?: (success: BasePagination<CompanyTransaction[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSession();
  // The token is used as a check against calling the API when it is not already qualified
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get transaction list
  const getCompanyTransactionList = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(PAGINATION_PAGE_SIZE_SM));
    filter?.type && params.append('type', filter?.type);

    const apiUrl = `${apiRouters.COMPANY_TRANSACTION(String(filter?.id))}?${params.toString()}`;

    const { data } =
      await api.get<BasePagination<CompanyTransaction[]>>(apiUrl);
    return data;
  };

  // Handle API get company transaction list
  const {
    data: companyTransactionList,
    refetch: refetchCompanyTransactionList,
    isFetched: isFetchedCompanyTransactions,
  } = useQuery({
    queryKey: ['getCompanyTransactionList', [page, filter]],
    queryFn: getCompanyTransactionList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<CompanyTransaction[]>) => {
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
    companyTransactionList,
    refetchCompanyTransactionList,
    isFetchedCompanyTransactions,
  };
};

export default useListCompanyTransactions;
