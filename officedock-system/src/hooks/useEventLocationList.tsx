'use client';
import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import { AxiosError } from 'axios';
import { useContext } from 'react';

import { PAGINATION_PAGE_SIZE_SMALL } from '@constants';
import { apiRouters } from '@constants/routers';

import api from '@base/api';
import { LocationEventType } from '@interfaces/location';
import { LoadingContext } from '@providers/LoadingProvider';
import { BasePagination } from '@interfaces/common';

interface PaginationProps {
  page?: number;
  pageSize?: number;
}
interface UseEventLocationListHooksProps {
  onSuccess?: (success: BasePagination<LocationEventType[]>) => void;
  onError?: (error: AxiosError) => void;
  onSettled?: () => void;
  pagination?: PaginationProps;
}

const useEventLocationList = ({
  pagination,
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

    const apiUrl = pagination?.page
      ? `${apiRouters.LOCATION_LIST}?page=${pagination.page}&page_size=${pagination.pageSize || PAGINATION_PAGE_SIZE_SMALL}`
      : `${apiRouters.LOCATION_LIST}`;

    const { data } = await api.get<BasePagination<LocationEventType[]>>(apiUrl);
    return data;
  };

  // Handle API get tag detail
  const {
    data: eventLocationList,
    refetch: refetchEventLocationList,
    isFetched: isFetchedEventLocationList,
  } = useQuery({
    queryKey: ['getEventLocationList', [pagination]],
    queryFn: getEventLocationList,
    retry: 0,
    enabled: !!token,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (response: BasePagination<LocationEventType[]>) => {
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
