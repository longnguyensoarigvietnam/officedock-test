import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';
import EditUserForm from './form';

import { pageRouters } from '@constants/routers';

const EditUserPage = () => {
  return (
    <MainLayout title={pageRouters.USER_EDIT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <EditUserForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default EditUserPage;
