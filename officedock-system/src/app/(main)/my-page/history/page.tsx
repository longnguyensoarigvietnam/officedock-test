import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import HistoryListPage from './list';

const ShopPage = () => {
  return (
    <MainLayout
      title={pageRouters.HISTORY_POINT.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-8 pt-8 !overflow-x-auto"
      showFooter={false}>
      <HistoryListPage />
    </MainLayout>
  );
};

export default ShopPage;
