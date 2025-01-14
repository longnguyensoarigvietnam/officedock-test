import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListSubmitLevels from './list';
import { PermissionsSystem } from '@constants/enums';

const SubmitLevelsPage = () => {
  return (
    <MainLayout
      title={pageRouters.SUBMIT_LEVELS.name}
      permission={PermissionsSystem.SUBMIT_LEVEL_VIEW}>
      <div className="flex flex-col gap-6">
        <ListSubmitLevels />
      </div>
    </MainLayout>
  );
};

export default SubmitLevelsPage;
