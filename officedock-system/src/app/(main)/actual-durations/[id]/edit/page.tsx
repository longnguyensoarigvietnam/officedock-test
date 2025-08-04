import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import EditActualDurationsForm from './form';

const EditActualDurationsPage = () => {
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
};

export default EditActualDurationsPage;
