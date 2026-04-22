import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';
import CreateUserForm from './form';

import { pageRouters } from '@constants/routers';

const CreateUserPage = () => {
  return (
    <MainLayout title={pageRouters.USER_CREATE.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <CreateUserForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default CreateUserPage;
