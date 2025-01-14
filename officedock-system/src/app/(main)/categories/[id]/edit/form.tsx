'use client';
import { useContext, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Input from '@components/common/Input';

import {
  ERROR_COMMON_MESSAGE,
  CATEGORY_NAME_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import useCategoryDetail from '@hooks/useCategoryDetail';
import { LoadingContext } from '@providers/LoadingProvider';
import { CategoryStateContext } from '@providers/CategoryProvider';
import { useToast } from '@providers/ToastProvider';
import { CreateCategoryFormData } from '@interfaces/category';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const EditCategoryForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { setIsLoading } = useContext(LoadingContext);
  const { dataCategoryDetail, setDataCategoryDetail } =
    useContext(CategoryStateContext);

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const { categoryDetail } = useCategoryDetail({
    categoryId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.CATEGORY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  const {
    reset,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCategoryFormData>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<CreateCategoryFormData>(() => {
    const value: CreateCategoryFormData = {
      name: '',
    };

    if (dataCategoryDetail) {
      value.name = dataCategoryDetail.name;
    }

    return value;
  }, [dataCategoryDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (categoryDetail) {
      setDataCategoryDetail(categoryDetail);
    }
  }, [setDataCategoryDetail, categoryDetail]);

  useEffect(() => {
    if (!dataCategoryDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataCategoryDetail]);

  //  Function call API edit Category
  const handleEditCategory = async (data: CreateCategoryFormData) => {
    setIsLoading(true);
    return await api.patch(apiRouters.CATEGORY_DETAIL(params.id), data);
  };

  const { mutate: editCategory } = useMutation(
    'postEditCategory',
    handleEditCategory,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        reset();
        router.push(pageRouters.CATEGORY_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  const onSubmit: SubmitHandler<CreateCategoryFormData> = (data) => {
    editCategory(data);
  };

  return (
    <div className="flex flex-col h-full justify-between">
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
            編集
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

export default EditCategoryForm;
