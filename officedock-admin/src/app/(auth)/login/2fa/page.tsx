import { Suspense } from 'react';

import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import { pageRouters } from '@constants/routers';
import LoginForm2FA from './form';

const page = () => {
  return (
    <AuthenticationLayout title={pageRouters.LOGIN.name}>
      <Suspense>
        <LoginForm2FA />
      </Suspense>
    </AuthenticationLayout>
  );
};
export default page;
