import MainLayout from '@components/layouts/MainLayout';
import UserDetail from './detail';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const DetailUserPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_USER.name}
      permission={PermissionsSystem.USER_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <UserDetail />
      </div>
    </MainLayout>
  );
};

export default DetailUserPage;
