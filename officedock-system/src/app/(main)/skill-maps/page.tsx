import MainLayout from '@components/layouts/MainLayout';
import ListSkillsMap from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const SkillsMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAPS_MANAGEMENT.name}
      permission={PermissionsSystem.SKILL_MAP_MANAGEMENT_VIEW}
      className="px-0 !pt-0 !overflow-x-auto !bg-[#EBF1F7]"
      showFooter={false}>
      <ListSkillsMap />
    </MainLayout>
  );
};

export default SkillsMapPage;
