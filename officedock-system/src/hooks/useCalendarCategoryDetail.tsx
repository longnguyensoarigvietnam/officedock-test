'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { CalendarCategoryHierarchyDetail } from '@interfaces/hierarchy';

interface UseCalendarCategoryDetailProps {
  onSuccess?: (success: CalendarCategoryHierarchyDetail[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCalendarCategoryHierarchyDetail = ({
  onSuccess,
  onError,
  onSettled,
}: UseCalendarCategoryDetailProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get calendar category hierarchy detail
  const getCalendarCategoryHierarchyDetail = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.ORGANIZATION_CATEGORY_HIERARCHY_LIST}?is_only_calendar=true`;

    const { data } = await api.get<CalendarCategoryHierarchyDetail[]>(apiUrl);
    return data;
  };

  // Handle API get calendar category hierarchy detail
  const {
    data: calendarCategoryHierarchyDetail,
    refetch: refetchCalendarCategoryHierarchyDetail,
    isFetched: isFetchedCalendarCategoryHierarchyDetail,
  } = useQuery({
    queryKey: ['getCalendarCategoryHierarchyDetail'],
    queryFn: getCalendarCategoryHierarchyDetail,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CalendarCategoryHierarchyDetail[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
      setIsLoading(false);
    },
  });

  return {
    calendarCategoryHierarchyDetail,
    refetchCalendarCategoryHierarchyDetail,
    isFetchedCalendarCategoryHierarchyDetail,
  };
};

export default useCalendarCategoryHierarchyDetail;
