import MainLayout from '@components/layouts/MainLayout';
import CreateTagForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CreateTagPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_TAG.name}
      permission={PermissionsSystem.TAG_ADD}>
      <div className="flex flex-col gap-6">
        <CreateTagForm />
      </div>
    </MainLayout>
  );
};

export default CreateTagPage;
