import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import FillInfoRegisterForm from './form';
import { pageRouters } from '@constants/routers';

const FillInfoRegisterPage = () => {
  return (
    <AuthenticationLayout title={pageRouters.FILL_INFO_REGISTER.name}>
      <FillInfoRegisterForm />
    </AuthenticationLayout>
  );
};

export default FillInfoRegisterPage;
