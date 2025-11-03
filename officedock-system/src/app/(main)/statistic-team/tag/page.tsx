import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import StatisticTeamTagBoard from './board';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import { StatisticTeamTagsStateProvider } from '@providers/StatisticTeamProviderTag';

const StatisticTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.STATISTIC_TEAM_TAG_MANAGEMENT.name}
      permission={PermissionsSystem.TEAMDOCK_VIEW}
      className="!py-0 !px-0"
      showFooter={false}>
      <StatisticTeamTagsStateProvider>
        <StatisticTeamTagBoard />
      </StatisticTeamTagsStateProvider>
    </MainLayout>
  );
};

export default StatisticTeamPage;
