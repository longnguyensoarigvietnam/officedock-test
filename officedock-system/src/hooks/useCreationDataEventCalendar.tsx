'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import { apiRouters } from '@constants/routers';
import { CreationDataEventCalendar } from '@interfaces/calendar';
import api from '@base/api';

interface useCreationDataEventCalendarHooksProps {
  condition?: boolean[];
  onSuccess?: (success: CreationDataEventCalendar) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationDataEventCalendar = ({
  condition,
  onSuccess,
  onError,
  onSettled,
}: useCreationDataEventCalendarHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation data event calendar
  const getCreationDataEventCalendar = async () => {
    const apiUrl = apiRouters.SCHEDULE_CREATION;

    const { data } = await api.get<CreationDataEventCalendar>(apiUrl);
    return data;
  };

  // Handle API get creation data event calendar
  const {
    data: creationDataEventCalendar,
    refetch: refetchCreationDataEventCalendar,
    isFetched: isFetchedCreationDataEventCalendar,
  } = useQuery({
    queryKey: ['getCreationDataEventCalendar'],
    queryFn: getCreationDataEventCalendar,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: CreationDataEventCalendar) => {
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
    creationDataEventCalendar,
    refetchCreationDataEventCalendar,
    isFetchedCreationDataEventCalendar,
  };
};

export default useCreationDataEventCalendar;
