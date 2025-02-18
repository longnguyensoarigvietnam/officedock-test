import MainLayout from '@components/layouts/MainLayout';
import ListMember from './list';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const ResetPasswordPage = () => {
  return (
    <MainLayout
      title={pageRouters.MEMBER_MANAGEMENT.name}
      permission={PermissionsSystem.VIEW_ALL}>
      <ListMember />
    </MainLayout>
  );
};

export default ResetPasswordPage;
