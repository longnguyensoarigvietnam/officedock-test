import MainLayout from '@components/layouts/MainLayout';
import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import React from 'react';
import { StatisticStateProvider } from '@providers/StatisticProvider';
import StatisticBoard from './board';

const StatisticPage = () => {
  return (
    <MainLayout
      title={pageRouters.STATISTIC_MANAGEMENT.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0"
      showFooter={false}>
      <StatisticStateProvider>
        <StatisticBoard />
      </StatisticStateProvider>
    </MainLayout>
  );
};

export default StatisticPage;
