'use client';
import { useContext, useEffect } from 'react';
import { useMutation } from 'react-query';
import { signIn } from 'next-auth/react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';

import Input from '@components/common/Input';
import Button from '@components/common/Button';

import api from '@base/api';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  INVALID_TOKEN_MESSAGE,
  OTP_CODE_INVALID,
  OTP_CODE_REQUIRED_MESSAGE,
} from '@constants/message';
import { ServerStatusCode } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { handlePreventInputText, handleRemoveText } from '@utils/validators';

type LoginFormInputs = {
  token: string;
  otpCode?: number;
  rememberMe?: boolean;
};

const LoginForm2FA = () => {
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    setError,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  // TODO: Update type data response
  // Handle verify login request
  const loginVerifyRequest = async (data: LoginFormInputs): Promise<any> => {
    setIsLoading(true);
    return await api.post(apiRouters.VERIFY_TOKEN, data);
  };
  // Verify token
  const { mutate: verifyToken } = useMutation(
    'postVerifyTokenLogin',
    loginVerifyRequest,
    {
      onSuccess: async () => {},
      onError: () => {
        showToast({
          variant: 'error',
          description: INVALID_TOKEN_MESSAGE,
        });
        router.push(pageRouters.LOGIN.href);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // This step to verify login before using next auth
  const { mutate: loginVerify } = useMutation(
    'postLoginVerify',
    loginVerifyRequest,
    {
      onSuccess: async () => {
        loginOtp({
          token: token as string,
          otpCode: getValues('otpCode'),
          rememberMe: false,
        });
      },
      onError: () => {
        setError('otpCode', { message: OTP_CODE_INVALID });
        setIsLoading(false);
      },
      onSettled: () => {},
    },
  );

  // We call this one after verification successfully
  const { mutate: loginOtp } = useMutation(
    (data: LoginFormInputs) =>
      signIn('credentials', { ...data, redirect: false }),
    {
      onSuccess: (data) => {
        if (data?.status === ServerStatusCode.OK) {
          router.push(pageRouters.COMPANY_MANAGEMENT.href);
          return;
        }
        setError('otpCode', { message: OTP_CODE_INVALID });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  useEffect(() => {
    if (token) {
      verifyToken({
        token: token,
      });
    } else {
      router.push(pageRouters.LOGIN.href);
    }
  }, [router, token, verifyToken]);

  const onSubmit: SubmitHandler<LoginFormInputs> = (data) => {
    setIsLoading(true);
    loginVerify({
      ...data,
      token: token as string,
    });
  };
  return (
    <div className="w-[500px] bg-gray-50 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">ログイン</h1>
      </div>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Input
            type="text"
            placeholder="入力してください"
            label="認証コード"
            name="otpCode"
            maxLength={6}
            onKeyDown={(e) => handlePreventInputText(e)}
            onInput={(e) => handleRemoveText(e)}
            onPaste={(e) => handleRemoveText(e)}
            error={errors.otpCode?.message}
            register={register('otpCode', {
              required: OTP_CODE_REQUIRED_MESSAGE,
            })}
            autoFocus={true}
          />
        </div>
        <Button type="submit">送信</Button>
      </form>
    </div>
  );
};

export default LoginForm2FA;
