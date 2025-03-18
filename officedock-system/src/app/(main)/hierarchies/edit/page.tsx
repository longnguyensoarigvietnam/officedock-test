import React from 'react';
import EditHierarchyForm from './board';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const EditHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_HIERARCHY.name}
      className="px-0 !pt-0 !bg-[#EBF1F7]"
      showFooter={false}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_UPDATE}>
      <EditHierarchyForm />
    </MainLayout>
  );
};

export default EditHierarchyPage;
