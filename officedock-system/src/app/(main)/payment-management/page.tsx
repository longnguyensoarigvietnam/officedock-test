import MainLayout from '@components/layouts/MainLayout';

import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

import PaymentDetail from './detail';

const PaymentPage = () => {
  return (
    <>
      <MainLayout
        title={pageRouters.PAYMENT_MANAGEMENT.name}
        permission={PermissionsSystem.PAYMENT_MANAGEMENT_VIEW}
        className="px-10 py-[30px] !overflow-x-auto"
        showFooter={false}>
        <PaymentDetail />
      </MainLayout>
    </>
  );
};

export default PaymentPage;
