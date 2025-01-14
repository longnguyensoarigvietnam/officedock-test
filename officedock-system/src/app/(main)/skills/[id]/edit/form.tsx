'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Input from '@components/common/Input';

import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SKILL_NAME_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import useSkillDetail from '@hooks/useSkillDetail';
import { LoadingContext } from '@providers/LoadingProvider';
import { SkillStateContext } from '@providers/SkillProvider';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import { CreateSkillFormData } from '@interfaces/skills';
import { useErrorToast } from '@hooks/useErrorToast';

const EditSkillForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { setIsLoading } = useContext(LoadingContext);
  const { dataSkillDetail, setDataSkillDetail } = useContext(SkillStateContext);
  const showErrorToast = useErrorToast();

  const [isSubmit, setIsSubmit] = useState(false);

  const { showToast } = useToast();

  const { skillDetail } = useSkillDetail({
    skillId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.SKILLS_MANAGEMENT.href);
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
  } = useForm<CreateSkillFormData>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<CreateSkillFormData>(() => {
    const value: CreateSkillFormData = {
      name: '',
    };

    if (dataSkillDetail) {
      value.name = dataSkillDetail.name;
    }

    return value;
  }, [dataSkillDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (skillDetail) {
      setDataSkillDetail(skillDetail);
    }
  }, [setDataSkillDetail, skillDetail]);

  useEffect(() => {
    if (!dataSkillDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataSkillDetail]);

  //  Function call API edit skill
  const handleEditSkill = async (data: CreateSkillFormData) => {
    setIsLoading(true);
    return await api.patch(apiRouters.SKILL_DETAIL(params.id), data);
  };

  const { mutate: editSkill } = useMutation('postEditSkill', handleEditSkill, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      router.push(pageRouters.SKILLS_MANAGEMENT.href);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setIsSubmit(false);
      setIsLoading(false);
    },
  });
  const onSubmit: SubmitHandler<CreateSkillFormData> = (data) => {
    if (isSubmit) return;
    setIsSubmit(true);
    editSkill(data);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        className="w-full flex flex-col gap-4 h-full justify-between mb-3"
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

export default EditSkillForm;
