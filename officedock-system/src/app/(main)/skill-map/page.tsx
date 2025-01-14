import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import SkillMap from './map';

const SkillsPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP.name}
      showFooter={false}
      permission={PermissionsSystem.VIEW_ALL}>
      <div className="flex flex-col gap-6">
        <SkillMap />
      </div>
    </MainLayout>
  );
};

export default SkillsPage;
