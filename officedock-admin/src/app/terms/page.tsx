import { Suspense } from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListTerms from './list';

const TermsPage = () => {
  return (
    <MainLayout title={pageRouters.TERMS_MANAGEMENT.name}>
      <div className="flex flex-col gap-6">
        <Suspense>
          <ListTerms />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default TermsPage;
