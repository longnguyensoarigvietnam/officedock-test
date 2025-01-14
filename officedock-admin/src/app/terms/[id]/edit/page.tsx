import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import EditTermForm from './form';

const EditTermPage = () => {
  return (
    <MainLayout title={pageRouters.TERM_EDIT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <EditTermForm />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default EditTermPage;
