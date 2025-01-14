import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import SubmitLevelDetail from './detail';
import { PermissionsSystem } from '@constants/enums';

const SubmitLevelDetailPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_SUBMIT_LEVELS.name}
      permission={PermissionsSystem.SUBMIT_LEVEL_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <SubmitLevelDetail />
      </div>
    </MainLayout>
  );
};

export default SubmitLevelDetailPage;
