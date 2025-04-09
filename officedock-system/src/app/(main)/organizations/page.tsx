import { Suspense } from 'react';
import MainLayout from '@components/layouts/MainLayout';
import ListOrganizations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const OrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_MANAGEMENT.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}
      className="pl-8 pt-8 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex gap-4 items-center mb-5">
        <p className="text-black font-medium text-[26px]">チーム管理</p>
      </div>
      <div className="flex flex-col gap-6">
        <Suspense>
          <ListOrganizations />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default OrganizationPage;
