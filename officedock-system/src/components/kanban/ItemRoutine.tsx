'use client';
import { Draggable } from '@hello-pangea/dnd';
import { useForm } from 'react-hook-form';
import { formatISO } from 'date-fns';
import { UseMutateFunction, useMutation, useQueryClient } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import ImageRound from '@components/common/ImageRound';

import {
  EventWorkCategory,
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
  TaskRepetitiveType,
  TaskRepetitiveValue,
} from '@constants/enums';
import { apiRouters } from '@constants/routers';
import {
  CreationDataTask,
  Task,
  TaskErrorPerson,
  TaskFormData,
  TaskRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';

import useCalculateDurationTask from '@hooks/useCalculateDurationTask';

import { TaskContext } from '@providers/TaskProvider';

import api from '@base/api';
import {
  addMinutesToDate,
  convertToCurrentTimezone,
  convertToTimeString,
  getJapaneseWeekDay,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import { TASK_REPETITIVE_OPTIONS } from '@constants';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

interface ItemProps {
  id: string;
  index: number;
  content: Task;
  creationDataTaskData?: CreationDataTask;
  handleActionEditTask: (id: number, type?: string) => void;
  handleConfirmCopyTask: (id: number, type?: string) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTask: UseMutateFunction<
    Task,
    ResponseError<{
      detail: TaskErrorPerson;
    }>,
    TaskRequest,
    unknown
  >;
  handlePinItem: (id: string) => void;
  disableDraggable?: boolean;
}
const ItemRoutine = ({
  id,
  index,
  content,
  handlePinItem,
  handleUpdateItemInline,
  handleConfirmCopyTask,
  handleActionEditTask,
  disableDraggable = false,
}: ItemProps) => {
  const queryClient = useQueryClient();

  const {
    columnWidth,
    selectedOptionZoom,
    setDataClickTask,
    setDataRunning,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setShowWarningStartTaskModal,
    setDataActualAddSchedule,
  } = useContext(TaskContext);

  const { reset } = useForm<TaskFormData>({
    mode: 'onSubmit',
  });

  const { data: session } = useSession();

  const searchParams = useSearchParams();

  const taskDetailId = searchParams.get('task');

  const defaultValues = useMemo<TaskFormData>(() => {
    const value: TaskFormData = {
      title: '',
      statusId: {
        label: '',
        value: '',
      },
      priority: {
        label: '',
        value: '',
      },
      peopleInChargeIds: [],
      categories: {
        LARGE: {
          label: '',
          value: '',
        },
        MEDIUM: {
          label: '',
          value: '',
        },
        SMALL: {
          label: '',
          value: '',
        },
      },
      isImportant: false,
      plans: null,
      repeatType: {
        label: TaskRepetitiveType.ONCE,
        value: 'ONCE',
      },
      repeatInterval: {
        label: '',
        value: '',
      },
      repeatStartTime: '',
      repeatEndTime: '',
      month: {
        label: '',
        value: '',
      },
      monthDay: {
        label: '',
        value: '',
      },
      weekDay: {
        label: '',
        value: '',
      },
    };
    if (content) {
      (value.title = content.title),
        (value.statusId = {
          label: (content.status && content.status.name) || '',
          value: (content.status && content.status.id) || '',
        });
      value.repeatType = content.repeatType
        ? {
            label:
              TASK_REPETITIVE_OPTIONS.find(
                (option) => option.value == content.repeatType,
              )?.label || '',
            value: content.repeatType,
          }
        : {
            label: '',
            value: '',
          };
    }
    return value;
  }, [content]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  //  Handle call api delete task
  const { calculateDurationTask } = useCalculateDurationTask({
    onSuccess: (response) => {
      const data = response.data;

      handleUpdateItemInline({
        ...content,
        id: content.id,
        isStart: !content.isStart,
        status: content.status,
      });
      queryClient.refetchQueries(['getDataTaskHeaderList']);
      queryClient.refetchQueries([
        'getTaskDurationDetail',
        {
          id: `${content.id}`,
          type: ItemStartType.TASK,
        },
      ]);
      queryClient.refetchQueries(['getTaskHeaderStart']);
      if (data) {
        const startDateActual = new Date(
          convertToCurrentTimezone(`${data.planStartDate}`),
        );
        const endDateActual = new Date(
          convertToCurrentTimezone(`${data.planEndDate}`),
        );
        setDataActualAddSchedule({
          ...data,
          start: startDateActual,
          end: endDateActual,
          id: data.id.toString(),
          startEditable: false,
          resourceId: ItemScheduleType.ACTUAL,
          type: ItemStartType.TASK,
          isMyTask: false,
        });
        if (!data.isStart) {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
        }
      }
    },
  });
  // Handle call API check start task
  const handleCheckStartTask = async ({
    id,
    type,
  }: {
    id: string;
    type: string;
  }) => {
    return await api.post(apiRouters.TASK_CHECK_START(), {
      id,
      type,
    });
  };
  // Function call API  check start task
  const { mutate: checkTask } = useMutation(
    'postCheckStartTaskSchedule',
    handleCheckStartTask,
    {
      onSuccess: async ({ data }, task) => {
        if (!data.isAnotherTaskStarted) {
          calculateDurationTask({
            id: `${content.id}`,
            type: ItemStartType.TASK,
          });
          setDataRunning({
            id: `${content.id}`,
            type: ItemStartType.TASK,
          });
        } else {
          setIdTaskStarting({
            id: data.id,
            type: data.type,
          });
          setDataClickTask({
            id: task.id,
            type: task.type,
          });
          setShowWarningStartTaskModal(true);
        }
      },
      onError: () => {},
      onSettled: () => {},
    },
  );
  // Action call API check start task
  const handleConfirmCheckStartTask = (id: string) => {
    checkTask({
      id: id,
      type: ItemStartType.TASK,
    });
  };
  const isShowSchedule = content.isScheduleInToday || false;
  const now = new Date();

  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (isClicked) return;

    setIsClicked(true);
    handleActionEditTask(parseInt(`${content.id}`), ItemStartType.FIXED_TASK);

    setTimeout(() => setIsClicked(false), 2000);
  };

  const isPermissionUpdate =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.MY_TASK_UPDATE,
    );

  const isPermissionAdd =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.MY_TASK_ADD,
    );

  const largeColor =
    content.categories &&
    content.categories.find((item) => item.type === EventWorkCategory.LARGE)
      ?.color;

  const displayRoutineTaskScheduleTitle = (item: Task) => {
    let title = '';
    const repeatStartTime = item.planStartDate
      ? convertToTimeString(item.planStartDate)
      : '';
    const repeatEndTime = item.planEndDate
      ? convertToTimeString(item.planEndDate)
      : '';
    switch (item.repeatType) {
      case TaskRepetitiveValue.ONCE:
        title = '';
        break;
      case TaskRepetitiveValue.DAILY:
        title = '毎日' + repeatStartTime + '~' + repeatEndTime;
        break;
      case TaskRepetitiveValue.WEEKLY:
        title =
          '毎週' +
          getJapaneseWeekDay(Number(item.weekDay || 0)) +
          '曜日' +
          repeatStartTime +
          '~' +
          repeatEndTime;
        break;
      case TaskRepetitiveValue.MONTHLY:
        title =
          '毎月' + item.monthDay + '日' + repeatStartTime + '~' + repeatEndTime;
        break;
      case TaskRepetitiveValue.YEARLY:
        title =
          '毎年' +
          item.month +
          '月' +
          item.monthDay +
          '日' +
          repeatStartTime +
          '~' +
          repeatEndTime;
        break;
    }
    return title;
  };

  return (
    <>
      {selectedOptionZoom.value !== 25 ? (
        <Draggable
          draggableId={id}
          index={index}
          isDragDisabled={disableDraggable || !isPermissionUpdate}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              data-event={JSON.stringify({
                ...content,
                title: content.title ? content.title : '',
                start: formatISO(now),
                end: formatISO(addMinutesToDate(`${now}`)),
                startEditable: true,
                itemKanban: true,
                largeColor: largeColor,
              })}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                borderLeftColor: largeColor,
                ...provided.draggableProps.style,
              }}
              className={`relative ${largeColor && !content.isStart && 'border border-l-2'} ${isPermissionUpdate ? 'ex-event-draggable' : ''}   group border border-transparent no-show hover:border hover:border-[#BEC9CE] active:bg-[#EBF1F7]  hover:border-solid   ${content.isStart && ' !border-[#0068B6]'} bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-2 ${snapshot.isDragging && 'opacity-100'}`}>
              <div className="relative w-[100%]   h-full">
                {isPermissionUpdate && (
                  <>
                    <div
                      style={{
                        top: `${(columnWidth / 247) * 12}px`,
                        right: `${(columnWidth / 247) * 12}px`,
                      }}
                      onClick={() => {
                        if (isPermissionUpdate) {
                          handlePinItem(`${content.id}`);
                        }
                      }}
                      className={`absolute ${isPermissionUpdate ? '' : 'opacity-75'}  ${content.pinAt ? '' : 'opacity-0 group-hover:opacity-100'} `}>
                      <DynamicTooltip
                        content={content.pinAt ? 'ピン留めを外す' : 'ピン留め'}
                        placement="right">
                        <ImageRound
                          src={
                            content.pinAt
                              ? `/icons/pin-task.svg`
                              : `/icons/unpin-task.svg`
                          }
                          name="Pin icon"
                          style={{
                            width:
                              (selectedOptionZoom.value as number) > 75
                                ? '14px'
                                : (selectedOptionZoom.value as number) === 75
                                  ? '12px'
                                  : `10px`,
                            height:
                              (selectedOptionZoom.value as number) > 75
                                ? '14px'
                                : (selectedOptionZoom.value as number) === 75
                                  ? '12px'
                                  : `10px`,
                          }}
                          className=" text-gray-400 cursor-pointer"
                        />
                      </DynamicTooltip>
                    </div>
                  </>
                )}
                {isPermissionAdd && (
                  <div
                    style={{
                      top:
                        (selectedOptionZoom.value as number) > 75
                          ? `${(columnWidth / 247) * 32}px`
                          : `${(columnWidth / 247) * 38}px`,
                      right: `${(columnWidth / 247) * 12}px`,
                    }}
                    className="absolute opacity-0 group-hover:opacity-100">
                    <DynamicTooltip content="タスクを複製" placement="right">
                      <ImageRound
                        src="/icons/copy.svg"
                        name="Copy icon"
                        style={{
                          width:
                            (selectedOptionZoom.value as number) > 75
                              ? '14px'
                              : (selectedOptionZoom.value as number) === 75
                                ? '12px'
                                : `10px`,
                          height:
                            (selectedOptionZoom.value as number) > 75
                              ? '14px'
                              : (selectedOptionZoom.value as number) === 75
                                ? '12px'
                                : `10px`,
                        }}
                        className="text-gray-400 cursor-pointer"
                        onClick={() => {
                          handleConfirmCopyTask(
                            parseInt(`${content.id}`),
                            ItemStartType.FIXED_TASK,
                          );
                        }}
                      />
                    </DynamicTooltip>
                  </div>
                )}
              </div>
              <div
                style={{
                  paddingTop: `${(columnWidth / 247) * 12}px`,
                  paddingBottom: `${(columnWidth / 247) * 12}px`,
                  paddingLeft: `${(columnWidth / 247) * 18}px`,
                  paddingRight: `${(columnWidth / 247) * 12}px`,
                }}
                className={`flex flex-col gap-3`}
                onClick={() => {
                  if (!taskDetailId) {
                    handleClick();
                  }
                }}>
                <div className="flex gap-1 items-start">
                  {isShowSchedule ? (
                    <div
                      style={{
                        width: `${(columnWidth / 247) * 20}px`,
                      }}
                      className="h-full flex items-start mt-[3px]">
                      <ImageRound
                        src="/icons/clock.svg"
                        name="Clock icon"
                        style={{
                          width:
                            (selectedOptionZoom.value as number) > 75
                              ? `14px`
                              : '10px',
                          height:
                            (selectedOptionZoom.value as number) > 75
                              ? `14px`
                              : '10px',
                        }}
                        className="text-gray-400"
                      />
                    </div>
                  ) : (
                    ''
                  )}
                  <p
                    style={{
                      width: `${(columnWidth / 247) * 186}px`,
                      fontSize:
                        (selectedOptionZoom.value as number) > 75
                          ? '14px'
                          : '12px',
                      marginRight: `${(columnWidth / 247) * 12}px`,
                    }}
                    className={`!border-none leading-[1.4] break-all line-clamp-2 cursor-pointer rounded-none bg-transparent !p-0 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                    {content.title}
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div
                    style={{
                      fontSize:
                        (selectedOptionZoom.value as number) !== 100
                          ? (selectedOptionZoom.value as number) === 90
                            ? '12px'
                            : '10px'
                          : '13px',
                    }}
                    className="font-normal ">
                    {displayRoutineTaskScheduleTitle(content)}
                  </div>
                  <DynamicTooltip
                    content={content.isStart ? '計測停止' : '計測開始'}
                    placement="top">
                    <div
                      className=""
                      onClick={(e) => {
                        e.stopPropagation();
                      }}>
                      {content.isMyTask && (
                        <ImageRound
                          src={`/icons/${content.isStart ? 'pause' : 'play'}.svg`}
                          name="Start task"
                          style={{
                            width:
                              (selectedOptionZoom.value as number) > 75
                                ? '26px'
                                : (selectedOptionZoom.value as number) == 75
                                  ? '20px'
                                  : '16px',
                            height:
                              (selectedOptionZoom.value as number) > 75
                                ? '26px'
                                : (selectedOptionZoom.value as number) == 75
                                  ? '20px'
                                  : '16px',
                          }}
                          className={`hover:cursor-pointer `}
                          onClick={async () => {
                            await new Promise<void>((resolve) => {
                              setTaskSelectedToStart(content);
                              resolve();
                            });
                            handleConfirmCheckStartTask(`${content.id}`);
                          }}
                        />
                      )}
                    </div>
                  </DynamicTooltip>
                </div>
              </div>
            </div>
          )}
        </Draggable>
      ) : (
        <Draggable
          draggableId={id}
          index={index}
          isDragDisabled={disableDraggable || !isPermissionUpdate}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              data-event={JSON.stringify({
                ...content,
                title: content.title ? content.title : '',
                start: formatISO(now),
                end: formatISO(addMinutesToDate(`${now}`)),
                startEditable: true,
                itemKanban: true,
              })}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`relative ${isPermissionUpdate ? 'ex-event-draggable' : ''}   group border border-transparent no-show hover:border hover:border-[#BEC9CE] active:bg-[#EBF1F7]  hover:border-solid   ${content.isStart && ' !border-[#0068B6]'} bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-2 ${snapshot.isDragging && 'opacity-100'}`}>
              <div
                style={{
                  paddingTop: `${(columnWidth / 247) * 12}px`,
                  paddingBottom: `${(columnWidth / 247) * 12}px`,
                  paddingLeft: `${(columnWidth / 247) * 18}px`,
                  paddingRight: `${(columnWidth / 247) * 12}px`,
                }}
                className={`flex flex-col gap-2`}
                onClick={() => {
                  if (!taskDetailId) {
                    handleClick();
                  }
                }}>
                <div className="flex gap-1 items-start">
                  {isShowSchedule ? (
                    <div
                      style={{
                        width: `${(columnWidth / 247) * 20}px`,
                      }}
                      className="h-full">
                      <ImageRound
                        src="/icons/clock.svg"
                        name="Clock icon"
                        style={{
                          width: `10px`,
                          height: `10px`,
                          marginTop: `${(columnWidth / 247) * 5}px`,
                        }}
                        className="text-gray-400"
                      />
                    </div>
                  ) : (
                    ''
                  )}
                  <p
                    style={{
                      width: isShowSchedule
                        ? `${(columnWidth / 247) * 150}px`
                        : `${(columnWidth / 247) * 180}px`,
                      fontSize: '12px',
                      marginRight: `${(columnWidth / 247) * 12}px`,
                    }}
                    className={`!border-none leading-[1.4] break-all line-clamp-2 cursor-pointer rounded-none bg-transparent !p-0 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                    {content.title}
                  </p>
                  <DynamicTooltip
                    content={content.isStart ? '計測停止' : '計測開始'}
                    placement="top">
                    <div
                      className=""
                      onClick={(e) => {
                        e.stopPropagation();
                      }}>
                      {content.isMyTask && (
                        <ImageRound
                          src={`/icons/${content.isStart ? 'pause' : 'play'}.svg`}
                          name="Start task"
                          style={{
                            width: `16px`,
                            height: `16px`,
                          }}
                          className={`hover:cursor-pointer `}
                          onClick={async () => {
                            await new Promise<void>((resolve) => {
                              setTaskSelectedToStart(content);
                              resolve();
                            });
                            handleConfirmCheckStartTask(`${content.id}`);
                          }}
                        />
                      )}
                    </div>
                  </DynamicTooltip>
                </div>
              </div>
            </div>
          )}
        </Draggable>
      )}
    </>
  );
};

export default ItemRoutine;
