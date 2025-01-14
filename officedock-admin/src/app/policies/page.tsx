import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListPolicies from './list';

const PoliciesPage = () => {
  return (
    <MainLayout title={pageRouters.POLICIES_MANAGEMENT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <ListPolicies />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default PoliciesPage;
