'use client';
import { useContext, useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_LOGIN_MESSAGE,
  USER_NAME_REQUIRED_MESSAGE,
} from '@constants/message';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { passwordLoginRules } from '@utils/validators';
import api from '@base/api';
import { ServerStatusCode } from '@constants/enums';
import { hasFullPaymentPermissions } from '@utils';

type LoginFormInputs = {
  username: string;
  password: string;
  rememberMe: boolean;
};

const LoginForm = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback');

  const { showToast } = useToast();
  const [isRememberMe, setIsRememberMe] = useState(false);
  const [isSubmit, setIsSubmit] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    mode: 'onSubmit',
  });
  // We call login
  const { mutate: loginUser } = useMutation(
    (data: LoginFormInputs) =>
      signIn('credentials', {
        ...data,
        rememberMe: isRememberMe,
        redirect: false,
      }),
    {
      onSuccess: async (data) => {
        if (data?.status === ServerStatusCode.OK) {
          const session = await getSession();
          if (callback) {
            const { data: me } = await api.get(
              `${apiRouters.LOGIN_EXCHANGE}?callback=${callback}&is_login=true`,
              {
                headers: {
                  Authorization: `Bearer ${session?.accessToken}`,
                },
              },
            );
            if (me.exchangeUrl) {
              router.push(me.exchangeUrl);
            }
          } else {
            if (
              session &&
              hasFullPaymentPermissions(session.user.permissions)
            ) {
              router.push(pageRouters.PAYMENT_MANAGEMENT.href);
            } else {
              router.push(pageRouters.MY_PAGE.href);
            }
          }
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  // Handle call API login (email and password)
  const userLoginCheckRequest = async (data: LoginFormInputs): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.CHECK_LOGIN, data);
  };

  const { mutate: userLogin } = useMutation(
    'postUserCheckLogin',
    userLoginCheckRequest,
    {
      onSuccess: async (response, data) => {
        const { is2fa } = response.data;
        if (!is2fa) {
          loginUser({
            username: data.username,
            password: data.password,
            rememberMe: data.rememberMe,
          });
        } else {
          setIsLoading(false);
          const queryString = new URLSearchParams(response.data).toString();
          const url = `${pageRouters.LOGIN_2FA.href}?${queryString}&rememberMe=${isRememberMe}`;
          router.push(url);
        }
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_LOGIN_MESSAGE,
        });
        setIsLoading(false);
        setIsSubmit(false);
      },
    },
  );

  const onSubmit: SubmitHandler<LoginFormInputs> = (data) => {
    if (isSubmit) return;
    setIsSubmit(true);
    setIsLoading(true);
    userLogin(data);
  };

  return (
    <div className="w-[500px] p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">ログイン</h1>
      </div>
      <form
        className="flex flex-col gap-6"
        onSubmit={handleSubmit(onSubmit)}
        method="POST">
        <div className="flex flex-col gap-2">
          <Input
            label="ID｜メールアドレス"
            placeholder="入力してください"
            error={errors.username?.message}
            className="!border-[#77858F]"
            labelClassName="!text-[#77858F]"
            autoCompleteInput
            register={register('username', {
              required: USER_NAME_REQUIRED_MESSAGE,
            })}
          />
          <Input
            type="password"
            label="パスワード"
            autoCompleteInput
            error={errors.password?.message}
            className="!border-[#77858F]"
            labelClassName="!text-[#77858F]"
            register={register('password', passwordLoginRules(true))}
            placeholder="入力してください"
          />
        </div>
        <Checkbox
          id="rememberLogin"
          label="ログイン状態を30日間維持する"
          onChange={(state) => setIsRememberMe(state)}
        />
        <Button type="submit">ログイン</Button>
      </form>
      <div>
        <Link
          href={pageRouters.FORGOT_PASSWORD.href}
          className="!text-primary font-medium flex items-center gap-1">
          <p>パスワードを忘れた方はこちら</p>
          <ImageRound
            name="Filter extend icon"
            src={'/icons/chevron-right-blue.svg'}
            className={`w-[8px] h-3 hover:cursor-pointer mt-0.5`}
          />
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
