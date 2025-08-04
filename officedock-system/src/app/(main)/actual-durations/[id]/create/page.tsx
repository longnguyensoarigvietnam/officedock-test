import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import CreateActualDurationsForm from './form';

const CreateActualDurationsPage = () => {
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
};

export default CreateActualDurationsPage;
