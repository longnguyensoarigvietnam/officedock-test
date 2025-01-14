import MainLayout from '@components/layouts/MainLayout';
import ListOrganizations from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const Homepage = () => {
  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_MANAGEMENT.name}
      permission={PermissionsSystem.ORGANIZATION_VIEW}>
      <div className="flex flex-col gap-6">
        <ListOrganizations />
      </div>
    </MainLayout>
  );
};

export default Homepage;
