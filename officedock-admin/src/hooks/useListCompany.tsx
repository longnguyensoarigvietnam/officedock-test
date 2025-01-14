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
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

const useCompanyList = (
  page?: number,
  orderRing?: string,
  filter?: FilterProps,
) => {
  const { data: session } = useSession();
  // The token is used as a check against calling the API when it is not already qualified
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get company list
  const getCompanyList = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.COMPANY_LIST}?page=${page}&page_size=${PAGINATION_PAGE_SIZE_SM}&ordering=${orderRing}${filter?.name ? `&name=${filter.name}` : ''}${filter?.status ? `&status=${filter.status}` : ''}${filter?.start_date ? `&start_date=${filter.start_date}` : ''}${filter?.end_date ? `&end_date=${filter.end_date}` : ''}`;

    const { data } = await api.get<BasePagination<Company[]>>(apiUrl);
    return data;
  };

  // Handle API get company list
  const {
    data: companyList,
    refetch: refetchCompanyList,
    isFetched: isFetchedCompanies,
  } = useQuery({
    queryKey: ['getCompanyList', [page, orderRing, filter]],
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
