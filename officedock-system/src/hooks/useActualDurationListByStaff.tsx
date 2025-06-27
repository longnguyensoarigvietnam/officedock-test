'use client';

import { useQuery } from 'react-query';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_MEDIUM } from '@constants';

import { BasePagination } from '@interfaces/common';
import { TaskScheduleDetail } from '@interfaces/durations';

import api from '@base/api';
import { AxiosError } from 'axios';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useActualDurationListByStaff = ({
  pagination,
  selectedStaffId,
  condition,
  onSuccess,
  onError,
  onSettled,
}: {
  pagination?: PaginationProps;
  selectedStaffId: number;
  condition?: boolean[];
  onSuccess?: (success: BasePagination<TaskScheduleDetail[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get actual duration list by selected staff
  const getActualDurationsByStaff = async () => {
    if (!selectedStaffId) return;
    const apiUrl = `${apiRouters.TASKS_SCHEDULES_LIST}?page=${pagination?.page}&page_size=${pagination?.pageSize || PAGINATION_PAGE_SIZE_MEDIUM}&user_id=${selectedStaffId}`;
    const { data: response } =
      await api.get<BasePagination<TaskScheduleDetail[]>>(apiUrl);
    return response;
  };

  // Handle API get actual duration list by selected staff
  const {
    data: actualDurationListByStaff,
    refetch: refetchActualDurationListByStaff,
    isFetched: isFetchedActualDurationsByStaff,
    isFetching: isFetchingActualDurationsByStaff,
  } = useQuery({
    queryKey: ['getActualDurationsByStaff', [pagination, selectedStaffId]],
    queryFn: getActualDurationsByStaff,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<TaskScheduleDetail[]>) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    actualDurationListByStaff,
    refetchActualDurationListByStaff,
    isFetchedActualDurationsByStaff,
    isFetchingActualDurationsByStaff,
  };
};

export default useActualDurationListByStaff;
