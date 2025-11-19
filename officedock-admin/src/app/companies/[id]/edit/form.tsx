'use client';
import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Input from '@components/common/Input';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import SelectionBox from '@components/common/SelectionBox';

import {
  ADDRESS_REQUIRED_MESSAGE,
  COMPANY_NAME_REQUIRED_MESSAGE,
  DEPARTMENT_REQUIRED_MESSAGE,
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  INDUSTRY_REQUIRED_MESSAGE,
  FIELD_MAX_LENGTH_255_MESSAGE,
  PHONE_NUMBER_WRONG_FORMAT,
  PHONE_REQUIRED_MESSAGE,
  RESPONSIBLE_PERSON_NAME_REQUIRED_MESSAGE,
  STATUS_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  SYSTEM_MAIN_PURPOSE_REQUIRED_MESSAGE,
  MIN_MONTHLY_FEE_MESSAGE,
  MONTHLY_FEE_REQUIRED_MESSAGE,
  LIMIT_PERSON_REQUIRED_MESSAGE,
  MAX_LIMIT_PERSON_MESSAGE,
  MONTHLY_COIN_REQUIRED_MESSAGE,
  MIN_MONTHLY_COIN_MESSAGE,
  MAX_MONTHLY_COIN_MESSAGE,
  MAX_MONTHLY_FEE_MESSAGE,
  PLAN_REQUIRED_MESSAGE,
  MIN_CUSTOM_LIMIT_PERSON_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  CompanyPlan,
  CompanyStatus,
  SelectionBoxType,
  ServerStatusCode,
} from '@constants/enums';
import { PHONE_REGEX } from '@constants/regex';
import {
  COMPANY_CUSTOM_PLAN_OPTIONS,
  COMPANY_STATUS_OPTIONS,
  CUSTOM_PLAN_LABEL,
  NAME_OTHER_OPTION,
  OTHER_OPTION_VALUE,
} from '@constants';

import useCompanyDetail from '@hooks/useDetailCompany';
import useCommonCreationData from '@hooks/useCommonCreationData';
import { useErrorToast } from '@hooks/useErrorToast';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { OptionDropdownType } from '@interfaces/common';
import { EditCompanyRequest } from '@interfaces/company';

import { emailRules } from '@utils/validators';
import {
  getErrorMessage,
  handleHalfWidthInput,
  handleHalfWidthPaste,
  handleServerFormErrors,
  normalizeJapaneseText,
} from '@utils';

import api from '@base/api';

interface EditCompanyType {
  id?: number;
  name: string;
  plan?: OptionDropdownType | null;
  status?: OptionDropdownType;
  paymentMethod?: string | null;
  mfCustomerId?: string | null;
  responsiblePersonName?: string | null;
  responsiblePersonMail?: string | null;
  contract: {
    startDate?: string | null;
    endDate?: string | null;
    phone?: string | null;
    address?: string | null;
    industry?: OptionDropdownType;
    systemMainPurpose?: OptionDropdownType[];
    department?: OptionDropdownType[];
  };
  closeDate?: OptionDropdownType;
  editableAfterClosing?: OptionDropdownType;
  customPlan: {
    monthlyFee: number | null;
    exchangeableAmount: number | null;
    limitPerson: number | null;
  };
}

const EditCompanyForm = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { setIsLoading } = useContext(LoadingContext);

  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  const [industryOptions, setIndustryOptions] = useState<OptionDropdownType[]>(
    [],
  );

  const [systemMainPurposeOptions, setSystemMainPurposeOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [departmentOptions, setDepartmentOptions] = useState<
    OptionDropdownType[]
  >([]);

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
      get_department: true,
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

      data.department &&
        setDepartmentOptions([
          ...(data?.department.map((department) => ({
            value: department,
            label: department,
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
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EditCompanyType>({
    mode: 'onSubmit',
  });
  const closingDayOptions = Array.from({ length: 31 }, (_, i) => ({
    label: `${i + 1}日`,
    value: i + 1,
  }));
  const editableAfterClosingOptions = Array.from({ length: 10 }, (_, i) => ({
    label: `${i + 1}日間`,
    value: i + 1,
  }));

  const defaultValues = useMemo<EditCompanyType>(() => {
    const value: EditCompanyType = {
      id: 0,
      name: '',
      plan: null,
      paymentMethod: '',
      responsiblePersonName: '',
      responsiblePersonMail: '',
      contract: {
        phone: '',
        address: '',
        industry: undefined,
        department: undefined,
        systemMainPurpose: undefined,
      },
      customPlan: {
        exchangeableAmount: null,
        limitPerson: null,
        monthlyFee: null,
      },
      closeDate: closingDayOptions[closingDayOptions.length - 1],
      editableAfterClosing:
        editableAfterClosingOptions[editableAfterClosingOptions.length - 1],
    };

    if (companyDetail) {
      value.id = companyDetail.id;
      value.name = companyDetail.name;
      value.plan = {
        label: companyDetail.plan?.name || '',
        value: companyDetail.plan?.name || '',
      };
      value.status = companyDetail.status
        ? {
            label: companyDetail.status,
            value: companyDetail.status,
          }
        : undefined;
      value.mfCustomerId = companyDetail.mfCustomerId;

      value.paymentMethod = companyDetail.paymentMethod;
      value.responsiblePersonName = companyDetail?.responsiblePersonName;
      value.responsiblePersonMail = companyDetail?.responsiblePersonMail;
      value.contract.phone = companyDetail.contract?.phone;
      value.contract.address = companyDetail.contract?.address;
      value.customPlan.exchangeableAmount =
        companyDetail.plan?.name == CUSTOM_PLAN_LABEL
          ? companyDetail.plan?.exchangeableAmount ?? null
          : null;
      value.customPlan.limitPerson =
        companyDetail.plan?.name == CUSTOM_PLAN_LABEL
          ? companyDetail.plan?.limitPerson ?? null
          : null;
      value.customPlan.monthlyFee =
        companyDetail.plan?.name == CUSTOM_PLAN_LABEL
          ? companyDetail.plan?.monthlyFee ?? null
          : null;

      value.contract.industry = companyDetail.contract?.industry
        ? industryOptions.find(
            (option) => option.value == companyDetail.contract?.industry,
          )
          ? {
              label: companyDetail.contract.industry,
              value: companyDetail.contract.industry,
            }
          : {
              label: NAME_OTHER_OPTION,
              value: OTHER_OPTION_VALUE,
              other: companyDetail.contract?.industry,
            }
        : undefined;

      value.contract.systemMainPurpose = companyDetail.contract
        ?.systemMainPurpose?.length
        ? companyDetail.contract.systemMainPurpose.map((purpose) => ({
            label: purpose || '',
            value: purpose || '',
          }))
        : undefined;
      value.closeDate = companyDetail.closeDate
        ? closingDayOptions.find(
            (date) => date.value == companyDetail.closeDate,
          )
        : undefined;
      value.editableAfterClosing = companyDetail.editableAfterClosing
        ? editableAfterClosingOptions.find(
            (date) => date.value == companyDetail.editableAfterClosing,
          )
        : undefined;

      value.contract.department = companyDetail.contract?.department?.length
        ? companyDetail.contract.department.map((department) => {
            return departmentOptions.find(
              (option) => option.value == department,
            )
              ? {
                  label: department,
                  value: department,
                }
              : {
                  label: NAME_OTHER_OPTION,
                  value: OTHER_OPTION_VALUE,
                  other: department,
                };
          })
        : undefined;
    }

    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyDetail, industryOptions, departmentOptions]);

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
      onError: (error: any) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);

        handleServerFormErrors<EditCompanyType>(error, setError, control);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const watchedDepartment = watch('contract.department');

  const onSubmit: SubmitHandler<EditCompanyType> = (data) => {
    setIsLoading(true);
    editCompany({
      id: parseFloat(params.id),
      name: data?.name || '',
      status: data?.status?.value as string,
      responsiblePersonName: data.responsiblePersonName || '',
      responsiblePersonMail: data.responsiblePersonMail || '',
      contract: {
        phone: data.contract?.phone || '',
        address: data.contract?.address || '',
        industry:
          data.contract?.industry?.value == OTHER_OPTION_VALUE
            ? (data.contract?.industry?.other as string)
            : (data.contract?.industry?.value as string),
        department: data.contract?.department?.map((item) =>
          item.value == OTHER_OPTION_VALUE ? item.other || '' : item.value,
        ) as string[],
        systemMainPurpose: data.contract?.systemMainPurpose?.map((item) =>
          item.value == OTHER_OPTION_VALUE ? item.other || '' : item.value,
        ) as string[],
      },
      mfCustomerId: data.mfCustomerId,
      closeDate:
        companyDetail?.totalUsers && companyDetail?.totalUsers > 0
          ? undefined
          : (data.closeDate?.value as number),
      editableAfterClosing:
        companyDetail?.totalUsers && companyDetail?.totalUsers > 0
          ? undefined
          : (data.editableAfterClosing?.value as number),
      ...(Number(data?.customPlan?.monthlyFee) &&
      Number(data?.customPlan?.exchangeableAmount) &&
      Number(data?.customPlan?.limitPerson) &&
      data?.plan?.value == CompanyPlan.CUSTOM_PLAN
        ? {
            customPlan: {
              monthlyFee: Number(data?.customPlan?.monthlyFee) || null,
              exchangeableAmount:
                Number(data?.customPlan?.exchangeableAmount) || null,
              limitPerson: Number(data?.customPlan?.limitPerson) || null,
            },
          }
        : {}),
    });
  };

  const isCustomPlan =
    watch('plan') && watch('plan')?.value == CompanyPlan.CUSTOM_PLAN;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ID */}
      <Input label="ID" register={register('id')} disabled={true} />

      {/* Name */}
      <Input
        label="会社名"
        placeholder="会社名を入力してください"
        register={register('name', {
          required: COMPANY_NAME_REQUIRED_MESSAGE,
          maxLength: {
            value: 255,
            message: FIELD_MAX_LENGTH_255_MESSAGE,
          },
        })}
        autoComplete="off"
        error={getErrorMessage(errors, 'name')}
      />

      {/* Status */}
      {watch('status.value') == CompanyStatus.ACTIVE_CONTRACT ||
      watch('status.value') == CompanyStatus.TEMPORARY_USAGE ? (
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <Dropdown
              label="ステータス"
              options={COMPANY_STATUS_OPTIONS}
              selectedOption={COMPANY_STATUS_OPTIONS.find(
                (element) => element.value === value?.value,
              )}
              onChange={(e) => {
                onChange(e);
              }}
              error={getErrorMessage(errors, 'status')}
            />
          )}
          rules={{ required: STATUS_REQUIRED_MESSAGE }}
        />
      ) : (
        <></>
      )}

      {/* Plan */}
      <Controller
        control={control}
        name="plan"
        render={({ field: { onChange, value } }) => (
          <Dropdown
            label="契約プラン"
            options={COMPANY_CUSTOM_PLAN_OPTIONS(
              companyDetail?.plan?.name != CompanyPlan.CUSTOM_PLAN
                ? String(companyDetail?.plan?.name)
                : '',
            )}
            selectedOption={COMPANY_CUSTOM_PLAN_OPTIONS(
              companyDetail?.plan?.name != CompanyPlan.CUSTOM_PLAN
                ? String(companyDetail?.plan?.name)
                : '',
            ).find((element) => element.value === value?.value)}
            onChange={(e) => {
              onChange(e);
              clearErrors('customPlan.exchangeableAmount');
              clearErrors('customPlan.monthlyFee');
              clearErrors('customPlan.limitPerson');
            }}
            error={getErrorMessage(errors, 'plan')}
            disabled={companyDetail?.plan?.name == CompanyPlan.CUSTOM_PLAN}
          />
        )}
        rules={{ required: PLAN_REQUIRED_MESSAGE }}
      />

      {/* Payment method */}
      <Input
        label="決済方法"
        value={companyDetail?.paymentMethod || ''}
        disabled={true}
      />
      {/* MfCustomerID */}
      {/* TODO: Update MF */}
      {/* <Input
        label="マネーフォワードケッサイの顧客ID"
        register={register('mfCustomerId')}
      /> */}

      {/* Responsible person name */}
      <Input
        label="担当責任者名"
        placeholder="担当責任者名を入力してください"
        register={register('responsiblePersonName', {
          required: RESPONSIBLE_PERSON_NAME_REQUIRED_MESSAGE,
          maxLength: {
            value: 255,
            message: FIELD_MAX_LENGTH_255_MESSAGE,
          },
        })}
        autoComplete="off"
        error={getErrorMessage(errors, 'responsiblePersonName')}
      />

      {/* Responsible person mail */}
      <Input
        label="メールアドレス"
        placeholder="メールアドレスを入力してください"
        register={register('responsiblePersonMail', emailRules(true))}
        autoComplete="off"
        error={getErrorMessage(errors, 'responsiblePersonMail')}
      />

      {/* Phone */}
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
        onInput={(e) => handleHalfWidthInput(e, true)}
        onPaste={handleHalfWidthPaste}
        autoComplete="off"
        error={getErrorMessage(errors, 'contract.phone')}
      />

      {/* Address */}
      <Input
        label="住所"
        placeholder="住所を入力してください"
        register={register('contract.address', {
          required: ADDRESS_REQUIRED_MESSAGE,
          maxLength: {
            value: 255,
            message: FIELD_MAX_LENGTH_255_MESSAGE,
          },
        })}
        autoComplete="off"
        error={getErrorMessage(errors, 'contract.address')}
      />

      {/* Industry */}
      <Controller
        control={control}
        name="contract.industry"
        render={({ field: { onChange, value } }) => {
          const currentValue = value?.other
            ? OTHER_OPTION_VALUE
            : value?.value || '';

          return (
            <SelectionBox
              label="業種"
              type={SelectionBoxType.MONO_SELECT}
              options={
                industryOptions?.map((item) => {
                  if (item.label.includes(NAME_OTHER_OPTION)) {
                    return {
                      label: item.label,
                      value: String(item.value),
                      other: watch('contract.industry.other'),
                    };
                  }
                  return {
                    label: item.label,
                    value: String(item.value),
                  };
                }) || []
              }
              initialValue={
                !industryOptions.find(
                  (item) =>
                    String(item.value) ==
                    String(defaultValues.contract.industry),
                )
                  ? defaultValues.contract.industry?.other || ''
                  : ''
              }
              value={
                typeof currentValue === 'number'
                  ? String(currentValue)
                  : normalizeJapaneseText(currentValue)
              }
              onChange={(val) => {
                const option = industryOptions?.find(
                  (opt) => opt.value === val || String(opt.id) === val,
                );
                onChange(
                  val
                    ? {
                        label: option?.label,
                        value: val,
                      }
                    : null,
                );
              }}
              onOtherTextChange={(other) => {
                const trimmed = other.trim();

                // If user clears input
                if (!trimmed) {
                  onChange(null);
                  return;
                }
                // If already selected OTHER_OPTION
                if (value?.value === OTHER_OPTION_VALUE) {
                  onChange({
                    ...value, // keep existing fields
                    label: trimmed, // update label to full text
                    other: trimmed, // update other to full text
                  });
                } else {
                  // First time selecting OTHER_OPTION
                  onChange({
                    label: trimmed,
                    value: OTHER_OPTION_VALUE,
                    other: trimmed,
                  });
                }
              }}
              placeholder="選択"
              className="w-full shadow-none text-sm !rounded mt-1.5 md:mt-0"
              customStyleClassName={
                errors.contract?.industry?.message
                  ? 'border-[1px] !border-error'
                  : ''
              }
              errorMessage={getErrorMessage(errors, 'contract.industry')}
            />
          );
        }}
        rules={{ required: INDUSTRY_REQUIRED_MESSAGE }}
      />

      {/* System main purpose */}
      <Controller
        control={control}
        name="contract.systemMainPurpose"
        render={({ field: { onChange, value } }) => (
          <SelectionBox
            label="システム導入の主な目的"
            type={SelectionBoxType.MULTIPLE_SELECT}
            disabled={watch('contract.systemMainPurpose')?.length == 2}
            options={
              systemMainPurposeOptions?.map((item) => {
                return {
                  label: item.label,
                  value: String(item.value),
                };
              }) || []
            }
            value={
              Array.isArray(value)
                ? value.map((v) =>
                    v.other
                      ? OTHER_OPTION_VALUE
                      : normalizeJapaneseText(String(v.value)),
                  )
                : []
            }
            onChange={(vals) => {
              onChange(
                Array.isArray(vals)
                  ? vals.map((v) => {
                      const option = systemMainPurposeOptions?.find(
                        (opt) => opt.value === v,
                      );
                      return {
                        label:
                          option && !option.label.includes(NAME_OTHER_OPTION)
                            ? option.label
                            : OTHER_OPTION_VALUE,
                        value: v,
                      };
                    })
                  : [],
              );
            }}
            placeholder={'選択'}
            className="w-full shadow-none text-sm !rounded mt-1.5 md:mt-0"
            customStyleClassName={
              errors.contract?.systemMainPurpose?.message
                ? 'border-[1px] !border-error'
                : ''
            }
            errorMessage={getErrorMessage(errors, 'contract.systemMainPurpose')}
          />
        )}
        rules={{ required: SYSTEM_MAIN_PURPOSE_REQUIRED_MESSAGE }}
      />

      {/* Department */}
      <Controller
        control={control}
        name="contract.department"
        render={({ field: { onChange, value } }) => {
          return (
            <SelectionBox
              label="利用部門"
              type={SelectionBoxType.MULTIPLE_SELECT}
              options={
                departmentOptions?.map((item) => {
                  if (item.label.includes(NAME_OTHER_OPTION)) {
                    return {
                      label: item.label,
                      value: String(item.value),
                      other:
                        watchedDepartment?.find(
                          (d) => d.value == 'other' && d.other,
                        )?.other || '',
                    };
                  }
                  return {
                    label: item.label,
                    value: String(item.value),
                  };
                }) || []
              }
              initialValue={
                defaultValues.contract.department
                  ?.filter((d) => d.other)
                  ?.map((d) => d.other)?.[0] || ''
              }
              value={
                Array.isArray(value)
                  ? value.map((v) =>
                      v.other
                        ? OTHER_OPTION_VALUE
                        : normalizeJapaneseText(String(v.value)),
                    )
                  : []
              }
              onChange={(vals) => {
                const existingOtherItem = value?.find(
                  (item) => item.value == OTHER_OPTION_VALUE,
                );
                onChange(
                  Array.isArray(vals)
                    ? vals.map((v) => {
                        const option = departmentOptions?.find(
                          (opt) => opt.value === v,
                        );
                        return {
                          label:
                            option && !option.label.includes(NAME_OTHER_OPTION)
                              ? option.label
                              : OTHER_OPTION_VALUE,
                          value: v,
                          other:
                            v == OTHER_OPTION_VALUE
                              ? existingOtherItem?.other || ''
                              : undefined,
                        };
                      })
                    : [],
                );
              }}
              onOtherTextChange={(other) => {
                const currentValue = Array.isArray(value) ? value : [];
                const updatedValue = [...currentValue];

                // find by value === OTHER_OPTION_VALUE
                const existingOtherIndex = updatedValue.findIndex(
                  (item) => item.value === OTHER_OPTION_VALUE,
                );

                if (other.trim()) {
                  const otherItem = {
                    label: OTHER_OPTION_VALUE, // keep label as "other"
                    value: OTHER_OPTION_VALUE, // stable value so we can find it later
                    other: other.trim(), // store the real text here
                  };

                  if (existingOtherIndex >= 0) {
                    updatedValue[existingOtherIndex] = otherItem; // replace
                  } else {
                    updatedValue.push(otherItem); // add once
                  }
                } else if (existingOtherIndex >= 0) {
                  updatedValue.splice(existingOtherIndex, 1); // remove if empty
                }

                onChange(updatedValue);
              }}
              placeholder={'選択'}
              className="w-full shadow-none text-sm !rounded mt-1.5 md:mt-0"
              customStyleClassName={
                errors.contract?.department?.message
                  ? 'border-[1px] !border-error'
                  : ''
              }
              errorMessage={getErrorMessage(errors, 'contract.department')}
            />
          );
        }}
        rules={{ required: DEPARTMENT_REQUIRED_MESSAGE }}
      />

      {/* Close Date */}
      <Controller
        control={control}
        name="closeDate"
        render={({ field: { onChange, value } }) => {
          return (
            <Dropdown
              label="締日"
              selectedOption={
                closingDayOptions.find((item) => item.value == value?.value) ||
                undefined
              }
              disabled={
                (companyDetail?.totalUsers && companyDetail?.totalUsers > 0) ||
                false
              }
              options={closingDayOptions}
              onChange={(e) => {
                onChange(e);
              }}
            />
          );
        }}
      />

      {/* Editable After Closing */}
      <Controller
        control={control}
        name="editableAfterClosing"
        render={({ field: { onChange, value } }) => {
          return (
            <Dropdown
              label="修正可能期間"
              selectedOption={
                editableAfterClosingOptions.find(
                  (item) => item.value == value?.value,
                ) || undefined
              }
              disabled={
                (companyDetail?.totalUsers && companyDetail?.totalUsers > 0) ||
                false
              }
              options={editableAfterClosingOptions}
              onChange={(e) => {
                onChange(e);
              }}
            />
          );
        }}
      />

      {/* Monthly fee */}
      <Input
        label="利用料金"
        type="number"
        placeholder="利用料金を入力してください"
        disabled={Boolean(
          watch('plan') && watch('plan')?.value != CompanyPlan.CUSTOM_PLAN,
        )}
        register={register('customPlan.monthlyFee', {
          required: isCustomPlan ? MONTHLY_FEE_REQUIRED_MESSAGE : false,
          min: isCustomPlan
            ? {
                value: 3000,
                message: MIN_MONTHLY_FEE_MESSAGE,
              }
            : undefined,
          max: isCustomPlan
            ? {
                value: 1000000,
                message: MAX_MONTHLY_FEE_MESSAGE,
              }
            : undefined,
          onChange: () => clearErrors('customPlan.monthlyFee'),
        })}
        error={getErrorMessage(errors, 'customPlan.monthlyFee')}
        onWheel={(e) => e.currentTarget.blur()}
        onInput={handleHalfWidthInput}
        onPaste={handleHalfWidthPaste}
      />

      {/* Limit */}
      <Input
        label="ユーザー作成上限"
        type="number"
        placeholder="ユーザー作成上限を入力してください"
        disabled={Boolean(
          watch('plan') && watch('plan')?.value != CompanyPlan.CUSTOM_PLAN,
        )}
        register={register('customPlan.limitPerson', {
          required: isCustomPlan ? LIMIT_PERSON_REQUIRED_MESSAGE : false,
          min: isCustomPlan
            ? {
                value: companyDetail?.totalUsers || 1,
                message: MIN_CUSTOM_LIMIT_PERSON_MESSAGE(
                  companyDetail?.totalUsers || 1,
                ),
              }
            : undefined,
          max: isCustomPlan
            ? {
                value: 300,
                message: MAX_LIMIT_PERSON_MESSAGE,
              }
            : undefined,
          onChange: () => clearErrors('customPlan.limitPerson'),
        })}
        error={getErrorMessage(errors, 'customPlan.limitPerson')}
        onWheel={(e) => e.currentTarget.blur()}
        onInput={handleHalfWidthInput}
        onPaste={handleHalfWidthPaste}
      />

      {/* Exchangeable coins */}
      <Input
        label="毎月のコイン付与数"
        type="number"
        placeholder="毎月のコイン付与数を入力してください"
        disabled={Boolean(
          watch('plan') && watch('plan')?.value != CompanyPlan.CUSTOM_PLAN,
        )}
        register={register('customPlan.exchangeableAmount', {
          required: isCustomPlan ? MONTHLY_COIN_REQUIRED_MESSAGE : false,
          min: isCustomPlan
            ? {
                value: 300,
                message: MIN_MONTHLY_COIN_MESSAGE,
              }
            : undefined,
          max: isCustomPlan
            ? {
                value: 100000,
                message: MAX_MONTHLY_COIN_MESSAGE,
              }
            : undefined,
          onChange: () => clearErrors('customPlan.exchangeableAmount'),
        })}
        error={getErrorMessage(errors, 'customPlan.exchangeableAmount')}
        onWheel={(e) => e.currentTarget.blur()}
        onInput={handleHalfWidthInput}
        onPaste={handleHalfWidthPaste}
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
