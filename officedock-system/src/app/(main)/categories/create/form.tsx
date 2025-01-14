'use client';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Input from '@components/common/Input';

import {
  CATEGORY_NAME_REQUIRED_MESSAGE,
  ERROR_CREATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import {
  CreateCategoryFormData,
  CreateCategoryFormRequest,
} from '@interfaces/category';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const CreateCategoryForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [isSubmit, setIsSubmit] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCategoryFormData>({
    mode: 'onSubmit',
  });

  // Function call API create Category
  const handleCreateCategory = async (data: CreateCategoryFormRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.CATEGORY_LIST, data);
  };

  const { mutate: createCategory } = useMutation(
    'postCreateCategory',
    handleCreateCategory,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        router.push(pageRouters.CATEGORY_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
        setIsSubmit(false);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateCategoryFormData> = (data) => {
    if (!isSubmit) {
      setIsSubmit(true);
      createCategory(data);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        className="w-full flex flex-col h-full justify-between gap-4 mb-3"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-1/2">
          <Input
            label="カテゴリ名"
            required
            placeholder="入力してください"
            error={errors?.name?.message}
            register={register('name', {
              required: CATEGORY_NAME_REQUIRED_MESSAGE,
            })}
          />
        </div>
        <div className="w-full flex items-center gap-2 mt-8 flex-col">
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

export default CreateCategoryForm;
