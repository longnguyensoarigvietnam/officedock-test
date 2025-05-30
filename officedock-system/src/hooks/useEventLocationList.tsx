'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';
import { useContext } from 'react';

import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { LocationEventType } from '@interfaces/location';
import { LoadingContext } from '@providers/LoadingProvider';

interface UseEventLocationListHooksProps {
  onSuccess?: (success: LocationEventType[]) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
}

const useEventLocationList = ({
  onSuccess,
  onError,
  onSettled,
}: UseEventLocationListHooksProps) => {
  const { data: session } = useSession();
  const { setIsLoading } = useContext(LoadingContext);

  const token = session?.accessToken;

  // Handle call API get Bookmark
  const getEventLocationList = async () => {
    setIsLoading(true);

    const apiUrl = `${apiRouters.LOCATION_LIST}`;

    const { data } = await api.get<LocationEventType[]>(apiUrl);
    return data;
  };

  // Handle API get tag detail
  const {
    data: eventLocationList,
    refetch: refetchEventLocationList,
    isFetched: isFetchedEventLocationList,
  } = useQuery({
    queryKey: ['getEventLocationList'],
    queryFn: getEventLocationList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: LocationEventType[]) => {
      onSuccess && onSuccess(response);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {
      setIsLoading(false);
      onSettled && onSettled();
    },
  });

  return {
    eventLocationList,
    refetchEventLocationList,
    isFetchedEventLocationList,
  };
};

export default useEventLocationList;
