import MainLayout from '@components/layouts/MainLayout';
import KanbanBoardTaskTeam from './KanbanBoardTaskTeam';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import { TaskTeamStateProvider } from '@providers/TaskTeamProvider';

const TaskPage = () => {
  return (
    <MainLayout
      title={pageRouters.TASKS_MANAGEMENT.name}
      className="!py-0 pl-10 pr-0 !bg-[#EBF1F7] !overflow-hidden"
      permission={PermissionsSystem.MY_TASK_VIEW}
      showFooter={false}>
      <TaskTeamStateProvider>
        <KanbanBoardTaskTeam />
      </TaskTeamStateProvider>
    </MainLayout>
  );
};

export default TaskPage;
