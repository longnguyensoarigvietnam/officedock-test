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
  PHONE_NUMBER_WRONG_FORMAT,
  PHONE_REQUIRED_MESSAGE,
  RESPONSIBLE_PERSON_NAME_REQUIRED_MESSAGE,
  STATUS_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
  SYSTEM_MAIN_PURPOSE_REQUIRED_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  CompanyStatus,
  SelectionBoxType,
  ServerStatusCode,
} from '@constants/enums';
import {
  HALF_WIDTH_DIGIT_REGEX,
  ONLY_DIGITS_REGEX,
  PHONE_REGEX,
} from '@constants/regex';
import {
  MAX_PHONE_NUMBER_LENGTH,
  NAME_OTHER_OPTION,
  OTHER_OPTION_VALUE,
} from '@constants';

import useCompanyDetail from '@hooks/useDetailCompany';
import useCommonCreationData from '@hooks/useCommonCreationData';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { OptionDropdownType } from '@interfaces/common';
import { EditCompanyRequest } from '@interfaces/company';

import { emailRules } from '@utils/validators';
import { normalizeJapaneseText } from '@utils';

import api from '@base/api';

interface EditCompanyType {
  id?: number;
  name: string;
  plan?: string | null;
  status?: OptionDropdownType;
  paymentMethod?: string | null;
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
      responsiblePersonName: '',
      responsiblePersonMail: '',
      contract: {
        phone: '',
        address: '',
        industry: undefined,
        department: undefined,
        systemMainPurpose: undefined,
      },
    };

    if (companyDetail) {
      value.id = companyDetail.id;
      value.name = companyDetail.name;
      value.plan = companyDetail.plan?.name || '';
      value.status = companyDetail.status
        ? {
            label: companyDetail.status,
            value: companyDetail.status,
          }
        : undefined;

      value.paymentMethod = companyDetail.paymentMethod;
      value.responsiblePersonName = companyDetail?.responsiblePersonName;
      value.responsiblePersonMail = companyDetail?.responsiblePersonMail;
      value.contract.phone = companyDetail.contract?.phone;
      value.contract.address = companyDetail.contract?.address;

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
        const data = error?.response?.data as
          | Record<string, string[]>
          | undefined;

        const firstErrorMessage =
          data && Object.keys(data).length > 0
            ? data[Object.keys(data)[0]]?.[0] // first field → first message
            : ERROR_UPDATE_MESSAGE;

        showToast({
          variant: 'error',
          description: firstErrorMessage || ERROR_UPDATE_MESSAGE,
        });
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
      ...data,
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
        register={register('responsiblePersonName', {
          required: RESPONSIBLE_PERSON_NAME_REQUIRED_MESSAGE,
        })}
        autoComplete="off"
        error={errors?.responsiblePersonName?.message}
      />
      <Input
        label="メールアドレス"
        placeholder="メールアドレスを入力してください"
        register={register('responsiblePersonMail', emailRules(true))}
        autoComplete="off"
        error={errors?.responsiblePersonMail?.message}
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

          // If the value is longer than 11, remove the last added character
          if (e.currentTarget.value.length > MAX_PHONE_NUMBER_LENGTH) {
            e.currentTarget.value = e.currentTarget.value.replace(/.$/, '');
          }
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
            />
          );
        }}
        rules={{ required: INDUSTRY_REQUIRED_MESSAGE }}
      />
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
                    v.other ? OTHER_OPTION_VALUE : normalizeJapaneseText(String(v.value)),
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
            errorMessage={errors.contract?.systemMainPurpose?.message}
          />
        )}
        rules={{ required: SYSTEM_MAIN_PURPOSE_REQUIRED_MESSAGE }}
      />
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
                      v.other ? OTHER_OPTION_VALUE : normalizeJapaneseText(String(v.value)),
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
              errorMessage={errors.contract?.department?.message}
            />
          );
        }}
        rules={{ required: DEPARTMENT_REQUIRED_MESSAGE }}
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
