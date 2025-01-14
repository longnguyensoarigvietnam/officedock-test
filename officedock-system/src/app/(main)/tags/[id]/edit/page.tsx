import MainLayout from '@components/layouts/MainLayout';
import EditTagForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditTagPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_TAG.name}
      permission={PermissionsSystem.TAG_UPDATE}>
      <div className="flex flex-col gap-6">
        <EditTagForm />
      </div>
    </MainLayout>
  );
};

export default EditTagPage;
