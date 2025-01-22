'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
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
  END_DATE_MUST_BE_GREATER_THAN_START_DATE,
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  FIELD_REQUIRED,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import { STATUS_TERM } from '@constants/term';
import { ServerStatusCode, StatusTerm, TermType } from '@constants/enums';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import useDetailTerm from '@hooks/useDetailTerm';
import { CreateTermFormData, TermFormDataRequest } from '@interfaces/term';
import { OptionDropdownType } from '@interfaces/common';
import { formatDate } from '@utils/date';
import { isContentEmpty } from '@utils';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const EditTermForm = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();
  const [minDatePlan, setMinDatePlan] = useState<Date | null>();
  const showErrorToast = useErrorToast();

  const { termDetail } = useDetailTerm({
    termId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.TERMS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  const {
    control,
    watch,
    register,
    reset,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTermFormData>({
    mode: 'onSubmit',
    defaultValues: {
      status: {
        label: termDetail?.status,
        value: termDetail?.status,
      } as OptionDropdownType,
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

  const defaultValues = useMemo<CreateTermFormData>(() => {
    const value: CreateTermFormData = {
      title: '',
      status: {
        label: '',
        value: '',
      },
      periodStart: '',
      periodEnd: '',
      description: '',
    };

    if (termDetail) {
      value.title = termDetail.title || '';
      value.status = {
        label: termDetail.status,
        value: termDetail.status,
      } as OptionDropdownType;
      value.periodStart = termDetail.periodStart || '';
      value.periodEnd = termDetail.periodEnd || '';
      value.description = termDetail.description || '';
    }

    return value;
  }, [termDetail]);

  // Update default value
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Handle submit edit term
  const handleEditTerm = async (data: TermFormDataRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TERM_DETAIL(params.id), data);
  };

  const { mutate: editTerm } = useMutation('postEditTerm', handleEditTerm, {
    onSuccess: () => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      router.push(pageRouters.TERMS_MANAGEMENT.href);
    },
    onError: (error: AxiosError) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit: SubmitHandler<CreateTermFormData> = (data) => {
    editTerm({
      description: data.description,
      periodStart: data.periodStart ? formatDate(data.periodStart) : null,
      periodEnd: data.periodEnd ? formatDate(data.periodEnd) : null,
      status: `${(data.status as OptionDropdownType).value}`,
      title: data.title,
      type: TermType.TERM_OF_USE,
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
                    render={({ field: { onChange, value } }) => {
                      return (
                        <>
                          <Dropdown
                            label="ステータス"
                            options={STATUS_TERM}
                            className={`w-full ${termDetail?.isConfirmed && '!opacity-55'}`}
                            selectedOption={STATUS_TERM.find(
                              (element) =>
                                element.value ===
                                (value as OptionDropdownType)?.value,
                            )}
                            onChange={onChange}
                            disabled={termDetail?.isConfirmed ? true : false}
                          />
                        </>
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex gap-3">
          <div className="w-1/2 flex flex-col gap-2">
            <div className="w-full flex items-start justify-start gap-1">
              <div className={`w-1/2 h-20`}>
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
                      className={`${termDetail?.isConfirmed && '!opacity-55'}`}
                      minDate={new Date()}
                      disabled={termDetail?.isConfirmed ? true : false}
                    />
                  )}
                />
                <ErrorMessage
                  error={errors.periodStart?.message}
                  className="mt-[5px] mb-[-15px] text-xs"
                />
              </div>
              <p className="mb-3 mt-10">~</p>
              <div className="w-1/2 h-20">
                <Controller
                  control={control}
                  name="periodEnd"
                  rules={{
                    validate: (value) => {
                      const periodStart = watch('periodStart');
                      if (value && periodStart)
                        return (
                          new Date(value) > new Date(periodStart) ||
                          END_DATE_MUST_BE_GREATER_THAN_START_DATE
                        );
                    },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="有効期間終了日"
                      placeholder="yyyy/mm/dd"
                      selected={value ? new Date(value) : null}
                      onChange={onChange}
                      minDate={
                        minDatePlan
                          ? new Date(
                              minDatePlan.getTime() + 24 * 60 * 60 * 1000,
                            )
                          : undefined
                      }
                    />
                  )}
                />
                <ErrorMessage
                  error={errors.periodEnd?.message}
                  className="mt-[5px] mb-[-15px] text-xs"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <Input
            label="タイトル"
            className={`focus:border-gray-200 focus:shadow-none ${termDetail?.isConfirmed && '!opacity-55'}`}
            required={
              (watch('status') as OptionDropdownType)?.value ==
              StatusTerm.PUBLIC
                ? true
                : false
            }
            placeholder="タイトルを入力してください"
            register={register('title', {
              required:
                (watch('status') as OptionDropdownType)?.value ==
                StatusTerm.PUBLIC
                  ? FIELD_REQUIRED
                  : false,
            })}
            disabled={termDetail?.isConfirmed ? true : false}
          />
          <ErrorMessage
            error={errors.title?.message}
            className="mt-[7px] mb-[-10px] text-xs"
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
              <div className="w-[80vw] max-w-full">
                <ReactQuill
                  {...field}
                  value={editorContent}
                  modules={modules}
                  onChange={field.onChange}
                  className={`quill-editor ${termDetail?.isConfirmed && '!opacity-55'}`}
                  readOnly={termDetail?.isConfirmed ? true : false}
                />
              </div>
            )}
          />
          <ErrorMessage
            error={errors.description?.message}
            className="mt-[7px] mb-[-10px] text-xs"
          />
        </div>
        <div className="w-full flex items-center gap-4 mt-8 flex-col">
          <Button type="submit" className="w-[426px]">
            編集
          </Button>
          <Button
            variant="secondary"
            type="button"
            className="w-[426px]"
            onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTermForm;
