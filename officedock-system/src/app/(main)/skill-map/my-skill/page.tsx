import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import MySkill from './skill';

const SkillsPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP_SKILL.name}
      showFooter={false}
      className="!px-0 !py-0"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <MySkill />
    </MainLayout>
  );
};

export default SkillsPage;
