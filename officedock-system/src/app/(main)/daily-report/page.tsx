import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import DailyReportBoard from './daily-report-board';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const StatisticPage = () => {
  return (
    <MainLayout
      title={pageRouters.DAILY_REPORT_MANAGEMENT.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0 "
      showFooter={false}>
      <DailyReportBoard />
    </MainLayout>
  );
};

export default StatisticPage;
