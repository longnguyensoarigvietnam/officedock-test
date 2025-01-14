import AuthenticationLayout from '@components/layouts/AuthenticationLayout';

import LoginForm from './form';
import { pageRouters } from '@constants/routers';

export default function LoginPage() {
  return (
    <AuthenticationLayout title={pageRouters.LOGIN.name}>
      <LoginForm />
    </AuthenticationLayout>
  );
}
