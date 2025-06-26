'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { TaskCalendarProps } from '@interfaces/calendar';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';

interface useTaskCalendarProps {
  userId: number;
  date?: {
    start: string;
    end: string;
  };
  condition?: boolean[];
}

const useTaskCalendar = ({ userId, date, condition }: useTaskCalendarProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get task calendar
  const getTaskCalendar = async ({ signal }: { signal?: AbortSignal }) => {
    const apiUrl = `${apiRouters.TASK_CALENDAR}?${userId ? `&user_id=${userId}` : ''}${date?.start ? `&start_date=${date.start}` : ''}${date?.end ? `&end_date=${date.end}` : ''}`;
    const { data } = await api.get<TaskCalendarProps[]>(apiUrl, { signal });
    return data;
  };

  // Handle API get task calendar
  const {
    data: taskCalendar,
    refetch: refetchTaskCalendar,
    isFetched: isFetchedTaskCalendar,
  } = useQuery({
    queryKey: ['getTaskCalendar'],
    queryFn: ({ signal }) => getTaskCalendar({ signal }),
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

  return { taskCalendar, refetchTaskCalendar, isFetchedTaskCalendar };
};

export default useTaskCalendar;
