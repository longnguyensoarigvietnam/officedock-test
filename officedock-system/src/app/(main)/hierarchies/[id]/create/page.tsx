import React from 'react';
import CreateHierarchyForm from './form';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_HIERARCHY.name}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateHierarchyForm />
      </div>
    </MainLayout>
  );
};

export default EditHierarchyPage;
