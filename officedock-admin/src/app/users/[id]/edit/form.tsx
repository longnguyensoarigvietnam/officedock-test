'use client';
import { useContext, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Input from '@components/common/Input';

import api from '@base/api';

import { CreateUserFormRequest } from '@interfaces/user';

import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  FIELD_MAX_LENGTH_255_MESSAGE,
  NAME_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { emailRules } from '@utils/validators';
import { getErrorMessage, handleServerFormErrors } from '@utils';

import useDetailUser from '@hooks/useDetailUser';
import { useErrorToast } from '@hooks/useErrorToast';

const EditUserForm = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const { userDetail } = useDetailUser({
    userId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.USERS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  const {
    register,
    reset,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormRequest>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<CreateUserFormRequest>(() => {
    const value: CreateUserFormRequest = {
      profile: {
        fullName: '',
      },
      email: '',
    };

    if (userDetail) {
      value.profile.fullName = userDetail.profile?.fullName || '';
      value.email = userDetail.email;
    }

    return value;
  }, [userDetail]);

  // Update default value
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Handle submit edit user
  const handleEditUser = async (data: CreateUserFormRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.USER_DETAIL(params.id), data);
  };

  const { mutate: editUser } = useMutation('postEditUser', handleEditUser, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      router.push(pageRouters.USERS_MANAGEMENT.href);
    },
    onError: (error: any) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);

      handleServerFormErrors<CreateUserFormRequest>(error, setError);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit: SubmitHandler<CreateUserFormRequest> = (data) => {
    editUser({
      email: data.email,
      profile: {
        fullName: data.profile.fullName,
      },
    });
  };
  return (
    <div className="flex flex-col gap-6">
      <form
        className="w-full flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="w-1/2 flex flex-col gap-4">
          <Input
            label="名前"
            required
            placeholder="入力してください"
            error={getErrorMessage(errors, 'profile.fullName')}
            register={register('profile.fullName', {
              required: NAME_REQUIRED_MESSAGE,
              maxLength: {
                value: 255,
                message: FIELD_MAX_LENGTH_255_MESSAGE,
              },
            })}
          />
          <Input
            label="メールアドレス"
            required
            placeholder="入力してください"
            error={getErrorMessage(errors, 'email')}
            disabled
            register={register('email', emailRules(true))}
          />
        </div>
        <div className="w-full flex items-center gap-4 mt-8 flex-col">
          <Button type="submit" className="w-[426px]">
            編集
          </Button>
          <Button
            variant="secondary"
            type="button"
            className="w-[426px]"
            onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditUserForm;
