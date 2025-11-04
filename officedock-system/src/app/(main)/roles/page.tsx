import MainLayout from '@components/layouts/MainLayout';
import ListRoles from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const RolePage = () => {
  return (
    <MainLayout
      title={pageRouters.ROLES_MANAGEMENT.name}
      permission={PermissionsSystem.ROLE_VIEW}
      className="px-10 py-[30px] !overflow-x-auto"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px] leading-[1]">権限管理</p>
      </div>
      <div className="flex flex-col gap-6">
        <ListRoles />
      </div>
    </MainLayout>
  );
};

export default RolePage;
