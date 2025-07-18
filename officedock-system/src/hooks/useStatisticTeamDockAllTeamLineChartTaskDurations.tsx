'use client';

import { useQuery } from 'react-query';
import { AxiosError } from 'axios';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { apiRouters } from '@constants/routers';

import { TeamDockStatisticsAllTeamTaskDuration } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import api from '@base/api';

interface FilterProps {
  fromDate: string | Date;
  endDate: string | Date;
  tagIds?: OptionDropdownType[];
  userIds?: string;
  statisticBy?: string;
  isTagPage?: boolean;
  option?: string
  mainOrganizationId?: string
}

const useStatisticTeamDockAllTeamLineChartTaskDurations = ({
  filter,
  condition,
  onSuccess,
  onError,
}: {
  filter?: FilterProps;
  condition?: boolean[];
  onSuccess?: (data: TeamDockStatisticsAllTeamTaskDuration) => void;
  onError?: (error: AxiosError) => void;
}) => {
  const { data: session } = useSessionCache();
  const token = session?.accessToken;

  // Handle call API get statistic all team task duration list
  const getStatisticTeamDockAllTeamLineChartTaskDurations = async ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams();
    if (filter?.fromDate) {
      params.append('from_date', String(filter?.fromDate));
    }
    if (filter?.endDate) {
      params.append('end_date', String(filter?.endDate));
    }
    params.append('statistic_by', filter?.statisticBy || 'WEEK');

    if (filter?.tagIds?.length) {
      const tagIds = filter.tagIds.map((item) => item.value).join(',');
      params.append('tag_ids', tagIds);
    }
    if (filter?.isTagPage) {
      params.append('is_tag_page', 'true');
    }
    if (filter?.userIds) {
      params.append('user_ids', filter.userIds);
    }
    if (filter?.option) {
      params.append('option', filter?.option);
    }
    if (filter?.mainOrganizationId) {
      params.append('main_organization_id', filter?.mainOrganizationId);
    }

    const apiUrl = `${apiRouters.STATISTICS_ALL_TEAMS_TASK_DURATIONS}?${params.toString()}`;

    const { data } = await api.get<TeamDockStatisticsAllTeamTaskDuration>(apiUrl, {
      signal,
    });
    return data;
  };

  // Handle API get statistic task duration list
  const {
    data: statisticTeamDockAllTeamLineChartTaskDurationsList,
    refetch: refetchStatisticTeamDockAllTeamLineChartTaskDurationsList,
    isFetched: isFetchedStatisticTeamDockAllTeamLineChartTaskDurationsList,
  } = useQuery({
    queryKey: ['getStatisticTeamDockAllTeamLineChartTaskDurations', [filter]],
    queryFn: ({ signal }) => getStatisticTeamDockAllTeamLineChartTaskDurations({ signal }),
    retry: 0,
    enabled: !!token && condition?.every(Boolean),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data: TeamDockStatisticsAllTeamTaskDuration) => {
      onSuccess && onSuccess(data);
    },
    onError: (error: AxiosError) => {
      onError && onError(error);
    },
    onSettled: () => {},
  });

  return {
    statisticTeamDockAllTeamLineChartTaskDurationsList,
    refetchStatisticTeamDockAllTeamLineChartTaskDurationsList,
    isFetchedStatisticTeamDockAllTeamLineChartTaskDurationsList,
  };
};

export default useStatisticTeamDockAllTeamLineChartTaskDurations;
