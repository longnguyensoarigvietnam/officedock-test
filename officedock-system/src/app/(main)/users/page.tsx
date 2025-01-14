import MainLayout from '@components/layouts/MainLayout';
import ListUsers from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const UsersPage = () => {
  return (
    <MainLayout
      title={pageRouters.USERS_MANAGEMENT.name}
      permission={PermissionsSystem.USER_VIEW}>
      <div className="flex flex-col gap-6">
        <ListUsers />
      </div>
    </MainLayout>
  );
};

export default UsersPage;
