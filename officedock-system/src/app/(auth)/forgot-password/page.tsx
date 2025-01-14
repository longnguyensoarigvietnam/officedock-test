import AuthenticationLayout from '@components/layouts/AuthenticationLayout';
import ForgotPasswordForm from './form';
import { pageRouters } from '@constants/routers';

const ForgotPasswordPage = () => {
  return (
    <AuthenticationLayout title={pageRouters.FORGOT_PASSWORD.name}>
      <div className="w-[550px] bg-gray-50 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold">
            {pageRouters.FORGOT_PASSWORD.name}
          </h1>
          <div className="flex flex-col text-sm text-center">
            <p>
              ご登録のメールアドレスを入力して
              <span className="text-primary">「送信」</span>
              のボタンをクリックして下さい。
            </p>
            <p>パスワード再設定用のメールを送信致します。</p>
            <p>メールの内容をご確認の上、新しいパスワードを設定して下さい。</p>
          </div>
        </div>
        <ForgotPasswordForm />
      </div>
    </AuthenticationLayout>
  );
};

export default ForgotPasswordPage;
