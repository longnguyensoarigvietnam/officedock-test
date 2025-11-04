import MainLayout from '@components/layouts/MainLayout';
import DetailRoleTable from './detail';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const DetailRolePage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_ROLE.name}
      permission={PermissionsSystem.ROLE_VIEW}
      className="px-10 py-[30px]"
      showFooter={false}>
      <div className="flex flex-col gap-6 h-full">
        <DetailRoleTable />
      </div>
    </MainLayout>
  );
};

export default DetailRolePage;
