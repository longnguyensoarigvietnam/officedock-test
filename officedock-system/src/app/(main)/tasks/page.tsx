import MainLayout from '@components/layouts/MainLayout';
import KanbanBoardTask from './kanban-board-task';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const TaskPage = () => {
  return (
    <MainLayout
      title={pageRouters.TASKS_MANAGEMENT.name}
      className="!p-0"
      permission={PermissionsSystem.MY_TASK_VIEW}
      showFooter={false}>
      <KanbanBoardTask />
    </MainLayout>
  );
};

export default TaskPage;
