'use client';
import { useContext } from 'react';
import { useMutation } from 'react-query';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import Input from '@components/common/Input';
import Button from '@components/common/Button';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { apiRouters, pageRouters } from '@constants/routers';
import { ERROR_LOGIN_MESSAGE } from '@constants/message';

import { emailRules, passwordLoginRules } from '@utils/validators';
import api from '@base/api';

type LoginFormInputs = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const LoginForm = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    mode: 'onSubmit',
  });

  // Handle call API login (email and password)
  const userLoginRequest = async (data: LoginFormInputs): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.LOGIN, data);
  };

  const { mutate: userLogin } = useMutation('postUserLogin', userLoginRequest, {
    onSuccess: async (response) => {
      const queryString = new URLSearchParams(response.data).toString();
      const url = `${pageRouters.LOGIN_2FA.href}?${queryString}`;
      router.push(url);
    },
    onError: () => {
      showToast({
        variant: 'error',
        description: ERROR_LOGIN_MESSAGE,
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = (data) => {
    setIsLoading(true);
    userLogin(data);
  };

  return (
    <div className="w-[500px] bg-gray-50 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">ログイン</h1>
      </div>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Input
            label="メールアドレス"
            placeholder="入力してください"
            error={errors.email?.message}
            register={register('email', emailRules(true))}
          />
          <Input
            type="password"
            label="パスワード"
            placeholder="入力してください"
            error={errors.password?.message}
            register={register('password', passwordLoginRules(true))}
          />
        </div>
        <Button type="submit">ログイン</Button>
      </form>
      <div className="flex flex-col justify-center items-center gap-2">
        <div className="flex items-center text-gray-500">
          <p>パスワードを忘れた方は</p>
          <Link
            href={pageRouters.FORGOT_PASSWORD.href}
            className="text-primary underline">
            こちら
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
