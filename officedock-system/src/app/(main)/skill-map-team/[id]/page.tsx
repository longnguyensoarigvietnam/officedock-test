import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import BoardSkillUser from './board';

const SkillMapTeamDetailPage = () => {
  return (
    <MainLayout
      title={pageRouters.SKILL_MAP_TEAM_DETAIL.name}
      showFooter={false}
      className="!px-0 !py-0"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <BoardSkillUser />
    </MainLayout>
  );
};

export default SkillMapTeamDetailPage;
