import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import CustomizeItemPage from './list';

const ShopPage = () => {
  return (
    <MainLayout
      title={pageRouters.CUSTOMIZE_ITEM.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-8 pt-8 !overflow-x-auto"
      showFooter={false}>
      <CustomizeItemPage />
    </MainLayout>
  );
};

export default ShopPage;
