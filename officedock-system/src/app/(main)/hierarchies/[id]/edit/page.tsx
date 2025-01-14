import React from 'react';
import EditHierarchyForm from './form';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_HIERARCHY.name}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditHierarchyForm />
      </div>
    </MainLayout>
  );
};

export default EditHierarchyPage;
