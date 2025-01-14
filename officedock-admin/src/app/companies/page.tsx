import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import CompanyList from './list';

const Homepage = () => {
  return (
    <MainLayout title={pageRouters.COMPANY_MANAGEMENT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <CompanyList />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default Homepage;
