import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import PolicyDetail from './detail';

const DetailPolicyPage = () => {
  return (
    <MainLayout title={pageRouters.POLICY_DETAIL.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <PolicyDetail />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default DetailPolicyPage;
