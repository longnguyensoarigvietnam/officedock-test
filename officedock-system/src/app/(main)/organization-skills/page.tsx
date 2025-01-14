import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListOrganizationSkills from './list';
import { PermissionsSystem } from '@constants/enums';

const SkillsMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.ORGANIZATION_SKILLS_MANAGEMENT.name}
      permission={PermissionsSystem.ORGANIZATION_SKILL_VIEW}>
      <div className="flex flex-col gap-6">
        <ListOrganizationSkills />
      </div>
    </MainLayout>
  );
};

export default SkillsMapPage;
