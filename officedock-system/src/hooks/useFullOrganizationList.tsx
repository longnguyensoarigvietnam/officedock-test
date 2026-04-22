'use client';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { Organizations } from '@interfaces/organization';
import { ResponseError } from '@interfaces/response';

import api from '@base/api';

interface OrganizationOptionsProps {
  is_with_staff?: boolean;
  is_hierarchy?: boolean;
  is_with_skill?: boolean;
  current_screen?: string;
}

const useOrganizationOptions = ({
  is_with_staff,
  is_hierarchy,
  is_with_skill,
  current_screen,
}: OrganizationOptionsProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;
  // Handle call API get organization list
  const getOrganizationList = async () => {
    const queryParams = [];
    if (is_with_staff) {
      queryParams.push(`is_with_staff=${is_with_staff}`);
    }
    if (is_hierarchy) {
      queryParams.push(`is_hierarchy=${is_hierarchy}`);
    }
    if (is_with_skill) {
      queryParams.push(`is_with_skill=${is_with_skill}`);
    }
    if (current_screen) {
      queryParams.push(`current_screen=${current_screen}`);
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const apiUrl = `${apiRouters.ORGANIZATION_LIST_OPTIONS}${queryString}`;
    const { data } = await api.get<Organizations[]>(apiUrl);
    return data;
  };
  // Handle API get organization list
  const {
    data: organizationOptions,
    refetch: refetchOrganizationOptions,
    isFetched: isFetchedOrganizationsOptions,
  } = useQuery({
    queryKey: ['getOrganizationList', []],
    queryFn: getOrganizationList,
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
    },
  });
  return {
    organizationOptions,
    refetchOrganizationOptions,
    isFetchedOrganizationsOptions,
  };
};
export default useOrganizationOptions;
