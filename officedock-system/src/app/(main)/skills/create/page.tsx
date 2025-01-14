import MainLayout from '@components/layouts/MainLayout';
import CreateSkillForm from './form';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const CreateSkillsPage = () => {
  return (
    <MainLayout
      title={pageRouters.CREATE_SKILLS.name}
      permission={PermissionsSystem.SKILL_ADD}>
      <div className="flex flex-col gap-6 h-full">
        <CreateSkillForm />
      </div>
    </MainLayout>
  );
};

export default CreateSkillsPage;
