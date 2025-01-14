import MainLayout from '@components/layouts/MainLayout';
import ListCategory from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CategoryPage = () => {
  return (
    <MainLayout
      title={pageRouters.CATEGORY_MANAGEMENT.name}
      permission={PermissionsSystem.CATEGORY_VIEW}>
      <div className="flex flex-col gap-6">
        <ListCategory />
      </div>
    </MainLayout>
  );
};

export default CategoryPage;
