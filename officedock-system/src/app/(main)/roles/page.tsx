import MainLayout from '@components/layouts/MainLayout';
import ListRoles from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const RolePage = () => {
  return (
    <MainLayout
      title={pageRouters.ROLES_MANAGEMENT.name}
      permission={PermissionsSystem.ROLE_VIEW}
      className="pl-8 pt-8 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">権限管理</p>
      </div>
      <div className="flex flex-col gap-6">
        <ListRoles />
      </div>
    </MainLayout>
  );
};

export default RolePage;
