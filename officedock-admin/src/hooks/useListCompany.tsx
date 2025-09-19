import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_SM } from '@constants';

import { LoadingContext } from '@providers/LoadingProvider';

import { BasePagination } from '@interfaces/common';
import { Company } from '@interfaces/company';

import api from '@base/api';

interface FilterProps {
  name: string;
  user_amount: string;
  status: string;
  plan: string;
  start_date: string;
  end_date: string;
  next_renewal_at: string;
  contract_created_at: string;
}

const useCompanyList = (
  page?: number,
  filter?: FilterProps,
) => {
  const { data: session } = useSession();
  // The token is used as a check against calling the API when it is not already qualified
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get company list
  const getCompanyList = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('page_size', String(PAGINATION_PAGE_SIZE_SM));
    filter?.name && params.append('name', filter?.name);
    filter?.user_amount && params.append('user_amount', filter?.user_amount);
    filter?.status && params.append('status', filter?.status);
    filter?.plan && params.append('plan', filter?.plan);
    filter?.start_date && params.append('start_date', filter?.start_date);
    filter?.end_date && params.append('end_date', filter?.end_date);
    filter?.next_renewal_at &&
      params.append('next_renewal_at', filter?.next_renewal_at);
    filter?.contract_created_at &&
      params.append('contract_created_at', filter?.contract_created_at);

    const apiUrl = `${apiRouters.COMPANY_LIST}?${params.toString()}`;

    const { data } = await api.get<BasePagination<Company[]>>(apiUrl);
    return data;
  };

  // Handle API get company list
  const {
    data: companyList,
    refetch: refetchCompanyList,
    isFetched: isFetchedCompanies,
  } = useQuery({
    queryKey: ['getCompanyList', [page, filter]],
    queryFn: getCompanyList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { companyList, refetchCompanyList, isFetchedCompanies };
};

export default useCompanyList;
