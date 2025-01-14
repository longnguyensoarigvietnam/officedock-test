'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';

import api from '@base/api';
import {
  ERROR_CREATE_MESSAGE,
  ORGANIZATION_NAME_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import {
  CreateOrganizationFormData,
  CreateOrganizationRequest,
  Organizations,
} from '@interfaces/organization';
import { OptionDropdownType } from '@interfaces/common';
import useCreationOrganization from '@hooks/useCreationOrganization';
import { useErrorToast } from '@hooks/useErrorToast';

const CreateOrganizationForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();

  const { showToast } = useToast();

  const [isSubmit, setIsSubmit] = useState(false);

  const [dataOrganizations, setDataOrganizations] = useState<
    Omit<Organizations, 'userCount'>[]
  >([]);
  const [organizationOptions, setOrganizationOptions] = useState<
    OptionDropdownType[]
  >([]);

  // Loading dropdown
  const [isLoadingListOrganization, setIsLoadingOrganization] =
    useState<boolean>(true);

  const { creationOrganization } = useCreationOrganization({
    onSettled: () => {
      setIsLoadingOrganization(false);
    },
  });

  useEffect(() => {
    if (creationOrganization) {
      setDataOrganizations(creationOrganization);
    }
  }, [creationOrganization]);

  useEffect(() => {
    if (dataOrganizations) {
      setOrganizationOptions(
        dataOrganizations.map((org) => ({ label: org.name, value: org.id })),
      );
    }
  }, [dataOrganizations]);

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganizationFormData>({
    mode: 'onSubmit',
  });

  const handleCreateOrganization = async (data: CreateOrganizationRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.ORGANIZATION_LIST, data);
  };

  const { mutate: createOrganization } = useMutation(
    'postCreateOrganization',
    handleCreateOrganization,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        reset();
        router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
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

  const onSubmit: SubmitHandler<CreateOrganizationFormData> = (data) => {
    if (!isSubmit) {
      setIsSubmit(true);
      setIsLoading(true);
      createOrganization({
        name: data.name,
        superiorId: data.superiorId?.value ? data.superiorId.value : null,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        className="w-full flex flex-col gap-4 h-full justify-between mb-3"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-1/2">
          <Input
            label="組織名"
            required
            placeholder="入力してください"
            error={errors?.name?.message}
            register={register('name', {
              required: ORGANIZATION_NAME_REQUIRED_MESSAGE,
            })}
          />
          <Controller
            control={control}
            name={'superiorId'}
            render={({ field: { onChange } }) => (
              <Dropdown
                isLoading={isLoadingListOrganization}
                options={organizationOptions}
                label="上位組織"
                placeholder="選択してください"
                error={errors.superiorId?.message}
                onChange={onChange}
              />
            )}
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

export default CreateOrganizationForm;
