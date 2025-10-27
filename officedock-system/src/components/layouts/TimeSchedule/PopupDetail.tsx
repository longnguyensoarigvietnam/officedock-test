import React, { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import { ActionTask, ItemStartType, StatusValueTask } from '@constants/enums';
import { ERROR_DELETE_TASK_RUNNING } from '@constants/message';
import { useToast } from '@providers/ToastProvider';
import {
  combineDateAndTime,
  convertToCurrentTimezone,
  convertToMinutesNumber,
  formatCurrentDay,
  formatShowDeadlineTask,
  formatTime24h,
  formatTimeInput,
  isEndTimeLater,
  isEndTimeValidNow,
  isOverlappingWithOthers,
  isTimeEarlier,
  isTodaySchedule,
} from '@utils/date';
import { TaskTimeSchedule } from '@interfaces/task';

type Props = {
  title: string;
  isCalculation: boolean;
  startEditable?: boolean;
  largeColor: string;
  resourcePlan: boolean | 0 | undefined;
  isShowAction: boolean;
  planStartDate: string;
  planEndDate: string;
  checkDeadline: boolean;
  isStart: boolean;
  uuid: string;
  deadline: string;
  isImportant: boolean;
  taskTimeScheduleList: TaskTimeSchedule[];
  setIsShowAction: (show: boolean) => void;
  setIsHovering: (show: boolean) => void;
  statusId: number;
  handleChangeStartTime: (
    e: ChangeEvent<HTMLInputElement>,
    endDate: string,
    uuid: string,
    resourcePlan: boolean,
    isCalculation?: boolean,
  ) => void;
  handleChangeEndTime: (
    e: ChangeEvent<HTMLInputElement>,
    startDate: string,
    uuid: string,
    resourcePlan: boolean,
  ) => void;
  taskId: number;
  scheduleId: number;

  deletePlanTask: (uuid: string, taskId: number) => void;
  deleteActualTask: (uuid: string) => void;
  setIdTaskEditSelected: Dispatch<SetStateAction<string>>;
  handleStartStopTask: (e: any) => Promise<void>;
};

const PopupDetail = ({
  title,
  planEndDate,
  checkDeadline,
  planStartDate,
  statusId,
  taskId,
  scheduleId,
  deadline,
  isImportant,
  uuid,
  isStart,
  isCalculation,
  largeColor,
  resourcePlan,
  isShowAction,
  startEditable,
  taskTimeScheduleList,
  setIsShowAction,
  handleChangeStartTime,
  handleChangeEndTime,
  deletePlanTask,
  deleteActualTask,
  setIsHovering,
  setIdTaskEditSelected,
  handleStartStopTask,
}: Props) => {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();

  const handleSetParam = ({
    id,
    action,
    type = ItemStartType.TASK,
  }: {
    id: string | null;
    action: string;
    type?: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.set('type', type);
    params.set('action', action);
    router.push(`?${params.toString()}`);
  };
  const [valueStart, setValueStart] = useState(
    formatTime24h(String(new Date(convertToCurrentTimezone(planStartDate)))),
  );
  const [valueEnd, setValueEnd] = useState(
    formatTime24h(String(new Date(convertToCurrentTimezone(planEndDate)))),
  );

  const isToday = isTodaySchedule(
    new Date(convertToCurrentTimezone(planStartDate)),
  );

  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-[#77858F] text-xs font-medium">
          {resourcePlan ? '予定' : '実績'}
        </span>
        <div className="flex gap-x-[6px] items-center justify-center">
          <div
            onClick={() => setIsShowAction(!isShowAction)}
            className={`rounded-full cursor-pointer w-6 h-6  flex items-center justify-center  ${isShowAction && 'bg-[#E3EAED]'}`}>
            <ImageRound
              src={`/icons/more-black.svg`}
              name="more"
              className="w-fit h-fit"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-x-1 items-center mt-[10px]">
        <div
          style={{
            backgroundColor: largeColor,
          }}
          className="w-3 h-3 rounded-full"></div>
        <span className="text-black max-w-[180px] font-bold text-base truncate">
          {title}
        </span>
      </div>
      <div className="text-[#77858F] text-xs  font-medium flex items-center gap-x-[6px] mt-4">
        <div className="flex gap-1 items-center">
          <span>開始</span>
          <div className="w-12">
            <Input
              type="text"
              value={valueStart}
              onChange={(e) => {
                setValueStart(e.target.value);
              }}
              disabled={
                (startEditable == false && resourcePlan) ||
                (resourcePlan == false && !isCalculation)
              }
              onBlur={(e) => {
                if (resourcePlan) {
                  const data = isTimeEarlier(
                    formatTimeInput(
                      `${convertToMinutesNumber(e.target.value)}`,
                    ),
                    isCalculation
                      ? formatCurrentDay()
                      : formatTime24h(planEndDate),
                  );
                  if (data) {
                    setValueStart(
                      formatTimeInput(
                        `${convertToMinutesNumber(e.target.value)}`,
                      ),
                    );
                    handleChangeStartTime(
                      e,
                      planEndDate,
                      uuid,
                      resourcePlan || false,
                    );
                  } else {
                    setValueStart(formatTime24h(planStartDate));
                  }
                } else {
                  const data = isTimeEarlier(
                    formatTimeInput(
                      `${convertToMinutesNumber(e.target.value)}`,
                    ),
                    isCalculation
                      ? formatCurrentDay()
                      : formatTime24h(planEndDate),
                  );
                  const isCheck = isOverlappingWithOthers({
                    itemCompare: {
                      uuid: uuid,
                      taskId: taskId,
                      scheduleId: scheduleId,
                      start: new Date(
                        combineDateAndTime(
                          new Date(planStartDate),
                          `${formatTimeInput(`${convertToMinutesNumber(e.target.value)}`)}`,
                        ),
                      ),
                      end: new Date(planEndDate),
                    },
                    items: taskTimeScheduleList,
                  });

                  if (data && !isCheck) {
                    setValueStart(
                      formatTimeInput(
                        `${convertToMinutesNumber(e.target.value)}`,
                      ),
                    );
                    handleChangeStartTime(
                      e,
                      planEndDate,
                      uuid,
                      resourcePlan || false,
                      isCalculation,
                    );
                  } else {
                    setValueStart(formatTime24h(planStartDate));
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="!w-[50px] !h-[30px] !py-0 bg-[#EBF1F7] text-black !text-xs !pb-[2px] font-normal rounded-[3px] !px-0 text-center !border-none  !opacity-100"
            />
          </div>
        </div>
        <p>~</p>
        <div className="flex gap-1 items-center">
          <span>終了</span>
          <span className="text-base font-normal text-black">
            {isCalculation && !resourcePlan ? (
              <span className="text-[#77858F] text-xs relative top-[-1px]">
                計測中
              </span>
            ) : (
              <Input
                type="text"
                value={valueEnd}
                onChange={(e) => {
                  setValueEnd(e.target.value);
                }}
                disabled={startEditable == false || resourcePlan == false}
                onBlur={(e) => {
                  if (!resourcePlan) {
                    if (isCalculation) {
                      setValueEnd(formatTime24h(planEndDate));
                      return;
                    }
                    if (isToday) {
                      const data = isEndTimeValidNow(
                        formatTime24h(planStartDate),
                        formatTimeInput(
                          `${convertToMinutesNumber(e.target.value)}`,
                        ),
                      );
                      const isCheck = isOverlappingWithOthers({
                        itemCompare: {
                          uuid: uuid,
                          taskId: taskId,
                          scheduleId: scheduleId,
                          start: new Date(planStartDate),
                          end: new Date(
                            combineDateAndTime(
                              new Date(planStartDate),
                              `${formatTimeInput(`${convertToMinutesNumber(e.target.value)}`)}`,
                            ),
                          ),
                        },
                        items: taskTimeScheduleList,
                      });

                      if (data && !isCheck) {
                        setValueEnd(
                          formatTimeInput(
                            `${convertToMinutesNumber(e.target.value)}`,
                          ),
                        );
                        handleChangeEndTime(
                          e,
                          planStartDate,
                          uuid,
                          resourcePlan || false,
                        );
                      } else {
                        setValueEnd(formatTime24h(planEndDate));
                      }
                    } else {
                      const data = isEndTimeLater(
                        formatTime24h(planStartDate),
                        formatTimeInput(
                          `${convertToMinutesNumber(e.target.value)}`,
                        ),
                      );
                      const isCheck = isOverlappingWithOthers({
                        itemCompare: {
                          uuid: uuid,
                          taskId: taskId,
                          scheduleId: scheduleId,
                          start: new Date(planStartDate),
                          end: new Date(
                            combineDateAndTime(
                              new Date(planStartDate),
                              `${formatTimeInput(`${convertToMinutesNumber(e.target.value)}`)}`,
                            ),
                          ),
                        },
                        items: taskTimeScheduleList,
                      });

                      if (data && !isCheck) {
                        setValueEnd(
                          formatTimeInput(
                            `${convertToMinutesNumber(e.target.value)}`,
                          ),
                        );
                        handleChangeEndTime(
                          e,
                          planStartDate,
                          uuid,
                          resourcePlan || false,
                        );
                      } else {
                        setValueEnd(formatTime24h(planEndDate));
                      }
                    }
                  } else {
                    const data = isEndTimeLater(
                      formatTime24h(planStartDate),
                      formatTimeInput(
                        `${convertToMinutesNumber(e.target.value)}`,
                      ),
                    );

                    if (data) {
                      setValueEnd(
                        formatTimeInput(
                          `${convertToMinutesNumber(e.target.value)}`,
                        ),
                      );
                      handleChangeEndTime(
                        e,
                        planStartDate,
                        uuid,
                        resourcePlan || false,
                      );
                    } else {
                      setValueEnd(formatTime24h(planEndDate));
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className={` !w-[50px] rounded-[3px] !h-[30px] !py-0 bg-[#EBF1F7] text-black !pb-[2px] !text-xs font-normal text-center  !px-0 !border-none  !opacity-100`}
              />
            )}
          </span>
        </div>
      </div>

      {/* Important & deadline */}
      {resourcePlan && (
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px] pt-[10px]">
              {isImportant ? (
                <div className="flex w-9 h-5 text-xs items-center justify-center font-medium text-primary bg-[#DFE6EA] rounded">
                  重要
                </div>
              ) : null}
              <p className="flex gap-2 items-center text-[13px]">
                締切
                <span
                  className={`hover:cursor-pointer font-normal ${checkDeadline && 'text-primary'}`}>
                  {deadline && formatShowDeadlineTask(deadline)}
                </span>
              </p>
            </div>
          </div>
          <div className="!w-[30px] !h-[30px]">
            <ImageRound
              src={`/icons/${isStart ? 'pause' : 'play-task'}.svg`}
              name="Start task"
              className={`absolute  ${isStart ? '!w-[20px] !h-[20px] bottom-[-5px] right-3' : '!w-[30px] !h-[30px] bottom-[-10px] right-2'} hover:cursor-pointer`}
              onClick={handleStartStopTask}
            />
          </div>
        </div>
      )}

      {/* Action detail */}
      {isShowAction && resourcePlan && (
        <div className="absolute top-10 right-[-105px] bg-[#5B6770] w-[168px] rounded-md py-[6px] text-white font-medium text-sm">
          <p
            onClick={() => {
              deletePlanTask(uuid, taskId);
            }}
            className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
            予定からタスクを削除
          </p>
          <p
            onClick={() => {
              setIdTaskEditSelected(`${taskId}`);
              handleSetParam({
                id: `${taskId}`,
                action: ActionTask.EDIT,
                type:
                  statusId == Number(StatusValueTask.MY_ROUTINE)
                    ? ItemStartType.FIXED_TASK
                    : ItemStartType.TASK,
              });
              setIsHovering(false);
              setIsShowAction(false);
            }}
            className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
            タスクを編集
          </p>
        </div>
      )}
      {isShowAction && !resourcePlan && (
        <div className="absolute top-10 right-[-105px] bg-[#5B6770] w-[126px] rounded-md py-[6px] text-white font-medium text-sm">
          <p
            onClick={() => {
              if (isCalculation) {
                showToast({
                  variant: 'error',
                  description: ERROR_DELETE_TASK_RUNNING,
                });
              } else {
                deleteActualTask(uuid);
              }
            }}
            className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
            この実績を削除
          </p>
        </div>
      )}
    </>
  );
};

export default PopupDetail;
