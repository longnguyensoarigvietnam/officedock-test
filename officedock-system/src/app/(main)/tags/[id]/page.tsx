import MainLayout from '@components/layouts/MainLayout';
import TagDetail from './detail';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const DetailTagPage = () => {
  return (
    <MainLayout
      title={pageRouters.DETAIL_TAG.name}
      permission={PermissionsSystem.TAG_VIEW}>
      <div className="flex flex-col gap-6 h-full">
        <TagDetail />
      </div>
    </MainLayout>
  );
};

export default DetailTagPage;
