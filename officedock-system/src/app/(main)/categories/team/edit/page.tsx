import React from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import EditHierarchyForm from './board';

const EditHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_TEAM_CATEGORY.name}
      className="px-0 !pt-0"
      showFooter={false}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_UPDATE}>
      <EditHierarchyForm />
    </MainLayout>
  );
};

export default EditHierarchyPage;
