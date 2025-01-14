import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import OrganizationDetail from './detail';
import { PermissionsSystem } from '@constants/enums';

const DetailOrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_ORGANIZATION.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <OrganizationDetail />
      </div>
    </MainLayout>
  );
};

export default DetailOrganizationPage;
