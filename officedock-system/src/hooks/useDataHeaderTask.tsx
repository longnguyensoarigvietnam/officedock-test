'use client';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';
import { ResponseError } from '@interfaces/response';
import api from '@base/api';

interface dataListTaskHeaderResponse {
  id: number;
  title: string;
  type: string;
  totalDuration: string;
}
interface propsDataType {
  start_date: string;
  end_date: string;
}

const useDataHeaderTaskList = (dataProps: propsDataType) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get task me list
  const getTaskHeaderList = async () => {
    const apiUrl = `${apiRouters.DASHBOARD_HEADER_TASK_LIST}?start_date=${dataProps.start_date}&end_date=${dataProps.end_date}`;

    const { data } = await api.get<dataListTaskHeaderResponse[]>(apiUrl);
    return data;
  };

  // Handle API get task header task
  const {
    data: dataTaskHeaderList,
    refetch: refetchDataHeaderTaskList,
    isFetched: isFetchedDataTaskList,
  } = useQuery({
    queryKey: ['getDataTaskHeaderList'],
    queryFn: getTaskHeaderList,
    retry: 0,
    enabled: !!token,
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

  return {
    dataTaskHeaderList,
    refetchDataHeaderTaskList,
    isFetchedDataTaskList,
  };
};

export default useDataHeaderTaskList;
