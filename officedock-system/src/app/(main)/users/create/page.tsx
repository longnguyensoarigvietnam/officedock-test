import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import CreateUserForm from './form';
import { PermissionsSystem } from '@constants/enums';

const CreateUserPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_USER.name}
      permission={PermissionsSystem.USER_ADD}>
      <div className="flex flex-col gap-6">
        <CreateUserForm />
      </div>
    </MainLayout>
  );
};

export default CreateUserPage;
