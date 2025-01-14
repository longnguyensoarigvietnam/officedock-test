'use client';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import Input from '@components/common/Input';

import {
  ERROR_CREATE_MESSAGE,
  SKILL_NAME_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import {
  CreateSkillFormData,
  CreateSkillFormRequest,
} from '@interfaces/skills';
import { AxiosError } from 'axios';
import { useErrorToast } from '@hooks/useErrorToast';

const CreateSkillForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();
  const [isSubmit, setIsSubmit] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSkillFormData>({
    mode: 'onSubmit',
  });

  // Function call API create skill
  const handleCreateSkill = async (data: CreateSkillFormRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.SKILL_LIST, data);
  };

  const { mutate: createSkill } = useMutation(
    'postCreateSkill',
    handleCreateSkill,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        router.push(pageRouters.SKILLS_MANAGEMENT.href);
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

  const onSubmit: SubmitHandler<CreateSkillFormData> = (data) => {
    if (isSubmit) return;
    setIsSubmit(true);
    createSkill(data);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        className="w-full flex flex-col h-full justify-between gap-4 mb-3"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-1/2">
          <Input
            label="スキル名"
            required
            placeholder="入力してください"
            error={errors?.name?.message}
            register={register('name', {
              required: SKILL_NAME_REQUIRED_MESSAGE,
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

export default CreateSkillForm;
