import MainLayout from '@components/layouts/MainLayout';
import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import React from 'react';
import StatisticBoard from './board';

const StatisticPage = () => {
  return (
    <MainLayout
      title={pageRouters.STATISTIC_MANAGEMENT.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0 !bg-[#EBF1F7]"
      showFooter={false}>
      <StatisticBoard />
    </MainLayout>
  );
};

export default StatisticPage;
