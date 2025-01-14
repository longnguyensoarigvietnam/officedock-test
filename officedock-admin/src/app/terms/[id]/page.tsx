import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import TermDetail from './detail';

const DetailTermPage = () => {
  return (
    <MainLayout title={pageRouters.TERM_DETAIL.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <TermDetail />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default DetailTermPage;
