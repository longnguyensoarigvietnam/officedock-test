'use client';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import Input from '@components/common/Input';

import api from '@base/api';

import { CreateUserFormRequest } from '@interfaces/user';

import {
  ERROR_CREATE_MESSAGE,
  FIELD_MAX_LENGTH_255_MESSAGE,
  NAME_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { useErrorToast } from '@hooks/useErrorToast';

import { emailRules } from '@utils/validators';
import { getErrorMessage, handleServerFormErrors } from '@utils';

const CreateUserForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormRequest>({
    mode: 'onSubmit',
  });

  const handleCreateUser = async (data: CreateUserFormRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.USER_LIST, data);
  };

  const { mutate: createUser } = useMutation(
    'postCreateUser',
    handleCreateUser,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        router.push(pageRouters.USERS_MANAGEMENT.href);
      },
      onError: (error: any) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);

        handleServerFormErrors<CreateUserFormRequest>(error, setError);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateUserFormRequest> = (data) => {
    createUser({
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
            register={register('email', emailRules(true))}
          />
        </div>

        <div className="w-full flex items-center gap-4 mt-8 flex-col">
          <Button className="w-[426px]" type="submit">
            作成
          </Button>
          <Button
            className="w-[426px]"
            variant="secondary"
            type="button"
            onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
