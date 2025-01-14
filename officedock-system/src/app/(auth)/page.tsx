import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import { pageRouters } from '@constants/routers';
import LoginForm from './form';

export default function LoginPage() {
  return (
    <AuthenticationLayout title={pageRouters.LOGIN.name}>
      <LoginForm />
    </AuthenticationLayout>
  );
}
