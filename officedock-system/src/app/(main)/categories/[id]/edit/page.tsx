import MainLayout from '@components/layouts/MainLayout';
import EditCategoryForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const DetailOrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_CATEGORY.name}
      permission={PermissionsSystem.CATEGORY_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditCategoryForm />
      </div>
    </MainLayout>
  );
};

export default DetailOrganizationPage;
