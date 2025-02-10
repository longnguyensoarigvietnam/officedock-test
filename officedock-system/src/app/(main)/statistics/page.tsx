import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import StatisticBoard from './statistic-board';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const StatisticPage = () => {
  return (
    <MainLayout
      title={pageRouters.STATISTICS_MANAGEMENT.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0 "
      showFooter={false}>
      <StatisticBoard />
    </MainLayout>
  );
};

export default StatisticPage;
