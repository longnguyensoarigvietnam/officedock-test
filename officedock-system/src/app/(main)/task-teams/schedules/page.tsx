import React from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import ScheduleTeamBoard from './board';
import { TaskTeamStateProvider } from '@providers/TaskTeamProvider';

const ScheduleTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.TASKS_TEAM_MANAGEMENT.name}
      permission={PermissionsSystem.TEAMDOCK_VIEW}
      className="!py-0 pl-10 pr-0 !bg-[#EBF1F7]"
      showFooter={false}>
      <TaskTeamStateProvider>
        <ScheduleTeamBoard />
      </TaskTeamStateProvider>
    </MainLayout>
  );
};

export default ScheduleTeamPage;
