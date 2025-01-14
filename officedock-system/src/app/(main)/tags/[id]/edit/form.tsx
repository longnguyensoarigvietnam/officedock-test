'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';

import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';

import api from '@base/api';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { TagStateContext } from '@providers/TagProvider';

import { CreateTagFormData, CreateTagRequest } from '@interfaces/tag';
import { OptionDropdownType } from '@interfaces/common';
import { Profile } from '@interfaces/user';

import {
  ERROR_COMMON_MESSAGE,
  TAG_NAME_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  ERROR_UPDATE_MESSAGE,
} from '@constants/message';
import { ServerStatusCode } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';

import useCreationPersonInCharge from '@hooks/useCreationPersonInCharge';
import useTagDetail from '@hooks/useTagDetail';
import { useErrorToast } from '@hooks/useErrorToast';

const EditTagForm = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const { dataTagDetail, setDataTagDetail } = useContext(TagStateContext);

  const { showToast } = useToast();

  const [dataInPersonInCharge, setDataPersonInCharge] = useState<
    Omit<Profile, 'birthday' | 'gender'>[]
  >([]);
  const [personInChargeOptions, setPersonInChargeOptions] = useState<
    OptionDropdownType[]
  >([]);

  // Loading dropdown
  const [isLoadingPersonInCharge, setIsLoadingPersonInCharge] =
    useState<boolean>(true);

  const { creationPersonInChargeData } = useCreationPersonInCharge({
    onSettled: () => {
      setIsLoadingPersonInCharge(false);
    },
  });

  const [originalPersonInChargeOptions, setOriginalPersonInChargeOptions] =
    useState<OptionDropdownType[]>([]);
  const [selectedPersonInChargeOptions, setSelectedPersonInChargeOptions] =
    useState<OptionDropdownType[]>([]);
  const [unSelectedPersonInChargeOptions, setUnSelectedPersonInChargeOptions] =
    useState<OptionDropdownType[]>([]);

  const { tagDetail } = useTagDetail({
    tagId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.TAGS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (creationPersonInChargeData) {
      setDataPersonInCharge(creationPersonInChargeData);
    }
  }, [creationPersonInChargeData]);
  useEffect(() => {
    if (creationPersonInChargeData) {
      setOriginalPersonInChargeOptions(
        creationPersonInChargeData.map((org) => ({
          label: org.fullName,
          value: org.id,
        })),
      );

      if (tagDetail?.peopleInCharge) {
        setSelectedPersonInChargeOptions(
          tagDetail.peopleInCharge.map((org) => ({
            label: org.profile.fullName,
            value: org.id,
          })),
        );
      }
    }
  }, [creationPersonInChargeData, tagDetail?.peopleInCharge]);

  useEffect(() => {
    if (dataInPersonInCharge) {
      setPersonInChargeOptions(
        dataInPersonInCharge.map((item) => ({
          label: item.fullName,
          value: item.id,
        })),
      );
    }
  }, [dataInPersonInCharge]);

  const {
    register,
    control,
    reset,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTagFormData>({
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      responsiblePersonId: {
        value: '',
        label: '',
      },
      peopleInChargeIds: [],
    },
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
    const unSelectedOptions = originalPersonInChargeOptions.filter(
      (option) => !selectedValues.includes(option.value),
    );
    setUnSelectedPersonInChargeOptions(unSelectedOptions);
  }, [
    originalPersonInChargeOptions,
    personInChargeOptions,
    selectedPersonInChargeOptions,
  ]);

  const defaultValues = useMemo<CreateTagFormData>(() => {
    const value: CreateTagFormData = {
      name: '',
      responsiblePersonId: {
        value: '',
        label: '',
      },
      peopleInChargeIds: [],
    };

    if (dataTagDetail) {
      (value.name = dataTagDetail.name),
        (value.responsiblePersonId = {
          label: dataTagDetail.responsiblePerson?.profile.fullName || '',
          value: dataTagDetail.responsiblePerson?.id || '',
        }),
        (value.peopleInChargeIds = dataTagDetail.peopleInCharge.map(
          (element: { profile: { fullName: any }; id: any }) => ({
            label: element.profile.fullName,
            value: element.id,
          }),
        ));
    }

    return value;
  }, [dataTagDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (tagDetail) {
      setDataTagDetail(tagDetail);
    }
  }, [setDataTagDetail, tagDetail]);
  useEffect(() => {
    if (!dataTagDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataTagDetail]);

  const handleEditTag = async (data: CreateTagRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TAG_DETAIL(params.id), data);
  };

  const { mutate: editTag } = useMutation('postEditTag', handleEditTag, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      router.push(pageRouters.TAGS_MANAGEMENT.href);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
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
    setIsLoading(true);
    const peopleInChargeIds = data.peopleInChargeIds
      .filter((item) => item.value !== '')
      .map((item) => ({ peopleInChargeId: item.value }));
    editTag({
      name: data.name,
      responsiblePersonId: data.responsiblePersonId?.value
        ? data.responsiblePersonId.value
        : null,
      peopleInChargeIds: peopleInChargeIds,
    });
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
            render={({ field: { value, onChange } }) => (
              <Dropdown
                isLoading={isLoadingPersonInCharge}
                options={personInChargeOptions}
                selectedOption={personInChargeOptions.find(
                  (element) => element.value === value?.value,
                )}
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
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      isLoading={isLoadingPersonInCharge}
                      options={unSelectedPersonInChargeOptions}
                      placeholder="選択してください"
                      selectedOption={originalPersonInChargeOptions.find(
                        (element) => element.value === value?.value,
                      )}
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

export default EditTagForm;
