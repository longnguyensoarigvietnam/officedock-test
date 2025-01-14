import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import EditSkillForm from './form';
import { PermissionsSystem } from '@constants/enums';

const DetailOrganizationPage = () => {
  return (
    <MainLayout
      title={pageRouters.EDIT_SKILLS.name}
      permission={PermissionsSystem.SKILL_UPDATE}>
      <div className="flex flex-col gap-6 h-full">
        <EditSkillForm />
      </div>
    </MainLayout>
  );
};

export default DetailOrganizationPage;
