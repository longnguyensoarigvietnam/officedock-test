import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import CreateRoleForm from './form';
import { PermissionsSystem } from '@constants/enums';

const CreateRolesPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_ROLE.name}
      permission={PermissionsSystem.ROLE_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateRoleForm />
      </div>
    </MainLayout>
  );
};

export default CreateRolesPage;
