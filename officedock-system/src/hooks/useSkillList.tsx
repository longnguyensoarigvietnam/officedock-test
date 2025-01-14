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
import { Skill } from '@interfaces/skills';
import api from '@base/api';

interface FilterProps {
  name?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useSkillList = ({
  pagination,
  filter,
  ordering,
  current_screen,
}: {
  pagination?: PaginationProps;
  filter?: FilterProps;
  ordering?: string;
  current_screen?: string;
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get User list
  const getSkillList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.SKILL_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${ordering ? `&ordering=${ordering}` : ''}${filter?.name ? `&name=${filter.name}` : ''}${current_screen ? `&current_screen=${current_screen}` : ''}`
      : `${apiRouters.SKILL_LIST}${current_screen ? `?current_screen=${current_screen}` : ''}`;

    const { data } = await api.get<BasePagination<Skill[]>>(apiUrl);
    return data;
  };

  // Handle API get User list
  const {
    data: skillList,
    refetch: refetchSkillList,
    isFetched: isFetchedSkills,
  } = useQuery({
    queryKey: ['getSkillList', [pagination, filter, ordering]],
    queryFn: getSkillList,
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

  return { skillList, refetchSkillList, isFetchedSkills };
};

export default useSkillList;
