import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListHierarchy from './list';
import { PermissionsSystem } from '@constants/enums';

const HierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.HIERARCHY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_VIEW}>
      <div className="flex flex-col gap-6">
        <ListHierarchy />
      </div>
    </MainLayout>
  );
};

export default HierarchyPage;
