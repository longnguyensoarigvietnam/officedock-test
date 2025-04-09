'use client';
import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import EditNode from './editNode';

const OrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_HIERARCHY.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}
      className="px-10 pt-8 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex flex-col gap-5">
        <EditNode />
      </div>
    </MainLayout>
  );
};

export default OrganizationPage;
