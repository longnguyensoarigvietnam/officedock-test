import MainLayout from '@components/layouts/MainLayout';
import ListRoles from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const RolePage = () => {
  return (
    <MainLayout
      title={pageRouters.ROLES_MANAGEMENT.name}
      permission={PermissionsSystem.ROLE_VIEW}>
      <div className="flex flex-col gap-6">
        <ListRoles />
      </div>
    </MainLayout>
  );
};

export default RolePage;
