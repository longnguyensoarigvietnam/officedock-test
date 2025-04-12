import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import StatisticTeamBoard from './board';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { StatisticTeamStateProvider } from '@providers/StatisticTeamProvider';

const StatisticTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.STATISTIC_TEAM_MANAGEMENT.name}
      permission={PermissionsSystem.TEAMDOCK_VIEW}
      className="!py-0 pl-10 pr-0 !bg-[#EBF1F7]"
      showFooter={false}>
      <StatisticTeamStateProvider>
        <StatisticTeamBoard />
      </StatisticTeamStateProvider>
    </MainLayout>
  );
};

export default StatisticTeamPage;
