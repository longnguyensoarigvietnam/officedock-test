import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import { pageRouters } from '@constants/routers';
import LoginForm2FA from './form';

const Login2FAPage = () => {
  return (
    <AuthenticationLayout title={pageRouters.LOGIN.name}>
      <LoginForm2FA />
    </AuthenticationLayout>
  );
};
export default Login2FAPage;
