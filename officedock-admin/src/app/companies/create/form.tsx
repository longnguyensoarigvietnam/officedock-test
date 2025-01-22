'use client';
import { useMutation } from 'react-query';
import { useContext, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import DatePicker from '@components/common/DatePicker';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { CreateCompanyFormData } from '@interfaces/company';
import { OptionDropdownType } from '@interfaces/common';

import { formatDateServer } from '@utils';

import {
  COMPANY_NAME_REQUIRED_MESSAGE,
  EMAIL_IS_REQUIRED_MESSAGE,
  END_DATE_REQUIRE_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_EMAIL_AVAILABLE_MESSAGE,
  FULL_NAME_REQUIRED_MESSAGE,
  START_DATE_REQUIRE_MESSAGE,
  STATUS_COMPANY_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { STATUS_COMPANY } from '@constants/company';
import { apiRouters, pageRouters } from '@constants/routers';
import { StatusCompany } from '@constants/enums';

import api from '@base/api';

interface CreateCompanyType {
  id?: string;
  name: string;
  fullname: string;
  email: string;
  contract: {
    status?: OptionDropdownType;
    startDate?: string | null;
    endDate?: string | null;
  };
}

const CreateCompanyForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setIsLoading } = useContext(LoadingContext);

  const [isCheckStatus, setCheckStatus] = useState<boolean>(false);

  const { showToast } = useToast();

  const [minDate, setMinDate] = useState<Date | null>();

  const {
    reset,
    control,
    register,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCompanyType>({
    mode: 'onSubmit',
    defaultValues: {
      contract: {
        status: {
          label: STATUS_COMPANY[0].label,
          value: STATUS_COMPANY[0].value,
        },
      },
    },
  });

  const handleCreateCompany = async (data: CreateCompanyFormData) => {
    setIsLoading(true);
    return await api.post(apiRouters.COMPANY_LIST, data);
  };

  const { mutate: createCompany } = useMutation(
    'postCreateCompany',
    handleCreateCompany,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        reset();
        router.push(pageRouters.COMPANY_MANAGEMENT.href);
      },
      onError: ({ response }) => {
        if (response?.data.email) {
          setError('email', {
            message: ERROR_EMAIL_AVAILABLE_MESSAGE,
          });
        } else
          showToast({
            variant: 'error',
            description: ERROR_CREATE_MESSAGE,
          });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateCompanyType> = (data) => {
    setIsLoading(true);
    createCompany({
      id: parseFloat(params.id),
      name: data.name,
      email: data.email,
      fullname: data.fullname,
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
            label="名前"
            required
            placeholder="名前を入力してください"
            register={register('fullname', {
              required: FULL_NAME_REQUIRED_MESSAGE,
            })}
            autoComplete="off"
            error={errors.fullname?.message}
          />
        </div>
      </div>
      <div className="grid gap-2 mt-4">
        {/* Mail Area */}
        <div className="grid grid-cols-2 gap-5">
          <Input
            label="メールアドレス"
            required
            placeholder="メールアドレスを入力してください"
            register={register('email', {
              required: EMAIL_IS_REQUIRED_MESSAGE,
            })}
            autoComplete="off"
            error={errors.email?.message}
          />
        </div>
      </div>
      <div className="grid gap-2 mt-4">
        {/* Company Name Area */}
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
      <div className="grid gap-2 mt-4">
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

export default CreateCompanyForm;
