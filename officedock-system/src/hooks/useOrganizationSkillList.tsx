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
import { OrganizationSkill } from '@interfaces/skills';

interface FilterProps {
  name?: string;
}

interface PaginationProps {
  page?: number;
  pageSize?: number;
}

const useOrganizationSkillList = (
  pagination?: PaginationProps,
  filter?: FilterProps,
) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill list
  const getOrganizationSkillList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = pagination?.page
      ? `${apiRouters.ORGANIZATION_SKILLS}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_DEFAULT}${
          filter?.name ? `&name=${filter.name}` : ''
        }`
      : `${apiRouters.ORGANIZATION_SKILLS}`;

    const { data } = await api.get<BasePagination<OrganizationSkill[]>>(apiUrl);
    return data;
  };

  // Handle API get organization skill list
  const {
    data: organizationSkillList,
    refetch: refetchOrganizationSkillList,
    isFetched: isFetchedOrganizationSkill,
  } = useQuery({
    queryKey: ['getOrganizationSkillList', [pagination, filter]],
    queryFn: getOrganizationSkillList,
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

  return {
    organizationSkillList,
    refetchOrganizationSkillList,
    isFetchedOrganizationSkill,
  };
};

export default useOrganizationSkillList;
