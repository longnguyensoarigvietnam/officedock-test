'use client';
import { AxiosError } from 'axios';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';

import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { Profile } from '@interfaces/user';

interface UseCreationPersonInChargeHooksProps {
  condition?: boolean[];
  onSuccess?: (success: Omit<Profile, 'birthday' | 'gender'>[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useCreationPersonInCharge = ({
  condition,
  onSuccess,
  onError,
  onSettled,
}: UseCreationPersonInChargeHooksProps) => {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Handle call API get creation person in charge
  const getCreationPersonInCharge = async () => {
    const apiUrl = apiRouters.PEOPLE_IN_CHARGE_CREATION;

    const { data } =
      await api.get<Omit<Profile, 'birthday' | 'gender'>[]>(apiUrl);
    return data;
  };

  // Handle API get creation person in charge
  const {
    data: creationPersonInChargeData,
    refetch: refetchCreationPersonInCharge,
    isFetched: isFetchedCreationPersonInCharge,
  } = useQuery({
    queryKey: ['getCreationPersonInCharge'],
    queryFn: getCreationPersonInCharge,
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: Omit<Profile, 'birthday' | 'gender'>[]) => {
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
    creationPersonInChargeData,
    refetchCreationPersonInCharge,
    isFetchedCreationPersonInCharge,
  };
};

export default useCreationPersonInCharge;
