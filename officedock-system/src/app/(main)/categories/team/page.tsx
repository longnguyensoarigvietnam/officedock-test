import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import ListHierarchy from './list';

const TeamCategoryPage = () => {
  return (
    <MainLayout
      title={pageRouters.TEAM_CATEGORY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_HIERARCHY_VIEW}
      className="px-0 !pt-0 !overflow-x-auto"
      showFooter={false}>
      <ListHierarchy />
    </MainLayout>
  );
};

export default TeamCategoryPage;
