'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { ResponseError } from '@interfaces/response';
import { BasePagination } from '@interfaces/common';
import { MVPAnnouncementDetail } from '@interfaces/mvp';

import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';

interface UseMVPAnnouncementListProps {
  conditions?: boolean[];
  onSuccess?: (success: BasePagination<MVPAnnouncementDetail[]>) => void;
}

const useMVPAnnouncementList = ({
  conditions,
  onSuccess,
}: UseMVPAnnouncementListProps) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;
  const router = useRouter();

  // Handle call API get mvp announcement list
  const fetchMVPAnnouncementList = async ({
    pageParam,
    signal,
  }: {
    pageParam?: number | string;
    signal?: AbortSignal;
  }) => {
    let apiUrl: string;

    if (typeof pageParam === 'string') {
      // next page url for API
      apiUrl = pageParam;
    } else {
      apiUrl = `${apiRouters.MVP_ANNOUNCEMENT_LIST}`;
    }

    const { data } = await api.get<BasePagination<MVPAnnouncementDetail[]>>(apiUrl, {
      signal,
    });

    return {
      ...data,
      currentUrl: apiUrl, // only for tracking/debug
    };
  };

  // Handle API get mvp announcement list
  const {
    data,
    fetchNextPage,
    refetch,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isFetched,
  } = useInfiniteQuery({
    queryKey: ['fetchMVPAnnouncementList'],
    queryFn: ({ pageParam, signal }) => fetchMVPAnnouncementList({ pageParam, signal }),
    enabled: !!token && conditions?.every(Boolean),
    retry: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => {
      return lastPage?.next ? `${apiRouters.MVP_ANNOUNCEMENT_LIST}${lastPage?.next}` : undefined;
    },
    onSuccess: (allPages) => {
      const lastPage = allPages.pages[allPages.pages.length - 1];
      if (lastPage) {
        onSuccess?.(lastPage);
      }
    },
    onError: ({ response }: ResponseError<any>) => {
      if (response?.status === ServerStatusCode.UNAUTHORIZED) {
        if (session) {
          signOut();
          router.push(pageRouters.LOGIN.href);
        }
      }
    },
  });
  return {
    mvpAnnouncementList: data?.pages?.flatMap((page) => page?.results ?? []) ?? [],
    fetchNextPage,
    refetchVotingList: refetch,
    hasNextPage,
    isFetchingNextPage,
    isFetched,
    isLoadingList: isLoading,
  };
};

export default useMVPAnnouncementList;
