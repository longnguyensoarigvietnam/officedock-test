import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import ListSkillsMap from './list';
import { PermissionsSystem } from '@constants/enums';

const SkillsMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAPS_MANAGEMENT.name}
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <div className="flex flex-col gap-6">
        <ListSkillsMap />
      </div>
    </MainLayout>
  );
};

export default SkillsMapPage;
