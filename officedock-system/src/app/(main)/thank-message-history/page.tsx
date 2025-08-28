import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import ThankMsgHistoryList from './list';

const ThankMsgHistoryPage = () => {
  return (
    <MainLayout
      title={pageRouters.THANK_MESSAGE_MANAGEMENT.name}
      className="bg-[#EBF1F7] !px-10 !py-[30px]"
      permission={PermissionsSystem.THANKS_MESSAGE_MANAGEMENT_VIEW}>
      <ThankMsgHistoryList />
    </MainLayout>
  );
};

export default ThankMsgHistoryPage;
