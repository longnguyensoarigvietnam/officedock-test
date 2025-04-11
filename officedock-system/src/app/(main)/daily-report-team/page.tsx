'use client';
import React from 'react';

import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';

import { PermissionsSystem } from '@constants/enums';
import ListData from './list';

const ListDailyReportPage = () => {
  return (
    <MainLayout
      title={pageRouters.DAILY_REPORT_TEAM.name}
      permission={PermissionsSystem.STATISTIC_VIEW}
      className="!py-0 pl-10 pr-0 "
      showFooter={false}>
      <ListData />
    </MainLayout>
  );
};

export default ListDailyReportPage;
