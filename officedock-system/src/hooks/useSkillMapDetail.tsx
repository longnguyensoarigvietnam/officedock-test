'use client';
import { useContext } from 'react';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { SkillMapDetail } from '@interfaces/skills';
import { LoadingContext } from '@providers/LoadingProvider';

interface UseSkillMapDetailHooksProps {
  organizationId: string;
  staffId: string;
  conditions?: boolean[];
  onSuccess?: (success: SkillMapDetail) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useSkillMapDetail = ({
  organizationId,
  staffId,
  conditions,
  onSuccess,
  onError,
  onSettled,
}: UseSkillMapDetailHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { setIsLoading } = useContext(LoadingContext);

  // Handle call API get skill map detail
  const getSkillMapDetail = async () => {
    setIsLoading(true);
    const apiUrl = `${apiRouters.SKILL_MAPS_DETAIL_CATEGORIES}?organization_id=${organizationId}&&staff_id=${staffId}`;

    const { data } = await api.get<SkillMapDetail>(apiUrl);
    return data;
  };

  // Handle API get skill map detail
  const {
    data: skillMapDetail,
    refetch: refetchSkillMapDetail,
    isFetched: isFetchedSkillMapDetail,
  } = useQuery({
    queryKey: ['getSkillMapDetail', organizationId],
    queryFn: getSkillMapDetail,
    retry: 0,
    enabled: !!token && conditions?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: SkillMapDetail) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      onSettled && onSettled();
    },
  });

  return {
    skillMapDetail,
    refetchSkillMapDetail,
    isFetchedSkillMapDetail,
  };
};

export default useSkillMapDetail;
