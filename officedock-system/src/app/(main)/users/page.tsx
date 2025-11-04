import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';
import ListUsers from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const UsersPage = () => {
  return (
    <MainLayout
      title={pageRouters.USERS_MANAGEMENT.name}
      permission={PermissionsSystem.USER_VIEW}
      className="px-10 pt-[30px] pb-10 !overflow-x-auto"
      showFooter={false}>
      <div className="flex flex-col gap-0">
        <Suspense>
          <ListUsers />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default UsersPage;
