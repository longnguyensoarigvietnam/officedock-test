import MainLayout from '@components/layouts/MainLayout';
import KanbanBoardTaskTeam from './KanbanBoardTaskTeam';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const TaskPage = () => {
  return (
    <MainLayout
      title={pageRouters.TASKS_TEAM_MANAGEMENT.name}
      className="!py-0 pl-10 pr-0 !bg-[#EBF1F7] !overflow-hidden"
      permission={PermissionsSystem.TEAMDOCK_VIEW}
      showFooter={false}>
      <KanbanBoardTaskTeam />
    </MainLayout>
  );
};

export default TaskPage;
