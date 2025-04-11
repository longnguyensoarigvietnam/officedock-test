'use client';
import React from 'react';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import DailyReportDetailBoard from './daily-report-detail-board';

const DailyReportPage = () => {
  return (
    <MainLayout
      title={pageRouters.DAILY_REPORT_TEAM_DETAIL.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0 "
      showFooter={false}>
      <DailyReportDetailBoard />
    </MainLayout>
  );
};

export default DailyReportPage;
