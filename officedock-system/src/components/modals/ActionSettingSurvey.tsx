import React, { useContext } from 'react';
import { useMutation } from 'react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import TextAreaLink from '@components/common/TextAreaLink';
import ImageRound from '@components/common/ImageRound';
import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import Input from '@components/common/Input';
import ErrorMessage from '@components/common/ErrorMessage';
import '../survey/style/survey.css';

import {
  ANSWER_VALUE_REQUIRED_MESSAGE,
  DATE_STOP_SURVEY_REQUIRED_MESSAGE,
  ERROR_CREATE_MESSAGE,
  QUESTION_VALUE_REQUIRED_MESSAGE,
} from '@constants/message';
import { apiRouters } from '@constants/routers';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import {
  addTimeToDate,
  formatTimeInput,
  getFilteredTimeOptions,
} from '@utils/date';
import api from '@base/api';
import { SurveyFormData, SurveyRequestData } from '@interfaces/survey';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (title: string) => void;
};

const ActionSettingSurvey = ({ open, onClose, onSuccess }: Props) => {
  const {
    control,
    watch,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<SurveyFormData>({
    defaultValues: {
      question: '',
      answers: [{ value: '' }, { value: '' }],
      endDate: `${new Date()}`,
      endTime: '',
    },
  });
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();

  const { fields, append } = useFieldArray({
    control,
    name: 'answers',
  });

  // Create location API
  const handleCreateSurvey = async (data: SurveyRequestData) => {
    setIsLoading(true);
    return await api.post(apiRouters.SURVEY_LIST, data);
  };

  const { mutate: createSurvey } = useMutation(
    'postCreateSurvey',
    handleCreateSurvey,
    {
      onSuccess: (data) => {
        onSuccess(data.data.title);
      },
      onError: () => {
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
  const endDate = watch('endDate');

  const onSubmit = (data: SurveyFormData) => {
    createSurvey({
      title: data.question,
      endAt: addTimeToDate(new Date(data.endDate), data.endTime),
      questionOptions: data.answers.map((ans) => ans.value),
    });
  };

  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[500px] max-h-[620px] overflow-y-auto !rounded-lg !py-10 px-[30px]"
      isOutSideAction={false}
      onClose={onClose}>
      <form className="survey-custom" onSubmit={handleSubmit(onSubmit)}>
        <div className="text-center text-[18px] font-medium">アンケート</div>

        <div className="mt-3 font-medium text-sm  text-[#77858F]">
          <p className="w-full text-center">
            この画面ではアンケートの設定ができます
          </p>
        </div>
        <div className="mt-[30px]">
          {/* Question */}
          <div>
            <p className="text-button text-sm font-medium">質問</p>
            <div className="h-fit mt-[10px]">
              <Controller
                name="question"
                control={control}
                rules={{ required: QUESTION_VALUE_REQUIRED_MESSAGE }}
                render={({ field }) => (
                  <TextAreaLink
                    className={`rounded-[4px] min-h-[44px] !h-fit border ${!errors.question ? '!border-[#77858F]' : '!border-error'}  whitespace-pre-wrap leading-[22px] tracking-[0] focus:border-none mt-2 !py-0 max-h-[400px] overflow-y-auto focus-visible:border-none focus-visible:outline-none text-sm font-normal flex-1`}
                    initialValue={field.value}
                    onChange={(val) => field.onChange(val)}
                  />
                )}
              />
            </div>

            {errors.question?.message && (
              <ErrorMessage
                error={errors.question?.message}
                className="text-xs mt-1"
              />
            )}
          </div>

          <div className="flex flex-col gap-4 mt-4">
            {fields.map((fieldItem, index) => (
              <div key={fieldItem.id}>
                <p className="text-[#77858F] text-sm font-medium">
                  回答{index + 1}
                </p>
                <div className="flex space-x-2 items-center">
                  <Controller
                    name={`answers.${index}.value` as const}
                    control={control}
                    rules={{ required: ANSWER_VALUE_REQUIRED_MESSAGE }}
                    render={({ field }) => (
                      <TextAreaLink
                        className={`rounded-[4px] min-h-[44px] !h-fit border ${!errors.answers?.[index]?.value?.message ? 'border-[#77858F]' : 'border-error'}  whitespace-pre-wrap leading-[22px] tracking-[0] focus:border-none mt-2 !py-0 max-h-[400px] overflow-y-auto focus-visible:border-none focus-visible:outline-none text-sm font-normal flex-1`}
                        initialValue={field.value}
                        onChange={(val) => field.onChange(val)}
                      />
                    )}
                  />
                  {/* TODO: Handle delete quesion */}
                  {/* {fields.length > 2 && (
                    <ImageRound
                      src="/icons/delete-task.svg"
                      name="Delete icon"
                      onClick={() => remove(index)}
                      className="!w-[14px] relative top-[3px] !h-fit cursor-pointer hover:opacity-80"
                    />
                  )} */}
                </div>
                {errors?.answers?.[index]?.value?.message && (
                  <ErrorMessage
                    error={errors?.answers?.[index]?.value?.message}
                    className="text-xs mt-1"
                  />
                )}
              </div>
            ))}
            <div className="text-right flex justify-center w-full">
              <Button
                sz="sm"
                variant="outline"
                className="w-6 h-6  text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                type="button"
                onClick={() => append({ value: '' })}>
                <ImageRound
                  src="/icons/plus.svg"
                  name="Add organization"
                  className="h-3 w-3"
                />
              </Button>
            </div>
            <div className="w-full">
              <p className="text-button text-sm font-medium mb-[10px]">
                アンケート投票受付終了時間
              </p>
              <div className="flex gap-[6px]  items-center w-full">
                <div className="w-[167px]">
                  <Controller
                    control={control}
                    rules={{ required: DATE_STOP_SURVEY_REQUIRED_MESSAGE }}
                    name="endDate"
                    render={({ field: { value, onChange } }) => (
                      <DatePickerCustom
                        minDate={new Date()}
                        className={`h-[44px] !px-2 !pl-[30px] !border-[1px] ${!errors?.endDate ? '!border-[#77858F]' : '!border-error'} rounded-md !text-xs !pt-2 text-center`}
                        selected={value ? new Date(value) : null}
                        iconSrc="calendar-menu-active"
                        onChange={(e) => {
                          onChange(e);
                        }}
                      />
                    )}
                  />
                </div>
                <div className="w-[91px] relative z-20">
                  <Input
                    isShowClockIcon={true}
                    iconSrc={'clock-survey'}
                    type="text"
                    register={register('endTime', {
                      required: DATE_STOP_SURVEY_REQUIRED_MESSAGE,
                      onBlur: (time) => {
                        const formatted = formatTimeInput(time.target.value);
                        const selectedDate = new Date(endDate);
                        const today = new Date();

                        const isToday =
                          selectedDate.getFullYear() === today.getFullYear() &&
                          selectedDate.getMonth() === today.getMonth() &&
                          selectedDate.getDate() === today.getDate();

                        if (isToday) {
                          const [hStr, mStr] = formatted.split(':');
                          const h = parseInt(hStr, 10);
                          const m = parseInt(mStr, 10);

                          if (isNaN(h) || isNaN(m)) {
                            const nowPlus30 = new Date(
                              today.getTime() + 30 * 60 * 1000,
                            );
                            const hh = String(nowPlus30.getHours()).padStart(
                              2,
                              '0',
                            );
                            const mm = String(nowPlus30.getMinutes()).padStart(
                              2,
                              '0',
                            );
                            setValue('endTime', `${hh}:${mm}`);
                            return;
                          }

                          const formattedMinutes = h * 60 + m;
                          const currentMinutes =
                            today.getHours() * 60 + today.getMinutes();

                          if (formattedMinutes < currentMinutes) {
                            const newDate = new Date(
                              today.getTime() + 30 * 60 * 1000,
                            );
                            const newHours = String(
                              newDate.getHours(),
                            ).padStart(2, '0');
                            const newMinutes = String(
                              newDate.getMinutes(),
                            ).padStart(2, '0');
                            setValue('endTime', `${newHours}:${newMinutes}`);
                            return;
                          }
                        }

                        setValue('endTime', formatted);
                      },
                    })}
                    options={getFilteredTimeOptions(new Date(watch('endDate')))}
                    onChangeDropdown={(e) => {
                      setValue('endTime', e.label);
                    }}
                    classNameOption="!top-[9px]"
                    isBottomOptions={false}
                    className={`h-[44px] !text-xs !pr-1 !pl-10 !border-[1px] rounded-md  ${!errors?.endTime ? '!border-[#77858F]' : '!border-error'}`}
                  />
                </div>
                <div className="flex-grow ml-[4px]">
                  <p className="font-medium text-black text-[13px] ">
                    投票受付終了
                  </p>
                </div>
              </div>
              {(errors.endDate?.message || errors.endTime?.message) && (
                <ErrorMessage
                  error={errors.endDate?.message || errors.endTime?.message}
                  className="text-xs mt-1"
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-3 mt-7  items-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 w-[100px] !px-0">
            キャンセル
          </Button>
          <Button variant="post" type="submit" className="h-9 w-[100px] !px-0">
            投稿する
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ActionSettingSurvey;
