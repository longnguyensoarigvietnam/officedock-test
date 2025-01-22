import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import CreateCompanyForm from './form';

const CreateCompanyPage = () => {
  return (
    <MainLayout title={pageRouters.COMPANY_CREATE.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <CreateCompanyForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default CreateCompanyPage;
