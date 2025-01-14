'use client';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import DatePicker from '@components/common/DatePicker';

import {
  COMPANY_NAME_REQUIRED_MESSAGE,
  END_DATE_REQUIRE_MESSAGE,
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  START_DATE_REQUIRE_MESSAGE,
  STATUS_COMPANY_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { STATUS_COMPANY } from '@constants/company';
import { apiRouters, pageRouters } from '@constants/routers';
import { ServerStatusCode, StatusCompany } from '@constants/enums';
import useCompanyDetail from '@hooks/useDetailCompany';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { Company } from '@interfaces/company';
import { OptionDropdownType } from '@interfaces/common';
import api from '@base/api';
import { formatDateServer } from '@utils';

interface EditCompanyType {
  id?: string;
  name: string;
  contract: {
    status?: OptionDropdownType;
    startDate?: string | null;
    endDate?: string | null;
  };
}

const EditCompanyForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setIsLoading } = useContext(LoadingContext);

  const [isCheckStatus, setCheckStatus] = useState<boolean>(false);

  const { showToast } = useToast();

  const [minDate, setMinDate] = useState<Date | null>();
  const { companyDetail } = useCompanyDetail({
    companyId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.COMPANY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  const {
    reset,
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCompanyType>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<EditCompanyType>(() => {
    const value: EditCompanyType = {
      name: '',
      contract: {
        status: undefined,
        startDate: '',
        endDate: '',
      },
    };

    if (companyDetail) {
      (value.name = companyDetail.name),
        (value.contract.startDate = companyDetail.contract?.startDate),
        (value.contract.endDate = companyDetail.contract?.endDate),
        (value.contract.status = companyDetail.contract?.status
          ? {
              label: companyDetail.contract?.status
                ? companyDetail.contract?.status?.toString()
                : '',
              value: companyDetail.contract?.status
                ? companyDetail.contract?.status?.toString()
                : '',
            }
          : undefined);
    }

    if (companyDetail?.contract?.startDate) {
      setMinDate(
        new Date(
          new Date().setDate(
            new Date(companyDetail.contract.startDate).getDate() + 1,
          ),
        ),
      );
    }

    if (
      companyDetail &&
      companyDetail.contract?.status === StatusCompany.ALREADY
    ) {
      setCheckStatus(true);
    } else {
      setCheckStatus(false);
    }

    return value;
  }, [companyDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleEditCompany = async (data: Company) => {
    setIsLoading(true);
    return await api.patch(apiRouters.COMPANY_DETAIL(params.id), data);
  };

  const { mutate: editCompany } = useMutation(
    'postEditCompany',
    handleEditCompany,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        reset();
        router.push(pageRouters.COMPANY_MANAGEMENT.href);
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_UPDATE_MESSAGE,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<EditCompanyType> = (data) => {
    setIsLoading(true);
    editCompany({
      ...data,
      id: parseFloat(params.id),
      contract: {
        status: data.contract?.status?.value.toString(),
        startDate: data.contract?.startDate
          ? formatDateServer(data.contract.startDate)
          : null,
        endDate: data.contract?.endDate
          ? formatDateServer(data.contract.endDate)
          : null,
      },
    });
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        {/* Name Area */}
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="会社名"
            required
            placeholder="会社名を入力してください"
            register={register('name', {
              required: COMPANY_NAME_REQUIRED_MESSAGE,
            })}
            autoComplete="off"
            error={errors.name?.message}
          />
        </div>
      </div>
      <div className="grid gap-2  mt-4">
        {/* Status Area */}
        <div className="grid grid-cols-2 gap-5">
          <div className="w-3/4">
            <Controller
              control={control}
              name="contract.status"
              render={({ field: { onChange, value } }) => (
                <Dropdown
                  label="契約状態"
                  options={STATUS_COMPANY}
                  selectedOption={STATUS_COMPANY.find(
                    (element) => element.value === value?.value,
                  )}
                  className="w-1/2"
                  onChange={(e) => {
                    onChange(e);
                    if (e.value === StatusCompany.ALREADY) {
                      setCheckStatus(true);
                    } else {
                      setValue('contract.startDate', '');
                      setValue('contract.endDate', '');
                      setCheckStatus(false);
                    }
                  }}
                  error={errors.contract?.status?.message}
                />
              )}
              rules={{ required: STATUS_COMPANY_REQUIRED_MESSAGE }}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-2 mt-4">
        {/* StartDate Area */}
        <div className="grid grid-cols-2 gap-5">
          <div className="w-3/4">
            <Controller
              control={control}
              name="contract.startDate"
              rules={{
                required: isCheckStatus && START_DATE_REQUIRE_MESSAGE,
              }}
              render={({ field: { value, onChange } }) => (
                <DatePicker
                  label="契約開始日"
                  required={isCheckStatus}
                  placeholder="yyyy/mm/dd"
                  selected={value ? new Date(value) : null}
                  onChange={(e) => {
                    onChange(e);
                    if (e !== null) {
                      const newDate = new Date(
                        e.getTime() + 24 * 60 * 60 * 1000,
                      );
                      setMinDate(newDate);
                    } else {
                      setMinDate(null);
                    }
                    setValue('contract.endDate', '');
                  }}
                  error={
                    isCheckStatus ? errors.contract?.startDate?.message : ''
                  }
                />
              )}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-2 mt-4">
        {/* EndDate Area */}
        <div className="grid grid-cols-2 gap-5">
          <div className="w-3/4">
            <Controller
              control={control}
              name="contract.endDate"
              rules={{
                required: isCheckStatus && END_DATE_REQUIRE_MESSAGE,
              }}
              render={({ field: { value, onChange } }) => (
                <DatePicker
                  label="契約終了日"
                  required={isCheckStatus}
                  placeholder="yyyy/mm/dd"
                  selected={value ? new Date(value) : null}
                  onChange={onChange}
                  minDate={minDate}
                  error={isCheckStatus ? errors.contract?.endDate?.message : ''}
                />
              )}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-4 my-[60px]">
          <Button className="w-[426px]" variant="primary" type="submit">
            保存
          </Button>
          <Button
            onClick={() => router.back()}
            variant="secondary"
            className="border-none !shadow-none p-3 w-[426px]"
            type="button">
            戻る
          </Button>
        </div>
      </div>
    </form>
  );
};

export default EditCompanyForm;
