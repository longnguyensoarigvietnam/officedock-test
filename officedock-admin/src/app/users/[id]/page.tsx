import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import UserDetail from './detail';

const DetailUserPage = () => {
  return (
    <MainLayout title={pageRouters.USER_DETAIL.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <UserDetail />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default DetailUserPage;
