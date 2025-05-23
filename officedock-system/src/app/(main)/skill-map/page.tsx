import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import SkillMap from './map';

const SkillsPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP.name}
      showFooter={false}
      className="!px-0 !py-0"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <SkillMap />
    </MainLayout>
  );
};

export default SkillsPage;
