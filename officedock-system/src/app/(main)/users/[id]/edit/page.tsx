import MainLayout from '@components/layouts/MainLayout';
import EditUserForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditUserPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_USER.name}
      permission={PermissionsSystem.USER_UPDATE}>
      <div className="flex flex-col gap-6">
        <EditUserForm />
      </div>
    </MainLayout>
  );
};

export default EditUserPage;
