import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import StatisticTagBoard from './board';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { StatisticTagStateProvider } from '@providers/StatisticProviderTag';

const StatisticTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.STATISTIC_MANAGEMENT.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0 !bg-[#EBF1F7]"
      showFooter={false}>
      <StatisticTagStateProvider>
        <StatisticTagBoard />
      </StatisticTagStateProvider>
    </MainLayout>
  );
};

export default StatisticTeamPage;
