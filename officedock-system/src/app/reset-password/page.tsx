import ResetPasswordForm from './form';
import { pageRouters } from '@constants/routers';
import Metadata from '@components/common/Metadata';
import Footer from '@components/layouts/Footer';

const ResetPasswordPage = () => {
  return (
    <>
      <Metadata metadata={pageRouters.RESET_PASSWORD.name} />
      <div
        className={`relative min-h-screen flex flex-col justify-center items-center gap-5`}>
        <main
          className={`flex-grow flex flex-col justify-center items-center gap-10`}>
          <ResetPasswordForm />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ResetPasswordPage;
