import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';

import { Company } from '@interfaces/company';

import api from '@base/api';

interface UseCompanyDetailHooksProps {
  companyId: string;
  onSuccess?: (success: Company) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCompanyDetail = ({
  companyId,
  onSuccess,
  onError,
  onSettled,
}: UseCompanyDetailHooksProps) => {
  const { data: session } = useSession();
  // The token is used as a check against calling the API when it is not already qualified
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get company detail
  const getCompanyDetail = async () => {
    setIsLoading(true);

    const { data } = await api.get<Company>(
      apiRouters.COMPANY_DETAIL(`${companyId}`),
    );
    return data;
  };

  // Handle API get company detail
  const {
    data: companyDetail,
    refetch: refetchCompanyDetail,
    isFetched: isFetchedCompanyDetail,
  } = useQuery('getCompanyDetail', getCompanyDetail, {
    enabled: !!token && !!companyId,
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Company) => {
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
    companyDetail,
    refetchCompanyDetail,
    isFetchedCompanyDetail,
  };
};

export default useCompanyDetail;
