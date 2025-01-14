import MainLayout from '@components/layouts/MainLayout';
import CategoryDetail from './detail';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const DetailSkillPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_CATEGORY.name}
      permission={PermissionsSystem.CATEGORY_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <CategoryDetail />
      </div>
    </MainLayout>
  );
};

export default DetailSkillPage;
