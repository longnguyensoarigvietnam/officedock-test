'use client';
import React, { useContext } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import Heading from '@components/common/Heading';
import Input from '@components/common/Input';

import { passwordLoginRules, passwordRegisterRules } from '@utils/validators';
import {
  ERROR_UPDATE_MESSAGE,
  PASSWORD_NOT_MATCHED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters } from '@constants/routers';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { ResponseError } from '@interfaces/response';

import api from '@base/api';

interface ChangePasswordFormType {
  password: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordForm = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const router = useRouter();

  const { showToast } = useToast();

  const {
    register,
    watch,
    reset,
    trigger,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormType>({
    mode: 'onSubmit',
  });

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
    if (watch('newPassword')) {
      setError('confirmPassword', {
        type: 'validate',
        message:
          event.target.value == watch('newPassword')
            ? ''
            : PASSWORD_NOT_MATCHED_MESSAGE,
      });
      trigger('confirmPassword');
    }
  };
  // Function handle call API change password
  const handleChangePassword = async (data: ChangePasswordFormType) => {
    setIsLoading(true);
    return await api.post(apiRouters.CHANGE_PASSWORD, data);
  };
  const { mutate: changePassword } = useMutation(
    'postChangePassword',
    handleChangePassword,
    {
      onSuccess: async () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        reset();
        showToast({
          variant: 'success',
          description: SUCCESS_UPDATE_MESSAGE,
        });
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
          description: ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  const onSubmit: SubmitHandler<ChangePasswordFormType> = (data) => {
    changePassword(data);
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col items-center">
        <Heading className="text-center mt-10" as="h1" sz="2xl">
          パスワード変更
        </Heading>
        <div className="w-[420px] flex flex-col gap-7 mt-10">
          <div className="flex flex-col gap-4 w-full">
            <Input
              type="password"
              label="現在のパスワード"
              placeholder="現在のパスワード"
              error={errors.password?.message}
              register={register('password', passwordLoginRules(true))}
            />
            <Input
              type="password"
              label="新しいパスワード"
              placeholder="新しいパスワード"
              error={errors.newPassword?.message}
              register={register('newPassword', {
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
              type="password"
              label="確認パスワード"
              placeholder="確認パスワード"
              error={errors.confirmPassword?.message}
              register={register('confirmPassword', {
                ...passwordRegisterRules(true),
                validate: (value) => {
                  const newPassword = watch('newPassword');
                  return value === newPassword || PASSWORD_NOT_MATCHED_MESSAGE;
                },
                onChange: (event) => {
                  handleConfirmPasswordChange(event);
                },
              })}
            />
          </div>
          <div className="w-full flex flex-col gap-2">
            <Button type="submit">保存</Button>
            <Button
              variant="outline"
              type="button"
              className="!text-gray-500 !border-gray-200 gap-1 !py-2"
              onClick={() => router.back()}>
              戻る
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
