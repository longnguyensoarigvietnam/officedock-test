import MainLayout from '@components/layouts/MainLayout';
import SkillDetail from './detail';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const SkillDetailPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_SKILLS.name}
      permission={PermissionsSystem.SKILL_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <SkillDetail />
      </div>
    </MainLayout>
  );
};

export default SkillDetailPage;
