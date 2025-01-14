import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import CreateTermForm from './form';

const CreateTermPage = () => {
  return (
    <MainLayout title={pageRouters.TERM_CREATE.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <CreateTermForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default CreateTermPage;
