'use client';
import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { AxiosError } from 'axios';

import { apiRouters } from '@constants/routers';
import { DataListDailyType } from '@interfaces/statistic';
import api from '@base/api';
import { useContext } from 'react';
import { LoadingContext } from '@providers/LoadingProvider';
import { OptionDropdownType } from '@interfaces/common';

interface UseListDailyReportHooksProps {
  date: string;
  has_include_deleted_user?: string;
  organization_ids?: OptionDropdownType[];
  onSuccess?: (success: DataListDailyType[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useListDailyReport = ({
  date,
  organization_ids,
  has_include_deleted_user,
  onSuccess,
  onError,
  onSettled,
}: UseListDailyReportHooksProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get list daily report
  const getListDailyReport = async () => {
    setIsLoading(true);

    const params = new URLSearchParams();
    params.append('date', date);

    if (organization_ids?.length) {
      params.append(
        'organization_ids',
        organization_ids.map((item) => item.value).join(','),
      );
    }
    if (has_include_deleted_user) {
      params.append('has_include_deleted_user', has_include_deleted_user);
    }

    const apiUrl = `${apiRouters.STAT_DATA}?${params.toString()}`;

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
    enabled: !!token && organization_ids?.length !== 0,
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
