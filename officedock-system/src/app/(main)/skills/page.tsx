import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListSkills from './list';
import { PermissionsSystem } from '@constants/enums';

const SkillsPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILLS_MANAGEMENT.name}
      permission={PermissionsSystem.SKILL_VIEW}>
      <div className="flex flex-col gap-6">
        <ListSkills />
      </div>
    </MainLayout>
  );
};

export default SkillsPage;
