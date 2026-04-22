import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import MemberList from './member-list';

const SkillMapTeamPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP_TEAM.name}
      showFooter={false}
      className="px-0 !pt-0"
      permission={PermissionsSystem.TEAM_DOCK_SKILL_MAP_VIEW}>
      <MemberList />
    </MainLayout>
  );
};

export default SkillMapTeamPage;
