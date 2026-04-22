import React from 'react';
import { notFound } from 'next/navigation';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import EditActualDurationsForm from './form';

const EditActualDurationsPage = () => {
  const showActualDurationPage =
    process.env.NEXT_PUBLIC_SHOW_ACTUAL_DURATION_PAGE?.toLowerCase() === 'true';

  if (!showActualDurationPage) {
    notFound()
  } else {
    return (
      <MainLayout
        title={pageRouters.EDIT_ACTUAL_DURATIONS.name}
        permission={PermissionsSystem.ACTUAL_DURATION_UPDATE}
        showFooter={false}>
        <div className="flex flex-col gap-6 h-full">
          <EditActualDurationsForm />
        </div>
      </MainLayout>
    );
  }
};

export default EditActualDurationsPage;
