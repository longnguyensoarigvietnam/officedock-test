import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import DetailRoleTable from './detail';
import { PermissionsSystem } from '@constants/enums';

const DetailRolePage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_ROLE.name}
      permission={PermissionsSystem.ROLE_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <DetailRoleTable />
      </div>
    </MainLayout>
  );
};

export default DetailRolePage;
