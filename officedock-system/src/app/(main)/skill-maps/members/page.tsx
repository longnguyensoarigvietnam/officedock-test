import MainLayout from '@components/layouts/MainLayout';

import ListSkillsMapByMembers from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const SkillMapByMemberPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAPS_MEMBERS_MANAGEMENT.name}
      permission={PermissionsSystem.SKILL_MAP_MANAGEMENT_VIEW}
      className="px-0 !pt-0 !overflow-x-auto"
      showFooter={false}>
      <ListSkillsMapByMembers />
    </MainLayout>
  );
};

export default SkillMapByMemberPage;
