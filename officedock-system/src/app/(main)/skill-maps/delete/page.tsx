import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import ListSkillsMapDelete from './list';

const SkillsMapPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAPS_HIDDEN_MANAGEMENT.name}
      permission={PermissionsSystem.SKILL_MAP_MANAGEMENT_VIEW}
      className="px-0 !pt-0 !bg-[#F3F3F3] !overflow-x-auto"
      showFooter={false}>
      <ListSkillsMapDelete />
    </MainLayout>
  );
};

export default SkillsMapPage;
