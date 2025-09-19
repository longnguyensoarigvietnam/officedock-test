import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import EditCompanyForm from './form';

const EditCompany = () => {
  return (
    <MainLayout title={pageRouters.COMPANY_EDIT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <EditCompanyForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default EditCompany;
