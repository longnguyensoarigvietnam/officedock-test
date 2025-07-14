'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { StatisticsAllTeamTaskDuration } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

interface FilterProps {
  endDate: string | Date;
  fromDate: string | Date;
  tagIds?: OptionDropdownType[];
  statisticBy?: string;
}

const useStatisticAllTeamTaskDurations = ({
  filter,
  condition,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  condition?: boolean[];
  onSuccess?: (data: StatisticsAllTeamTaskDuration) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get statistic all team task duration list
  const getStatisticAllTeamTaskDurations = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const apiUrl = `${apiRouters.STATISTICS_ALL_TEAMS_TASK_DURATIONS}?${
      filter?.fromDate ? `from_date=${filter.fromDate}` : ''
    }${filter?.endDate ? `&end_date=${filter.endDate}` : ''}${filter?.statisticBy ? `&statistic_by=${filter.statisticBy}` : '&statistic_by=WEEK'}${filter?.tagIds ? `&tag_ids=${filter.tagIds.map((item) => item.value).join(',')}` : ''}`;

    const { data } = await api.get<StatisticsAllTeamTaskDuration>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get statistic task duration list
  const {
    data: statisticAllTeamTaskDurationsList,
    refetch: refetchStatisticAllTeamTaskDurationsList,
    isFetched: isFetchedStatisticAllTeamTaskDurationsList,
  } = useQuery({
    queryKey: ['getStatisticAllTeamTaskDurations', [filter]],
    queryFn: ({ signal }) => getStatisticAllTeamTaskDurations({ signal }),

    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: StatisticsAllTeamTaskDuration) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return {
    statisticAllTeamTaskDurationsList,
    refetchStatisticAllTeamTaskDurationsList,
    isFetchedStatisticAllTeamTaskDurationsList,
  };
};

export default useStatisticAllTeamTaskDurations;
