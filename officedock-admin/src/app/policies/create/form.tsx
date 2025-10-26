'use client';
import { useContext, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';
import 'react-quill/dist/quill.snow.css';

import Button from '@components/common/Button';
import Input from '@components/common/Input';
import DatePicker from '@components/common/DatePicker';
import Dropdown from '@components/common/Dropdown';
import ErrorMessage from '@components/common/ErrorMessage';

import {
  ERROR_CREATE_MESSAGE,
  FIELD_MAX_LENGTH_255_MESSAGE,
  FIELD_REQUIRED,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { STATUS_TERM } from '@constants/term';
import { StatusTerm, TermType } from '@constants/enums';
import { ONE_DAY_IN_MS } from '@constants';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { CreateTermFormData, TermFormDataRequest } from '@interfaces/term';
import { OptionDropdownType } from '@interfaces/common';

import { formatDate } from '@utils/date';
import {
  getErrorMessage,
  handleServerFormErrors,
  isContentEmpty,
} from '@utils';

import { useErrorToast } from '@hooks/useErrorToast';

import api from '@base/api';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const CreatePolicyForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const showErrorToast = useErrorToast();

  const statusFilter: OptionDropdownType[] = [...STATUS_TERM];

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateTermFormData>({
    mode: 'onSubmit',
    defaultValues: {
      status: {
        label: StatusTerm.DRAFT,
        value: StatusTerm.DRAFT,
      },
    },
  });

  const editorContent = watch('description');

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline'],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
    ],
  };

  const handleCreatePolicy = async (data: TermFormDataRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.TERM_LIST, data);
  };

  const { mutate: createPolicy } = useMutation(
    'postCreatePolicy',
    handleCreatePolicy,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        router.push(pageRouters.POLICIES_MANAGEMENT.href);
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);

        handleServerFormErrors<CreateTermFormData>(error, setError, control);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateTermFormData> = (data) => {
    createPolicy({
      description: data.description,
      periodStart: data.periodStart ? formatDate(data.periodStart) : null,
      periodEnd: data.periodEnd ? formatDate(data.periodEnd) : null,
      status: `${(data.status as OptionDropdownType).value}`,
      title: data.title,
      type: TermType.PRIVACY_POLICY,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        className="w-full flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-4">
          <div className="w-full flex gap-4">
            <div className="w-1/2 flex flex-col gap-2">
              <div className="w-full flex items-end gap-4">
                <div className="w-[48.8%]">
                  <Controller
                    control={control}
                    name="status"
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="ステータス"
                        options={statusFilter}
                        className="w-full"
                        selectedOption={statusFilter.find(
                          (element) =>
                            element.value ===
                            (value as OptionDropdownType).value,
                        )}
                        onChange={(option) => {
                          clearErrors([
                            'status',
                            'title',
                            'description',
                            'periodEnd',
                            'periodStart',
                          ]);
                          onChange(option);
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={`w-full ${getErrorMessage(errors, 'periodStart') || getErrorMessage(errors, 'periodEnd') ? 'mb-4' : ''}`}>
          <div className="w-1/2">
            <div className="w-full flex items-start justify-start gap-1">
              <div className="w-1/2 h-20">
                <Controller
                  control={control}
                  name="periodStart"
                  rules={{
                    required:
                      (watch('status') as OptionDropdownType)?.value ==
                      StatusTerm.PUBLIC
                        ? FIELD_REQUIRED
                        : false,
                  }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="有効期間開始日"
                      placeholder="yyyy/mm/dd"
                      required={
                        (watch('status') as OptionDropdownType)?.value ==
                        StatusTerm.PUBLIC
                          ? true
                          : false
                      }
                      selected={value ? new Date(value) : null}
                      onChange={(e) => {
                        onChange(e);
                        if (e !== null) {
                          const newDate = new Date(e.getTime());
                          setMinDatePlan(newDate);
                        } else {
                          setMinDatePlan(null);
                        }
                        setValue('periodEnd', null);
                      }}
                      minDate={new Date()}
                      error={getErrorMessage(errors, 'periodStart')}
                    />
                  )}
                />
              </div>
              <p className="mb-3 mt-10">~</p>
              <div className="w-1/2 h-20">
                <Controller
                  control={control}
                  name="periodEnd"
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="有効期間終了日"
                      placeholder="yyyy/mm/dd"
                      selected={value ? new Date(value) : null}
                      onChange={onChange}
                      minDate={
                        minDatePlan
                          ? new Date(minDatePlan.getTime() + ONE_DAY_IN_MS)
                          : new Date()
                      }
                      error={getErrorMessage(errors, 'periodEnd')}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full">
          <Input
            label="タイトル"
            placeholder="タイトルを入力してください"
            className="focus:border-gray-200 focus:shadow-none"
            required={
              (watch('status') as OptionDropdownType)?.value ==
              StatusTerm.PUBLIC
                ? true
                : false
            }
            register={register('title', {
              required:
                (watch('status') as OptionDropdownType)?.value ==
                StatusTerm.PUBLIC
                  ? FIELD_REQUIRED
                  : false,
              maxLength: {
                value: 255,
                message: FIELD_MAX_LENGTH_255_MESSAGE,
              },
            })}
            error={getErrorMessage(errors, 'title')}
          />
        </div>
        <div className="w-full">
          <div className="relative">
            <p className="text-sm mb-2">内容</p>
            {(watch('status') as OptionDropdownType)?.value ==
              StatusTerm.PUBLIC && (
              <p className="text-error font-bold absolute left-[30px] top-0">{`*`}</p>
            )}
          </div>
          <Controller
            name="description"
            control={control}
            rules={{
              validate: (value) => {
                const statusValue = (watch('status') as OptionDropdownType)
                  ?.value;
                if (statusValue === StatusTerm.PUBLIC) {
                  return !isContentEmpty(value || '') || FIELD_REQUIRED;
                }
                return true;
              },
            }}
            render={({ field }) => (
              <div className="max-w-full">
                <ReactQuill
                  {...field}
                  value={editorContent}
                  modules={modules}
                  onChange={field.onChange}
                  className="quill-editor"
                />
              </div>
            )}
          />
          <ErrorMessage
            error={getErrorMessage(errors, 'description')}
            className="mt-[7px] mb-[-10px]"
          />
        </div>
        <div className="w-full flex items-center gap-4 mt-8 flex-col">
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

export default CreatePolicyForm;
