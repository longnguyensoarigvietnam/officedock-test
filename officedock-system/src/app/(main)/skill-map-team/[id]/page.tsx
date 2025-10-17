import MainLayout from '@components/layouts/MainLayout';
import BoardSkillUser from './board';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const SkillMapTeamDetailPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP_TEAM_DETAIL.name}
      showFooter={false}
      className="!px-0 !py-0"
      permission={PermissionsSystem.TEAM_DOCK_SKILL_MAP_VIEW}>
      <BoardSkillUser />
    </MainLayout>
  );
};

export default SkillMapTeamDetailPage;
