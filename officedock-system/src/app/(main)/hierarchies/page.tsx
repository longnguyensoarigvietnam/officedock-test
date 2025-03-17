import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import ListHierarchy from './list';

const HierarchyPage = () => {
  return (
    <MainLayout
      title={pageRouters.HIERARCHY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_VIEW}
      className="px-0 !pt-0 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <div className="flex flex-col gap-6">
        <ListHierarchy />
      </div>
    </MainLayout>
  );
};

export default HierarchyPage;
