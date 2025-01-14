'use client';
import { useContext, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import TextArea from '@components/common/TextArea';

import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode, SubmitLevelStatus } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { SubmitLevelStateContext } from '@providers/SubmitLevelProvider';

import useSubmitLevelDetail from '@hooks/useSubmitLevelDetail';
import { OptionDropdownType } from '@interfaces/common';
import { getSubmitLevelFormattedDate } from '@utils/date';

import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const EditSubmitLevelForm = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { dataSubmitLevelDetail, setDataSubmitLevelDetail } = useContext(
    SubmitLevelStateContext,
  );
  const statusOptions = [
    {
      value: SubmitLevelStatus.PENDING,
      label: SubmitLevelStatus.PENDING,
    },
    {
      value: SubmitLevelStatus.APPROVAL,
      label: SubmitLevelStatus.APPROVAL,
    },
    {
      value: SubmitLevelStatus.REJECTED,
      label: SubmitLevelStatus.REJECTED,
    },
  ];
  const { showToast } = useToast();
  const { submitLevelDetail } = useSubmitLevelDetail({
    submitLevelId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.SUBMIT_LEVELS.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (submitLevelDetail) {
      setDataSubmitLevelDetail(submitLevelDetail);
    }
  }, [submitLevelDetail, setDataSubmitLevelDetail]);

  useEffect(() => {
    if (!dataSubmitLevelDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSubmitLevelDetail]);

  const { reset, register, handleSubmit, control } = useForm<{
    status: OptionDropdownType;
    comment: string;
  }>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<{
    status: OptionDropdownType;
    comment: string;
  }>(() => {
    const value: {
      status: OptionDropdownType;
      comment: string;
    } = {
      comment: '',
      status: statusOptions[0],
    };

    if (dataSubmitLevelDetail) {
      value.comment = dataSubmitLevelDetail.comment;
      value.status = {
        label: dataSubmitLevelDetail.status,
        value: dataSubmitLevelDetail.status,
      };
    }

    return value;
  }, [dataSubmitLevelDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleEditSubmitSkill = async (data: {
    status: string;
    comment: string;
  }) => {
    setIsLoading(true);
    return await api.put(apiRouters.SUBMIT_LEVELS_DETAIL(params.id), data);
  };

  const { mutate: editSubmitSkill } = useMutation(
    'postEditSubmitSkill',
    handleEditSubmitSkill,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        router.push(pageRouters.SUBMIT_LEVELS.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<{
    status: OptionDropdownType;
    comment: string;
  }> = (data) => {
    setIsLoading(true);
    editSubmitSkill({
      status: data.status ? data.status.label : statusOptions[0].label,
      comment: data.comment,
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        className="w-full flex flex-col gap-4 h-full justify-between mb-3"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="w-1/2 flex flex-col gap-4">
          <div>
            <p className="text-[14px]">スキル名</p>
            <div className="mt-1 text-gray-600 min-h-[24px]">
              <span>{dataSubmitLevelDetail?.skill.name}</span>
            </div>
          </div>
          <div>
            <p className="text-[14px]">申請者</p>
            <div className="mt-1 text-gray-600 min-h-[24px]">
              <span>{dataSubmitLevelDetail?.staff.profile.fullName}</span>
            </div>
          </div>
          <div>
            <p className="text-[14px]">組織</p>
            <div className="mt-1 text-gray-600 min-h-[24px]">
              <span>{dataSubmitLevelDetail?.organization.name}</span>
            </div>
          </div>
          <div>
            <p className="text-[14px]">申請日</p>
            <div className="mt-1 text-gray-600 min-h-[24px]">
              <span>
                {dataSubmitLevelDetail
                  ? getSubmitLevelFormattedDate(
                      new Date(dataSubmitLevelDetail.createdAt),
                    )
                  : ''}
              </span>
            </div>
          </div>
          <Controller
            control={control}
            name={'status'}
            render={({ field: { onChange } }) => (
              <Dropdown
                label="ステータス"
                options={statusOptions}
                selectedOption={statusOptions[0]}
                placeholder="選択してください"
                className="w-1/4"
                onChange={onChange}
              />
            )}
          />
          <div className="flex flex-col gap-1">
            <p className="text-[14px]">コメント</p>
            <TextArea register={register('comment')} className="h-[200px]" />
          </div>
        </div>

        <div className="flex w-full items-center gap-2 mt-8 flex-col">
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

export default EditSubmitLevelForm;
