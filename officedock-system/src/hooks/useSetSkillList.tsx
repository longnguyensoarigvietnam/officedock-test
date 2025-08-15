'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { LoadingContext } from '@providers/LoadingProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { SkillMapByOrganizationInfo } from '@interfaces/skills';

import api from '@base/api';

interface FilterProps {
  userId?: number;
}

const useSetSkillList = ({
  filter,
  onError,
}: {
  filter?: FilterProps;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get set skill list
  const getSetSkillList = async () => {
    setIsLoading(true);

    // TODO: Confirm with BE about how many and how to use param
    const apiUrl = `${apiRouters.SET_SKILL_LIST}?user_id=${filter?.userId}`;

    const { data } = await api.get<SkillMapByOrganizationInfo[]>(apiUrl);
    return data;
  };

  // Handle API get set skill list
  const {
    data: myPageSkillList,
    refetch: refetchSetSkillList,
    isFetched: isFetchedSetSkills,
  } = useQuery({
    queryKey: ['getSetSkillList', [filter]],
    queryFn: getSetSkillList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return { myPageSkillList, refetchSetSkillList, isFetchedSetSkills };
};

export default useSetSkillList;
