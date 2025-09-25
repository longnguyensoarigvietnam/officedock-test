'use client';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';

import {
  ADDRESS_REQUIRED_MESSAGE,
  COMPANY_NAME_REQUIRED_MESSAGE,
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  IMPLEMENTATION_MAIN_ISSUE_REQUIRED_MESSAGE,
  INDUSTRY_REQUIRED_MESSAGE,
  PHONE_NUMBER_WRONG_FORMAT,
  PHONE_REQUIRED_MESSAGE,
  RESPONSIBLE_PERSON_NAME_REQUIRED_MESSAGE,
  STATUS_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  SYSTEM_MAIN_PURPOSE_REQUIRED_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { CompanyStatus, ServerStatusCode } from '@constants/enums';
import { HALF_WIDTH_DIGIT_REGEX, ONLY_DIGITS_REGEX, PHONE_REGEX } from '@constants/regex';

import useCompanyDetail from '@hooks/useDetailCompany';
import useCommonCreationData from '@hooks/useCommonCreationData';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { OptionDropdownType } from '@interfaces/common';
import { EditCompanyRequest } from '@interfaces/company';

import { emailRules } from '@utils/validators';

import api from '@base/api';

interface EditCompanyType {
  id?: number;
  name: string;
  plan?: string | null;
  status?: OptionDropdownType;
  paymentMethod?: string | null;
  contract: {
    startDate?: string | null;
    endDate?: string | null;
    responsiblePersonName?: string | null;
    responsiblePersonMail?: string | null;
    phone?: string | null;
    address?: string | null;
    industry?: OptionDropdownType;
    systemMainPurpose?: OptionDropdownType;
    implementationMainIssue?: OptionDropdownType;
  };
}

const EditCompanyForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setIsLoading } = useContext(LoadingContext);

  const { showToast } = useToast();

  const [industryOptions, setIndustryOptions] = useState<OptionDropdownType[]>(
    [],
  );
  const STATUS_OPTIONS = [
    {
      label: CompanyStatus.ACTIVE_CONTRACT,
      value: CompanyStatus.ACTIVE_CONTRACT,
    },
    {
      label: CompanyStatus.TEMPORARY_USAGE,
      value: CompanyStatus.TEMPORARY_USAGE,
    },
  ];
  const [systemMainPurposeOptions, setSystemMainPurposeOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [implementationMainIssueOptions, setImplementationMainIssueOptions] =
    useState<OptionDropdownType[]>([]);

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

  useCommonCreationData({
    options: {
      get_industry: true,
      get_system_main_purpose: true,
      get_implementation_main_issues: true,
    },
    onSuccess: (data) => {
      data.industry &&
        setIndustryOptions([
          ...(data?.industry.map((industry) => ({
            value: industry,
            label: industry,
          })) || []),
        ]);

      data.systemMainPurpose &&
        setSystemMainPurposeOptions([
          ...(data?.systemMainPurpose.map((purpose) => ({
            value: purpose,
            label: purpose,
          })) || []),
        ]);

      data.implementationMainIssues &&
        setImplementationMainIssueOptions([
          ...(data?.implementationMainIssues.map((issue) => ({
            value: issue,
            label: issue,
          })) || []),
        ]);
    },
  });

  const {
    watch,
    reset,
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditCompanyType>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<EditCompanyType>(() => {
    const value: EditCompanyType = {
      id: 0,
      name: '',
      plan: '',
      paymentMethod: '',
      contract: {
        responsiblePersonName: '',
        responsiblePersonMail: '',
        phone: '',
        address: '',
        industry: undefined,
        implementationMainIssue: undefined,
        systemMainPurpose: undefined,
      },
    };

    if (companyDetail) {
      (value.id = companyDetail.id),
        (value.name = companyDetail.name),
        (value.plan = companyDetail.plan),
        (value.status = companyDetail.status
          ? {
              label: companyDetail.status ? companyDetail.status : '',
              value: companyDetail.status ? companyDetail.status : '',
            }
          : undefined),
        (value.paymentMethod = companyDetail.paymentMethod),
        (value.contract.responsiblePersonName =
          companyDetail.contract?.responsiblePersonName),
        (value.contract.responsiblePersonMail =
          companyDetail.contract?.responsiblePersonMail),
        (value.contract.phone = companyDetail.contract?.phone),
        (value.contract.address = companyDetail.contract?.address),
        (value.contract.industry = companyDetail.contract?.industry
          ? {
              label: companyDetail.contract?.industry
                ? companyDetail.contract?.industry
                : '',
              value: companyDetail.contract?.industry
                ? companyDetail.contract?.industry
                : '',
            }
          : undefined),
        (value.contract.implementationMainIssue = companyDetail.contract
          ?.implementationMainIssue
          ? {
              label: companyDetail.contract?.implementationMainIssue
                ? companyDetail.contract?.implementationMainIssue
                : '',
              value: companyDetail.contract?.implementationMainIssue
                ? companyDetail.contract?.implementationMainIssue
                : '',
            }
          : undefined),
        (value.contract.systemMainPurpose = companyDetail.contract
          ?.systemMainPurpose
          ? {
              label: companyDetail.contract?.systemMainPurpose
                ? companyDetail.contract?.systemMainPurpose
                : '',
              value: companyDetail.contract?.systemMainPurpose
                ? companyDetail.contract?.systemMainPurpose
                : '',
            }
          : undefined);
    }

    return value;
  }, [companyDetail]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleEditCompany = async (data: EditCompanyRequest) => {
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
      name: data?.name || '',
      status: data?.status?.value as string,
      contract: {
        responsiblePersonName: data.contract?.responsiblePersonName || '',
        responsiblePersonMail: data.contract?.responsiblePersonMail || '',
        phone: data.contract?.phone || '',
        address: data.contract?.address || '',
        industry: data.contract?.industry?.value as string,
        implementationMainIssue: data.contract?.implementationMainIssue
          ?.value as string,
        systemMainPurpose: data.contract?.systemMainPurpose?.value as string,
      },
    });
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input label="ID" register={register('id')} disabled={true} />
      <Input
        label="会社名"
        placeholder="会社名を入力してください"
        register={register('name', {
          required: COMPANY_NAME_REQUIRED_MESSAGE,
        })}
        autoComplete="off"
        error={errors.name?.message}
      />
      {watch('status.value') == CompanyStatus.ACTIVE_CONTRACT ||
      watch('status.value') == CompanyStatus.TEMPORARY_USAGE ? (
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <Dropdown
              label="ステータス"
              options={STATUS_OPTIONS}
              selectedOption={STATUS_OPTIONS.find(
                (element) => element.value === value?.value,
              )}
              onChange={(e) => {
                onChange(e);
              }}
              error={errors.status?.message}
            />
          )}
          rules={{ required: STATUS_REQUIRED_MESSAGE }}
        />
      ) : (
        <></>
      )}

      <Input label="契約プラン" register={register('plan')} disabled={true} />
      <Input
        label="決済方法"
        register={register('paymentMethod')}
        disabled={true}
      />
      <Input
        label="担当責任者名"
        placeholder="担当責任者名を入力してください"
        register={register('contract.responsiblePersonName', {
          required: RESPONSIBLE_PERSON_NAME_REQUIRED_MESSAGE,
        })}
        autoComplete="off"
        error={errors?.contract?.responsiblePersonName?.message}
      />
      <Input
        label="メールアドレス"
        placeholder="メールアドレスを入力してください"
        register={register('contract.responsiblePersonMail', emailRules(true))}
        autoComplete="off"
        error={errors?.contract?.responsiblePersonMail?.message}
      />
      <Input
        label="電話番号"
        placeholder="電話番号を入力してください"
        className={`${errors?.contract?.phone?.message && '!border-error'}`}
        type="tel"
        register={register('contract.phone', {
          required: {
            value: true,
            message: PHONE_REQUIRED_MESSAGE,
          },
          pattern: {
            value: PHONE_REGEX,
            message: PHONE_NUMBER_WRONG_FORMAT,
          },
        })}
        onInput={(e) => {
          e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ''); // remove non-digits
        }}
        onBeforeInput={(e) => {
          const nativeEvent = e.nativeEvent as InputEvent; // browser's InputEvent
          if (!HALF_WIDTH_DIGIT_REGEX.test(nativeEvent.data || '')) {
            e.preventDefault();
          }
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          // block paste if it contains anything other than ASCII digits
          if (!ONLY_DIGITS_REGEX.test(pasted)) {
            e.preventDefault();
          }
        }}
        autoComplete="off"
        error={errors?.contract?.phone?.message}
      />
      <Input
        label="住所"
        placeholder="住所を入力してください"
        register={register('contract.address', {
          required: ADDRESS_REQUIRED_MESSAGE,
        })}
        autoComplete="off"
        error={errors?.contract?.address?.message}
      />
      <Controller
        control={control}
        name="contract.industry"
        render={({ field: { onChange, value } }) => (
          <Dropdown
            label="業種"
            options={industryOptions}
            selectedOption={industryOptions.find(
              (element) => element.value === value?.value,
            )}
            onChange={(e) => {
              onChange(e);
            }}
            error={errors.contract?.industry?.message}
          />
        )}
        rules={{ required: INDUSTRY_REQUIRED_MESSAGE }}
      />
      <Controller
        control={control}
        name="contract.systemMainPurpose"
        render={({ field: { onChange, value } }) => (
          <Dropdown
            label="システム導入の主な目的"
            options={systemMainPurposeOptions}
            selectedOption={systemMainPurposeOptions.find(
              (element) => element.value === value?.value,
            )}
            onChange={(e) => {
              onChange(e);
            }}
            error={errors.contract?.systemMainPurpose?.message}
          />
        )}
        rules={{ required: SYSTEM_MAIN_PURPOSE_REQUIRED_MESSAGE }}
      />
      <Controller
        control={control}
        name="contract.implementationMainIssue"
        render={({ field: { onChange, value } }) => {
          return (
            <Dropdown
              label="導入の背景にある主な課題"
              options={implementationMainIssueOptions}
              selectedOption={implementationMainIssueOptions.find(
                (element) => element.value === value?.value,
              )}
              onChange={(e) => {
                onChange(e);
              }}
              error={errors.contract?.implementationMainIssue?.message}
            />
          );
        }}
        rules={{ required: IMPLEMENTATION_MAIN_ISSUE_REQUIRED_MESSAGE }}
      />
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
