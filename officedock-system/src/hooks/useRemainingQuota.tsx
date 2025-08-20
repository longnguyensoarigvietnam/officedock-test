'use client';
import { useQuery } from 'react-query';

import { apiRouters } from '@constants/routers';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

const useRemainingQuota = () => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get remaining quota
  const getRemainingQuota = async () => {
    const { data } = await api.get<{ remainingQuota: number }>(
      apiRouters.REMAINING_QUOTA,
    );
    return data;
  };

  // Handle API get remaining quota
  const {
    data: remainingQuota,
    refetch: refetchRemainingQuota,
    isFetched: isFetchedRemainingQuota,
  } = useQuery({
    queryKey: ['getRemainingQuota'],
    queryFn: getRemainingQuota,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return { remainingQuota, refetchRemainingQuota, isFetchedRemainingQuota };
};

export default useRemainingQuota;
