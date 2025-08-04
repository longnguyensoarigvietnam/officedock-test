import React from 'react';

import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import EditHierarchyBoard from './board';

const EditHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_CALENDAR_CATEGORY.name}
      className="px-0 !pt-0"
      showFooter={false}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_UPDATE}>
      <EditHierarchyBoard />
    </MainLayout>
  );
};

export default EditHierarchyPage;
