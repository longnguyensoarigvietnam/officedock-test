import MainLayout from '@components/layouts/MainLayout';
import ShopItemPage from './list';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const ShopPage = () => {
  return (
    <MainLayout
      title={pageRouters.SHOP_ITEM.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-8 pt-8 !overflow-x-auto"
      showFooter={false}>
      <ShopItemPage />
    </MainLayout>
  );
};

export default ShopPage;
