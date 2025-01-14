import React from 'react';
import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import DetailHierarchy from './detail';
import { PermissionsSystem } from '@constants/enums';

const DetailHierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_HIERARCHY.name}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <DetailHierarchy />
      </div>
    </MainLayout>
  );
};

export default DetailHierarchyPage;
