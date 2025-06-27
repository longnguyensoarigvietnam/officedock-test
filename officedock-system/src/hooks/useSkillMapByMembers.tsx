'use client';

import { useContext } from 'react';
import { useQuery } from 'react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { ResponseError } from '@interfaces/response';
import { SkillMapByMembers } from '@interfaces/skills';

import api from '@base/api';

interface FilterProps {
  organizationId?: number | null;
}

const useSkillMapByMembers = (filter?: FilterProps) => {
  const { data: session } = useSessionCache();
  const router = useRouter();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get skill map list by members
  const getSkillMapListByMembers = async () => {
    setIsLoading(true);

    const { data } = await api.get<SkillMapByMembers[]>(
      `${apiRouters.MANAGE_SKILL_MAPS}${filter?.organizationId ? `?organization_id=${filter?.organizationId}` : ''}`,
    );
    return data;
  };

  // Handle API get skill map list by members
  const {
    data: skillMapListByMembers,
    refetch: refetchSkillMapListByMembers,
    isFetched: isFetchedSkillMapsByMembers,
  } = useQuery({
    queryKey: ['getSkillMapListByMembers', [filter]],
    queryFn: getSkillMapListByMembers,
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
    skillMapListByMembers,
    refetchSkillMapListByMembers,
    isFetchedSkillMapsByMembers,
  };
};

export default useSkillMapByMembers;
