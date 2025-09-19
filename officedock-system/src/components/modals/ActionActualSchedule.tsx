import {
  ChangeEvent,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Modal from '../common/Modal';
import Button from '../common/Button';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import {
  DATE_REQUIRED_DURATION,
  END_DATE_WRONG_SELECTED,
  ERROR_MESSAGE_TIME_TASK,
} from '@constants/message';
import ErrorMessage from '@components/common/ErrorMessage';
import {
  addTimeToDate,
  convertDateToStartDate,
  convertToMinutes,
  convertToTimeString,
  formatTimeInput,
  generateTimeOptionsAsObjects,
} from '@utils/date';
import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import Input from '@components/common/Input';
import { useMutation, useQueryClient } from 'react-query';
import { NO_SETTING } from '@constants';
import { apiRouters } from '@constants/routers';
import api from '@base/api';
import { LoadingContext } from '@providers/LoadingProvider';
import { TaskActualType } from '@interfaces/task';

export type ActionActualScheduleProps = {
  open: boolean;
  title: string;
  data?: {
    uuid: string;
    start: string;
    end: string;
  };
  onClose: () => void;
  onSubmit: (data: TaskActualType[], uuid: string) => void;
};

interface ActionFormActualType {
  uuid: string;
  startedAtDate?: Date | null;
  pausedAtDate?: Date | null;
  startedAtTime: string | null;
  pausedAtTime: string | null;
}

const ActionActualSchedule = memo(
  ({ open, title, data, onClose, onSubmit }: ActionActualScheduleProps) => {
    const { setIsLoading } = useContext(LoadingContext);

    const queryClient = useQueryClient();

    const {
      control,
      watch,
      handleSubmit,
      getValues,
      setValue,
      setError,
      register,
      reset,
      formState: { errors },
    } = useForm<ActionFormActualType>({
      mode: 'onSubmit',
    });

    const currentDate = new Date();

    const [time, setTime] = useState<string>('');
    const [minDatePlan, setMinDatePlan] = useState<Date | null>();
    const defaultValues = useMemo<ActionFormActualType>(() => {
      const value: ActionFormActualType = {
        uuid: '',
        startedAtDate: null,
        startedAtTime: '',
        pausedAtTime: '',
        pausedAtDate: null,
      };
      if (data) {
        value.uuid = data.uuid;
        (value.startedAtDate = data.start
          ? new Date(convertDateToStartDate(data.start))
          : null),
          (value.pausedAtDate = data.end
            ? new Date(convertDateToStartDate(data.end))
            : null),
          (value.startedAtTime = data.start
            ? convertToTimeString(`${data.start}`)
            : ''),
          (value.pausedAtTime = data.end
            ? convertToTimeString(`${data.end}`)
            : '');
        if (data.start) {
          setMinDatePlan(new Date(data.start));
        }
      }
      return value;
    }, [data]);

    useEffect(() => {
      reset(defaultValues);
    }, [data?.uuid]);

    // Update actual for task
    const handleUpdateActualTime = async ({
      uuid,
      data,
    }: {
      uuid: string;
      data: { startedAt: string | null; pausedAt: string | null };
    }) => {
      setIsLoading(true);

      return await api.patch(apiRouters.UPDATE_TASK_ACTUAL(`${uuid}`), data);
    };
    const { mutate: updateDataModalActualTime } = useMutation(
      'postUpdateDataModalActualTime',
      handleUpdateActualTime,
      {
        onSuccess: async (response, variable) => {
          const data = response.data as TaskActualType[];
          queryClient.refetchQueries(['getDataTaskHeaderList']);

          onSubmit(data, variable.uuid);
        },
        onError: () => {
          setError('pausedAtDate', {
            message: ERROR_MESSAGE_TIME_TASK,
          });
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );

    const handleChange = (
      e: ChangeEvent<HTMLInputElement>,
      field: keyof ActionFormActualType,
    ): void => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 4) {
        value = value.substring(0, 4);
      }
      setTime(value);
      setValue(field, value);
    };
    const onSubmitForm: SubmitHandler<ActionFormActualType> = (dataTask) => {
      updateDataModalActualTime({
        uuid: dataTask.uuid,
        data: {
          startedAt:
            dataTask.startedAtDate && dataTask.startedAtTime
              ? addTimeToDate(
                  dataTask.startedAtDate as Date,
                  dataTask.startedAtTime,
                )
              : null,
          pausedAt:
            dataTask.pausedAtDate && dataTask.pausedAtTime
              ? addTimeToDate(
                  dataTask.pausedAtDate as Date,
                  dataTask.pausedAtTime,
                )
              : null,
        },
      });
    };
    const optionTimeInput = generateTimeOptionsAsObjects();

    return (
      <Modal
        open={open}
        className="font-primary bg-white w-[700px] !rounded-2xl py-4"
        onClose={onClose}
        title={title || NO_SETTING}>
        <div className="text-sm text-gray-700">
          <div className="flex flex-col gap-2 w-full">
            <div className="w-full">計測時間</div>
            <div className="w-full flex flex-col gap-1 items-start mb-7">
              <div className="w-full flex gap-2 items-start">
                <div className="w-[320px] !h-[46px]">
                  <div className="flex gap-1">
                    <div className="w-[220px]">
                      <Controller
                        control={control}
                        name="startedAtDate"
                        rules={{
                          required: DATE_REQUIRED_DURATION,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[46px] !text-sm !pt-2 !pl-6 text-center"
                            customizedClassName="customized-datepicker"
                            selected={value ? new Date(value) : null}
                            onChange={(e) => {
                              onChange(e);
                              setError('pausedAtDate', {
                                message: '',
                              });
                              if (e !== null) {
                                const newDate = new Date(e.getTime());
                                setMinDatePlan(newDate);
                              } else {
                                setMinDatePlan(null);
                              }
                              if (!getValues('startedAtTime')) {
                                setValue(
                                  'startedAtTime',
                                  convertToTimeString(`${currentDate}`),
                                );
                              }
                              setValue('pausedAtDate', null);
                              setValue('pausedAtTime', '');
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="w-[90px] relative">
                      <Input
                        isShowClockIcon={true}
                        valueInput={watch(`startedAtTime`)}
                        register={register('startedAtTime', {
                          required:
                            watch('startedAtDate') !== null ? true : false,
                          onChange: (e) => {
                            handleChange(e, 'startedAtTime');
                            setError('pausedAtDate', {
                              message: '',
                            });
                            if (getValues('startedAtDate') === null) {
                              setValue(
                                'startedAtDate',
                                (() => {
                                  const today: Date = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return today;
                                })(),
                              );
                              setValue('pausedAtDate', null);
                              setValue('startedAtTime', '');
                              setMinDatePlan(new Date());
                            }
                          },
                          onBlur: () => {
                            if (time) {
                              setValue('startedAtTime', formatTimeInput(time));
                            }
                            setTime('');
                          },
                        })}
                        options={optionTimeInput}
                        classNameOption="top-6"
                        onChangeDropdown={(e) => {
                          setValue(`startedAtTime`, e.label);
                          setError('pausedAtDate', {
                            message: '',
                          });
                          if (getValues(`startedAtDate`) === null) {
                            setValue(
                              `startedAtDate`,
                              (() => {
                                const today: Date = new Date();
                                today.setHours(0, 0, 0, 0);
                                return today;
                              })(),
                            );

                            setMinDatePlan(new Date());
                          }
                        }}
                        autoComplete="off"
                        type="text"
                        className="h-[46px] !text-sm !pl-6 text-center"
                      />
                    </div>
                  </div>
                  <ErrorMessage
                    error={errors.startedAtDate?.message}
                    className="mt-[5px] mb-[5px] text-md"
                  />
                </div>
                <div className="!h-[46px] flex items-center">〜</div>
                <div className="w-[320px] !h-[46px]">
                  <div className="flex gap-1">
                    <div className="w-[220px]">
                      <Controller
                        control={control}
                        name="pausedAtDate"
                        rules={{
                          required: watch('startedAtDate')
                            ? DATE_REQUIRED_DURATION
                            : false,
                        }}
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            className="h-[46px] !px-2 !text-sm !pt-2 !pl-6 text-center"
                            selected={value ? new Date(value) : null}
                            minDate={minDatePlan}
                            onChange={(e) => {
                              onChange(e);
                              setError('pausedAtDate', {
                                message: '',
                              });
                              if (!getValues('pausedAtTime')) {
                                setValue(
                                  'pausedAtTime',
                                  convertToTimeString(`${currentDate}`),
                                );
                              }
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="w-[90px] relative">
                      <Input
                        isShowClockIcon={true}
                        valueInput={watch(`pausedAtTime`)}
                        register={register('pausedAtTime', {
                          required:
                            watch('pausedAtDate') !== null ? true : false,
                          validate: (value) => {
                            if (
                              new Date(
                                `${watch('pausedAtDate')}`,
                              )?.getTime() ===
                                new Date(
                                  `${watch('startedAtDate')}`,
                                )?.getTime() &&
                              watch('pausedAtDate') !== null
                            ) {
                              return (
                                (value &&
                                  convertToMinutes(value) >
                                    convertToMinutes(
                                      watch('startedAtTime') as string,
                                    )) ||
                                END_DATE_WRONG_SELECTED
                              );
                            }
                            return true;
                          },
                          onChange: (e) => {
                            handleChange(e, 'pausedAtTime');
                            setError('pausedAtDate', {
                              message: '',
                            });
                            if (getValues('pausedAtDate') === null) {
                              if (getValues('startedAtDate') !== null) {
                                setValue(
                                  'pausedAtDate',
                                  getValues('startedAtDate'),
                                );
                              } else {
                                setValue(
                                  'pausedAtDate',
                                  (() => {
                                    const today: Date = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return today;
                                  })(),
                                );
                              }
                            }
                          },
                          onBlur: (e) => {
                            if (time) {
                              setValue(`pausedAtTime`, formatTimeInput(time));
                            }
                            if (
                              watch(`pausedAtDate`)?.getTime() ===
                                watch(`startedAtDate`)?.getTime() &&
                              watch(`pausedAtDate`) !== null
                            ) {
                              if (
                                e.target.value &&
                                watch(`startedAtTime`) &&
                                convertToMinutes(e.target.value) >
                                  convertToMinutes(`${watch(`startedAtTime`)}`)
                              ) {
                                setError(`pausedAtTime`, {
                                  message: '',
                                });
                              } else {
                                setError(`pausedAtTime`, {
                                  message: END_DATE_WRONG_SELECTED,
                                });
                              }
                            }

                            setTime('');
                          },
                        })}
                        classNameOption="top-6"
                        options={optionTimeInput}
                        onChangeDropdown={(e) => {
                          setValue(`pausedAtTime`, e.label);
                          setError('pausedAtDate', {
                            message: '',
                          });
                          if (getValues(`pausedAtDate`) === null) {
                            if (getValues(`startedAtDate`) !== null) {
                              setValue(
                                `pausedAtDate`,
                                getValues(`startedAtDate`),
                              );
                            } else {
                              setValue(
                                `pausedAtDate`,
                                (() => {
                                  const today: Date = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return today;
                                })(),
                              );
                            }
                          }
                          if (
                            watch(`pausedAtDate`)?.getTime() ===
                              watch(`startedAtDate`)?.getTime() &&
                            watch(`pausedAtDate`) !== null
                          ) {
                            if (
                              e.label &&
                              watch(`startedAtTime`) &&
                              convertToMinutes(e.label) >
                                convertToMinutes(`${watch(`startedAtTime`)}`)
                            ) {
                              setError(`pausedAtTime`, {
                                message: '',
                              });
                            } else {
                              setError(`pausedAtTime`, {
                                message: END_DATE_WRONG_SELECTED,
                              });
                            }
                          }
                        }}
                        type="text"
                        className="h-[46px] !text-sm !pl-6 text-center"
                      />
                    </div>
                  </div>
                  <ErrorMessage
                    error={errors.pausedAtTime?.message}
                    className="mt-[5px] mb-[5px] text-md"
                  />
                </div>
              </div>
              <div className="">
                <ErrorMessage
                  error={errors.pausedAtDate?.message}
                  className="mt-[5px] mb-[5px] text-md"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="border-t mt-4 pt-2  border-solid border-gray-100 gap-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-transparent w-[107px] rounded-xl h-10">
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmitForm)}
            className={`w-[107px] rounded-xl h-10`}>
            保存
          </Button>
        </div>
      </Modal>
    );
  },
);

export default ActionActualSchedule;
