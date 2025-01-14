import MainLayout from '@components/layouts/MainLayout';
import ChangePasswordForm from './ChangePasswordForm';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem } from '@constants/enums';

const ResetPasswordPage = () => {
  return (
    <MainLayout
      title={pageRouters.CHANGE_PASSWORD.name}
      permission={PermissionsSystem.VIEW_ALL}>
      <ChangePasswordForm />
    </MainLayout>
  );
};

export default ResetPasswordPage;
