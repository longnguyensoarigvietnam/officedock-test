'use client';
import { useContext } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';

import api from '@base/api';
import { apiRouters } from '@constants/routers';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import { emailRules } from '@utils/validators';
import { SUCCESS_SENT_MAIL_MESSAGE } from '@constants/message';

const ForgotPasswordForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ email: string }>();

  // Function handle call API send mail forgot password
  const handleForgotPassword = async (data: { email: string }) => {
    setIsLoading(true);
    return await api.post(apiRouters.FORGOT_PASSWORD, data);
  };

  const { mutate: forgotPassword } = useMutation(
    'postForgotPassword',
    handleForgotPassword,
    {
      onSettled: () => {
        showToast({
          description: SUCCESS_SENT_MAIL_MESSAGE,
        });
        setValue('email', '');
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<{ email: string }> = (data) => {
    setIsLoading(true);
    forgotPassword(data);
  };
  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Input
          label="メールアドレス"
          placeholder="入力してください"
          autoFocus={true}
          register={register('email', emailRules(true))}
          error={errors.email?.message}
        />
      </div>

      <div className="flex flex-col w-full gap-2">
        <Button type="submit">送信</Button>
        <Button variant="secondary" type="button" onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
