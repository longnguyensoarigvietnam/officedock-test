'use client';

import { useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';

import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { CreateTagFormData, CreateTagRequest } from '@interfaces/tag';
import { Profile } from '@interfaces/user';
import { OptionDropdownType } from '@interfaces/common';

import {
  TAG_NAME_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  ERROR_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';

import useCreationPersonInCharge from '@hooks/useCreationPersonInCharge';
import ImageRound from '@components/common/ImageRound';
import { useErrorToast } from '@hooks/useErrorToast';

const CreateTagForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [isSubmit, setIsSubmit] = useState(false);

  const [dataPersonInCharge, setDataPersonInCharge] = useState<
    Omit<Profile, 'birthday' | 'gender'>[]
  >([]);
  const [personInChargeOptions, setPersonInChargeOptions] = useState<
    OptionDropdownType[]
  >([]);

  const [selectedPersonInChargeOptions, setSelectedPersonInChargeOptions] =
    useState<OptionDropdownType[]>([]);
  const [unSelectedPersonInChargeOptions, setUnSelectedPersonInChargeOptions] =
    useState<OptionDropdownType[]>([]);

  // Loading dropdown
  const [isLoadingPersonInCharge, setIsLoadingPersonInCharge] =
    useState<boolean>(true);

  const { creationPersonInChargeData } = useCreationPersonInCharge({
    onSettled: () => {
      setIsLoadingPersonInCharge(false);
    },
  });

  useEffect(() => {
    if (creationPersonInChargeData) {
      setDataPersonInCharge(creationPersonInChargeData);
    }
  }, [creationPersonInChargeData]);

  useEffect(() => {
    if (dataPersonInCharge) {
      setPersonInChargeOptions(
        dataPersonInCharge.map((item) => ({
          label: item.fullName,
          value: item.id,
        })),
      );
    }
  }, [dataPersonInCharge]);

  const {
    register,
    control,
    reset,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTagFormData>({
    mode: 'onSubmit',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'peopleInChargeIds',
  });
  useEffect(() => {
    append({ label: '', value: '' });
  }, [append]);

  // If have option selected or remove option selected, update option for unselected options
  useEffect(() => {
    const selectedValues = selectedPersonInChargeOptions.map(
      (element) => element.value,
    );
    const unSelectedOptions = personInChargeOptions.filter(
      (option) => !selectedValues.includes(option.value),
    );
    setUnSelectedPersonInChargeOptions(unSelectedOptions);
  }, [personInChargeOptions, selectedPersonInChargeOptions]);

  const handleCreateTag = async (data: CreateTagRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.TAG_LIST, data);
  };

  const { mutate: createTag } = useMutation('postCreateTag', handleCreateTag, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_CREATE_MESSAGE,
      });
      reset();
      router.push(pageRouters.TAGS_MANAGEMENT.href);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_CREATE_MESSAGE);
      setIsSubmit(false);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });
  // Function handle selected option
  const handleSelectedOrganization = useCallback(
    (index: number, option: OptionDropdownType) => {
      setSelectedPersonInChargeOptions((prevState) => {
        const existingElement = prevState?.[index];
        if (existingElement) {
          prevState.splice(index, 1);
        }
        return [...prevState, option];
      });
    },
    [],
  );

  // Function handle remove selected option
  const handleRemoveSelectedOrganization = useCallback(
    (option: OptionDropdownType, index: number) => {
      setSelectedPersonInChargeOptions((prevState) =>
        prevState.filter((item) => item.value !== option.value),
      );
      remove(index);
    },
    [remove],
  );

  const onSubmit: SubmitHandler<CreateTagFormData> = (data) => {
    if (!isSubmit) {
      setIsSubmit(true);
      const peopleInChargeIds = data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));
      setIsLoading(true);
      createTag({
        name: data.name,
        responsiblePersonId: data.responsiblePersonId
          ? data.responsiblePersonId.value
          : null,
        peopleInChargeIds: peopleInChargeIds,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        className="w-full flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-1/2">
          <Input
            label="集計タグ"
            required
            placeholder="入力してください"
            error={errors?.name?.message}
            register={register('name', {
              required: TAG_NAME_REQUIRED_MESSAGE,
            })}
          />
          <Controller
            control={control}
            name={'responsiblePersonId'}
            render={({ field: { onChange } }) => (
              <Dropdown
                options={personInChargeOptions}
                label="責任者"
                placeholder="選択してください"
                error={errors.responsiblePersonId?.message}
                onChange={onChange}
              />
            )}
          />
          <div className="grid gap-3 ">
            <label className="text-sm ">担当者</label>
            {fields.map((field, index) => (
              <div className="flex gap-3" key={field.id}>
                <Controller
                  control={control}
                  name={`peopleInChargeIds.${index}`}
                  render={({ field: { onChange } }) => (
                    <Dropdown
                      isLoading={isLoadingPersonInCharge}
                      options={unSelectedPersonInChargeOptions}
                      placeholder="選択してください"
                      onChange={(option: OptionDropdownType) => {
                        onChange(option);
                        handleSelectedOrganization(index, option);
                      }}
                    />
                  )}
                />

                <div className="mt-[2.5px]">
                  <Button
                    sz="sm"
                    variant="outline"
                    className="w-[99px]"
                    type="button"
                    name="Remove organization"
                    onClick={() =>
                      handleRemoveSelectedOrganization(
                        watch(`peopleInChargeIds.${index}`),
                        index,
                      )
                    }>
                    削除
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-right">
              <Button
                sz="sm"
                variant="outline"
                className="w-[99px]"
                type="button"
                onClick={() => append({ label: '', value: '' })}>
                <ImageRound
                  src="/icons/plus.svg"
                  name="Add organization"
                  className="mr-3 h-4 w-4"
                />
                追加
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full flex items-center gap-2 mt-8 mb-3 flex-col">
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

export default CreateTagForm;
