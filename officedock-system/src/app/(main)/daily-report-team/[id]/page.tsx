'use client';
import React from 'react';
import { useSession } from 'next-auth/react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem, UserRoles } from '@constants/enums';
import DailyReportDetailBoard from './daily-report-detail-board';
import { hasRole } from '@utils';

const DailyReportPage = () => {
  const { data: session } = useSession();

  if (session && !hasRole(session?.user.roles, UserRoles.SYSTEM_ADMIN)) return;
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
