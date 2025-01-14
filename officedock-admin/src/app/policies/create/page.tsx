import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import CreatePolicyForm from './form';

const CreatePolicyPage = () => {
  return (
    <MainLayout title={pageRouters.POLICY_CREATE.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <CreatePolicyForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default CreatePolicyPage;
