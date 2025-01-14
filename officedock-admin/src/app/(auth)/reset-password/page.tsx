import { Suspense } from 'react';

import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import ResetPasswordForm from './form';
import { pageRouters } from '@constants/routers';

const ResetPasswordPage = () => {
  return (
    <AuthenticationLayout title={pageRouters.RESET_PASSWORD.name}>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthenticationLayout>
  );
};

export default ResetPasswordPage;
