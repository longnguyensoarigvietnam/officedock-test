'use client';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';

import Input from '@components/common/Input';

import api from '@base/api';
import { CreateUserFormData, CreateUserFormRequest } from '@interfaces/user';

import {
  ERROR_CREATE_MESSAGE,
  NAME_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { emailRules } from '@utils/validators';

const CreateUserForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserFormData>({
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
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_CREATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateUserFormData> = (data) => {
    createUser({
      email: data.email,
      profile: {
        fullName: data.name,
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
            error={errors?.name?.message}
            register={register('name', {
              required: NAME_REQUIRED_MESSAGE,
            })}
          />
          <Input
            label="メールアドレス"
            required
            placeholder="入力してください"
            error={errors?.email?.message}
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
