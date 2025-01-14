'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingContext } from '@providers/LoadingProvider';
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
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;
  const { setIsLoading } = useContext(LoadingContext);
  // Handle call API get organization list
  const getOrganizationList = async () => {
    setIsLoading(true);
    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.ORGANIZATION_LIST_OPTIONS}${is_with_staff ? `?is_with_staff=${is_with_staff}` : ''}${is_hierarchy ? `${is_with_staff ? '&' : '?'}is_hierarchy=true` : ''}${is_with_skill ? `${is_with_staff ? '&' : '?'}is_with_skill=true` : ''}${current_screen ? `&current_screen=${current_screen}` : ''} `;
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
      setIsLoading(false);
    },
  });
  return {
    organizationOptions,
    refetchOrganizationOptions,
    isFetchedOrganizationsOptions,
  };
};
export default useOrganizationOptions;
