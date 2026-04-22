'use client';
import { signOut } from 'next-auth/react';
import { useQuery } from 'react-query';
import { useRouter } from 'next/navigation';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { ResponseError } from '@interfaces/response';
import api from '@base/api';
import { Template } from '@interfaces/template';
import { useSessionCache } from '@providers/SessionCacheProvider';

const useTemplateList = () => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  // Handle call API get template list
  const getTemplateList = async () => {
    const apiUrl = `${apiRouters.TEMPLATE_LIST}`;
    const response = await api.get<Template[]>(apiUrl);
    return response;
  };

  // Handle API get template list
  const {
    data: templates,
    refetch: refetchTemplateList,
    isFetched: isFetchedTemplateList,
  } = useQuery({
    queryKey: ['getTemplateList'],
    queryFn: getTemplateList,
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

  return { templates, refetchTemplateList, isFetchedTemplateList };
};

export default useTemplateList;
