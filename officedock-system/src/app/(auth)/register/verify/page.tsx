import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import VerifyRegisterPage from './form';

import { pageRouters } from '@constants/routers';

const VerifyEmailRegister = () => {
  return (
    <AuthenticationLayout title={pageRouters.VERIFY_REGISTER.name}>
      <VerifyRegisterPage />
    </AuthenticationLayout>
  );
};

export default VerifyEmailRegister;
