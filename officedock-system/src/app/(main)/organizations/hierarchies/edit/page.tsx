'use client';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import EditNode from './editNode';

const OrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_HIERARCHY.name}
      permission={PermissionsSystem.ORGANIZATION_HIERARCHY_UPDATE}
      className="px-0 pt-[30px] !overflow-x-auto overflow-y-hidden"
      showFooter={false}>
      <div className="flex flex-col gap-[27px]">
        <EditNode />
      </div>
    </MainLayout>
  );
};

export default OrganizationPage;
