import React, { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import CompanyDetailInfo from './detail';

const DetailCompanyPage = () => {
  return (
    <MainLayout title={pageRouters.COMPANY_DETAIL.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <CompanyDetailInfo />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default DetailCompanyPage;
