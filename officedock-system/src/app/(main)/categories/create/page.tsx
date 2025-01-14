import MainLayout from '@components/layouts/MainLayout';
import CreateCategoryForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CreateSkillPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_CATEGORY.name}
      permission={PermissionsSystem.CATEGORY_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateCategoryForm />
      </div>
    </MainLayout>
  );
};

export default CreateSkillPage;
