import React from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import ScheduleTeamBoard from './board';

const ScheduleTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.TASKS_TEAM_MANAGEMENT.name}
      permission={PermissionsSystem.TEAMDOCK_VIEW}
      className="!py-0 px-0 !overflow-hidden"
      showFooter={false}>
      <ScheduleTeamBoard />
    </MainLayout>
  );
};

export default ScheduleTeamPage;
