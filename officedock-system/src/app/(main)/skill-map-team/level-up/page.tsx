import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import LevelUpList from './list';

const LevelUpPage = () => {
  return (
    <MainLayout
      title={pageRouters.LEVEL_UP_TEAM.name}
      showFooter={false}
      className="px-0 !pt-0"
      permission={PermissionsSystem.SKILL_MAP_VIEW}>
      <LevelUpList />
    </MainLayout>
  );
};

export default LevelUpPage;
