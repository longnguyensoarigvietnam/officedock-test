'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';
import { DataListDailyType } from '@interfaces/statistic';
import api from '@base/api';
import { useContext } from 'react';
import { LoadingContext } from '@providers/LoadingProvider';
import { OptionDropdownType } from '@interfaces/common';

interface UseListDailyReportHooksProps {
  date: string;
  organization_ids?: OptionDropdownType[];
  onSuccess?: (success: DataListDailyType[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useListDailyReport = ({
  date,
  organization_ids,
  onSuccess,
  onError,
  onSettled,
}: UseListDailyReportHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get list daily report
  const getListDailyReport = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.STAT_DATA}?date=${date}${organization_ids ? `&organization_ids=${organization_ids.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<DataListDailyType[]>(apiUrl);
    return data;
  };

  // Handle API get tag detail
  const {
    data: listDailyReport,
    refetch: refetchListDailyReport,
    isFetched: isFetchedListDailyReport,
  } = useQuery({
    queryKey: ['getListDailyReport', date, organization_ids],
    queryFn: getListDailyReport,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: DataListDailyType[]) => {
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
    listDailyReport,
    refetchListDailyReport,
    isFetchedListDailyReport,
  };
};

export default useListDailyReport;
