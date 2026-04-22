import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';
import ListUsers from './list';

import { pageRouters } from '@constants/routers';

const UsersPage = () => {
  return (
    <MainLayout title={pageRouters.USERS_MANAGEMENT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <ListUsers />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default UsersPage;
