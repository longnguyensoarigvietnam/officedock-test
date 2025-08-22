import MainLayout from '@components/layouts/MainLayout';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';
import ThankMsgHistoryList from './list';

const ThankMsgHistoryPage = () => {
  return (
    <MainLayout
      title={pageRouters.MEMBER_MANAGEMENT.name}
      className="bg-[#EBF1F7] !px-10 !py-[30px]"
      permission={PermissionsSystem.VIEW_ALL}>
      <ThankMsgHistoryList />
    </MainLayout>
  );
};

export default ThankMsgHistoryPage;
