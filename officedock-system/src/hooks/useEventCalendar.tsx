'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { EventCalendarProps } from '@interfaces/calendar';
import { ResponseError } from '@interfaces/response';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import api from '@base/api';

interface useEventCalendarProps {
  userId: string;
  date?: {
    start: string;
    end: string;
  };
  condition?: boolean[];
}

const useEventCalendar = ({
  userId,
  date,
  condition,
}: useEventCalendarProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get event calendar
  const getEventCalendar = async () => {
    const apiUrl = `${apiRouters.SCHEDULES}?${userId ? `&user_ids=${userId}` : ''}${date?.start ? `&start_date=${date.start}` : ''}${date?.end ? `&end_date=${date.end}` : ''}`;
    const { data } = await api.get<EventCalendarProps[]>(apiUrl);
    return data;
  };

  // Handle API get event calendar
  const {
    data: eventCalendar,
    refetch: refetchEventCalendar,
    isFetched: isFetchedEventCalendar,
  } = useQuery({
    queryKey: ['getEventCalendar'],
    queryFn: getEventCalendar,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
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
    onSettled: () => {},
  });

  return { eventCalendar, refetchEventCalendar, isFetchedEventCalendar };
};

export default useEventCalendar;
