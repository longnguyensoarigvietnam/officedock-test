'use client';
import { useContext, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { SubmitHandler, useForm } from 'react-hook-form';
import { signOut } from 'next-auth/react';

import Input from '@components/common/Input';
import Button from '@components/common/Button';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ERROR_UPDATE_MESSAGE,
  PASSWORD_NOT_MATCHED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  TOKEN_INVALID,
} from '@constants/message';
import { VerifyTokenType } from '@constants/enums';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import api from '@base/api';
import { ResponseError } from '@interfaces/response';
import { passwordRegisterRules } from '@utils/validators';

const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<{ password: string; confirmPassword: string }>();

  // Verify valid token
  const handleVerifyRequest = async (data: {
    token: string;
    verifyType: string;
  }) => {
    setIsLoading(true);
    return await api.post(apiRouters.VERIFY_TOKEN, data);
  };

  const { mutate: verifyToken } = useMutation(
    'postVerifyToken',
    handleVerifyRequest,
    {
      onSuccess: async (response) => {
        signOut({ redirect: false });
        return response;
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: TOKEN_INVALID,
        });
        router.push(pageRouters.LOGIN.href);
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
        verifyType: VerifyTokenType.RESET_PASSWORD,
      });
      return;
    }
    router.push(pageRouters.LOGIN.href);
  }, [router, token, verifyToken]);

  // Tow function validate matching password and confirm password
  const handlePasswordChange = (event: any) => {
    if (watch('confirmPassword')) {
      setError('confirmPassword', {
        type: 'validate',
        message:
          event.target.value == watch('confirmPassword')
            ? ''
            : PASSWORD_NOT_MATCHED_MESSAGE,
      });
      trigger('confirmPassword');
    }
  };
  const handleConfirmPasswordChange = (event: any) => {
    if (watch('password')) {
      setError('confirmPassword', {
        type: 'validate',
        message:
          event.target.value == watch('password')
            ? ''
            : PASSWORD_NOT_MATCHED_MESSAGE,
      });
      trigger('confirmPassword');
    }
  };

  // Function handle call API reset password
  const handleResetPassword = async (data: {
    password: string;
    token: string;
  }) => {
    setIsLoading(true);
    return await api.post(apiRouters.RESET_PASSWORD, data);
  };

  const { mutate: resetPassword } = useMutation(
    'postResetPassword',
    handleResetPassword,
    {
      onSuccess: async () => {
        setValue('password', '');
        setValue('confirmPassword', '');
        showToast({
          variant: 'success',
          description: SUCCESS_UPDATE_MESSAGE,
        });

        router.push(pageRouters.LOGIN.href);
      },
      onError: ({
        response,
      }: ResponseError<{ password: string; token: string }>) => {
        if (response?.data?.password) {
          setError('password', { message: response.data.password[0] });
          return;
        }

        showToast({
          variant: 'error',
          description: response?.data?.token[0] || ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<{ password: string }> = (data) => {
    setIsLoading(true);
    token && resetPassword({ password: data.password, token: token });
  };
  return (
    <div className="w-[500px] bg-gray-50 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">
          {pageRouters.RESET_PASSWORD.name}
        </h1>
      </div>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Input
            label="パスワード"
            placeholder="パスワードを入力"
            type="password"
            name="user.password"
            error={errors.password?.message}
            register={register('password', {
              ...passwordRegisterRules(true),
              onChange: (event) => {
                handlePasswordChange(event);
              },
              validate: (value) => {
                const confirmPassword = watch('confirmPassword');
                return value === confirmPassword;
              },
            })}
          />
          <Input
            label="パスワード "
            requireText="(確認のためもう一度入力お願いします)"
            type="password"
            placeholder="パスワードを入力"
            labelClassName="[&>span]:!text-gray-700"
            name="user.confirmPassword"
            error={errors.confirmPassword?.message}
            register={register('confirmPassword', {
              ...passwordRegisterRules(true),
              validate: (value) => {
                const newPassword = watch('password');
                return value === newPassword || PASSWORD_NOT_MATCHED_MESSAGE;
              },
              onChange: (event) => {
                handleConfirmPasswordChange(event);
              },
            })}
          />
        </div>

        <div className="flex flex-col w-full gap-2">
          <Button type="submit">送信</Button>
          <Link href={pageRouters.LOGIN.href} className="w-full">
            <Button variant="secondary" className="w-full">
              ログイン画面に戻る
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
