import React from 'react';
import { notFound } from 'next/navigation';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import CreateActualDurationsForm from './form';

const CreateActualDurationsPage = () => {
  const showActualDurationPage =
    process.env.NEXT_PUBLIC_SHOW_ACTUAL_DURATION_PAGE?.toLowerCase() === 'true';
    
  if (!showActualDurationPage) {
    notFound()
  } else {
    return (
      <MainLayout
        title={pageRouters.CREATE_ACTUAL_DURATIONS.name}
        permission={PermissionsSystem.VIEW_ALL}
        showFooter={false}>
        <div className="flex flex-col gap-6 h-full">
          <CreateActualDurationsForm />
        </div>
      </MainLayout>
    );
  }
};

export default CreateActualDurationsPage;
