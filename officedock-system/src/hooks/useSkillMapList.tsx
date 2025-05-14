'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { ResponseError } from '@interfaces/response';
import { SkillMapInfo } from '@interfaces/skills';

import api from '@base/api';

interface FilterProps {
  organizationId?: number;
  userId?: number;
}

const useSkillMapInfo = (filter?: FilterProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get organization skill list
  const getSkillMapInfo = async () => {
    setIsLoading(true);
    const queryParams = [];

    if (filter?.organizationId) {
      queryParams.push(`organization_id=${filter.organizationId}`);
    }
    if (filter?.userId) {
      queryParams.push(`user_id=${filter.userId}`);
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SKILL_MAPS_LIST}${queryString}`;

    const { data } = await api.get<SkillMapInfo>(apiUrl);
      return data;
  };

  // Handle API get organization skill list
  const {
    data: skillMapInfo,
    refetch: refetchSkillMapInfo,
    isFetched: isFetchedSkillMapInfo,
  } = useQuery({
    queryKey: ['getSkillMapInfo', [filter]],
    queryFn: getSkillMapInfo,
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
    skillMapInfo,
    refetchSkillMapInfo,
    isFetchedSkillMapInfo,
  };
};

export default useSkillMapInfo;
