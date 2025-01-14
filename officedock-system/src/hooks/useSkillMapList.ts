'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { PAGINATION_PAGE_SIZE_DEFAULT } from '@constants';
import { ServerStatusCode } from '@constants/enums';

import { BasePagination } from '@interfaces/common';
import { ResponseError } from '@interfaces/response';

import api from '@base/api';
import { SkillMap } from '@interfaces/skills';

interface FilterProps {
  organizationName?: string;
  staffId?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useSkillMapList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization list
  const getSkillMapList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.SKILL_MAPS_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${
          filter?.organizationName
            ? `&organization_name=${filter.organizationName}`
            : ''
        }${filter?.staffId ? `&staff_id=${filter.staffId}` : ''}`
      : `${apiRouters.SKILL_MAPS_LIST}`;

    const { data } = await api.get<BasePagination<SkillMap[]>>(apiUrl);
    return data;
  };

  // Handle API get skill map list
  const {
    data: skillMapList,
    refetch: refetchSkillMapList,
    isFetched: isFetchedSkillMaps,
  } = useQuery({
    queryKey: ['getSkillMapList', [pagination, filter]],
    queryFn: getSkillMapList,
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
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { skillMapList, refetchSkillMapList, isFetchedSkillMaps };
};

export default useSkillMapList;
