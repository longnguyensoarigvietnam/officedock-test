import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import HistoryListPage from './list';

const PointHistoryPage = () => {
  return (
    <MainLayout
      title={pageRouters.HISTORY_POINT.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-[41px] pt-6 !overflow-x-auto"
      showFooter={false}>
      <HistoryListPage />
    </MainLayout>
  );
};

export default PointHistoryPage;
