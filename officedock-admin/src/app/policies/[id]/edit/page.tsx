import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import EditPolicyForm from './form';

const EditPolicyPage = () => {
  return (
    <MainLayout title={pageRouters.POLICY_EDIT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <EditPolicyForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default EditPolicyPage;
