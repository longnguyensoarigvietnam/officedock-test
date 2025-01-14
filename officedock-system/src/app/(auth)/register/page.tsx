import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import RegisterForm from './form';
import { pageRouters } from '@constants/routers';

export default function RegisterPage() {
  return (
    <AuthenticationLayout title={pageRouters.REGISTER.name}>
      <RegisterForm />
    </AuthenticationLayout>
  );
}
