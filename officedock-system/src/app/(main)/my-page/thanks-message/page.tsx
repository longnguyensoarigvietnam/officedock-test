import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import ThanksMessageListPage from './list';

const ThanksMessagePage = () => {
  return (
    <MainLayout
      title={pageRouters.THANKS_MESSAGE.name}
      permission={PermissionsSystem.VIEW_ALL}
      className="pl-[41px] pt-6 !overflow-x-auto"
      showFooter={false}>
      <ThanksMessageListPage />
    </MainLayout>
  );
};

export default ThanksMessagePage;
