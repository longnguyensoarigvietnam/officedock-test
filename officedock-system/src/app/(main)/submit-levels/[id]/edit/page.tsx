import MainLayout from '@components/layouts/MainLayout';

import EditSubmitLevelForm from './form';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditSubmitLevelPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_SUBMIT_LEVELS.name}
      permission={PermissionsSystem.SUBMIT_LEVEL_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditSubmitLevelForm />
      </div>
    </MainLayout>
  );
};

export default EditSubmitLevelPage;
