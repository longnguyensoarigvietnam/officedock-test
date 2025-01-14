'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from 'react-query';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { AxiosError } from 'axios';

import api from '@base/api';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';

import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  ORGANIZATION_NAME_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode } from '@constants/enums';

import useOrganizationDetail from '@hooks/useOrganizationDetail';
import useCreationOrganization from '@hooks/useCreationOrganization';

import { OptionDropdownType } from '@interfaces/common';
import {
  CreateOrganizationFormData,
  CreateOrganizationRequest,
  Organizations,
} from '@interfaces/organization';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { getAllAvailableOrganization } from '@utils';
import { OrganizationStateContext } from '@providers/OrganizationProvider';
import { useErrorToast } from '@hooks/useErrorToast';

const EditOrganizationForm = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);

  const { dataOrganizationDetail, setDataOrganizationDetail } = useContext(
    OrganizationStateContext,
  );
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [dataOrganizations, setDataOrganizations] = useState<
    Omit<Organizations, 'userCount'>[]
  >([]);

  const [organizationOptions, setOrganizationOptions] = useState<
    OptionDropdownType[]
  >([]);

  // Loading dropdown
  const [isLoadingListOrganization, setIsLoadingOrganization] =
    useState<boolean>(true);

  // Call hooks get data list for dropdown and data of organization
  const { creationOrganization } = useCreationOrganization({
    onSettled: () => {
      setIsLoadingOrganization(false);
    },
  });
  const { organizationDetail } = useOrganizationDetail({
    organizationId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (creationOrganization) {
      setDataOrganizations(creationOrganization);
    }
  }, [creationOrganization]);

  useEffect(() => {
    if (organizationDetail) {
      setDataOrganizationDetail(organizationDetail);
    }
  }, [setDataOrganizationDetail, organizationDetail]);
  useEffect(() => {
    if (!dataOrganizationDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataOrganizationDetail]);

  useEffect(() => {
    if (dataOrganizations && dataOrganizationDetail?.id) {
      const availableOrganizations = getAllAvailableOrganization(
        dataOrganizations,
        dataOrganizationDetail?.id,
      );
      setOrganizationOptions(
        availableOrganizations.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [dataOrganizations, dataOrganizationDetail]);

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganizationFormData>({
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      superiorId: {
        label: '',
        value: '',
      },
    },
  });

  const defaultValues = useMemo<CreateOrganizationFormData>(() => {
    const value: CreateOrganizationFormData = {
      name: '',
      superiorId: {
        label: '',
        value: '',
      },
    };

    if (dataOrganizationDetail) {
      (value.name = dataOrganizationDetail.name),
        (value.superiorId = {
          label: dataOrganizationDetail.superior?.name || '',
          value: dataOrganizationDetail.superior?.id || '',
        });
    }

    return value;
  }, [dataOrganizationDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleEditOrganization = async (data: CreateOrganizationRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.ORGANIZATION_DETAIL(params.id), data);
  };

  const { mutate: editOrganization } = useMutation(
    'postEditOrganization',
    handleEditOrganization,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        reset();
        router.push(pageRouters.ORGANIZATION_MANAGEMENT.href);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateOrganizationFormData> = (data) => {
    setIsLoading(true);
    editOrganization({
      name: data.name,
      superiorId: data.superiorId?.value ? data.superiorId.value : null,
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <form
        className="w-full flex flex-col gap-4 h-full justify-between mb-3"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="w-1/2 flex flex-col gap-4">
          <Input
            label="組織名"
            required
            defaultValue={defaultValues.name}
            placeholder="入力してください"
            error={errors?.name?.message}
            register={register('name', {
              required: ORGANIZATION_NAME_REQUIRED_MESSAGE,
            })}
          />
          <Controller
            control={control}
            name={'superiorId'}
            render={({ field: { value, onChange } }) => (
              <Dropdown
                options={organizationOptions}
                isLoading={isLoadingListOrganization}
                selectedOption={organizationOptions.find(
                  (element) => element.value === value?.value,
                )}
                label="上位組織"
                placeholder="選択してください"
                error={errors.superiorId?.message}
                onChange={onChange}
              />
            )}
          />
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

export default EditOrganizationForm;
