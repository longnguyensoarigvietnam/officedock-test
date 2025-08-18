'use client';
import { Draggable } from '@hello-pangea/dnd';
import { Controller, useForm } from 'react-hook-form';
import { formatISO } from 'date-fns';
import { useQueryClient } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSessionCache } from '@providers/SessionCacheProvider';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import {
  EventWorkCategory,
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
  StatusValueTask,
  TaskRepetitiveValue,
} from '@constants/enums';

import {
  CreationDataTask,
  DataStatusChangeInline,
  Task,
  TaskFormData,
} from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';

import useCalculateDurationTask from '@hooks/useCalculateDurationTask';

import { TaskContext } from '@providers/TaskProvider';

import {
  addMinutesToDate,
  compareWithCurrentDate,
  convertToCurrentTimezone,
  convertToTimeString,
  formatShowDeadlineTask,
  getJapaneseWeekDay,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import ClockIconWithDynamicColor from '@components/common/ClockIcon';

interface ListViewItemProps {
  id: string;
  index: number;
  content: Task;
  creationDataTaskData?: CreationDataTask;
  handleActionEditTask: (id: number, type?: string) => void;
  handleConfirmCopyTask: (id: number, type?: string) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTaskInline: (data: DataStatusChangeInline) => void;
  handlePinItem: (id: string) => void;
  disableDraggable?: boolean;
}
const ListViewItem = ({
  id,
  index,
  content,
  creationDataTaskData,
  editTaskInline,
  handlePinItem,
  handleUpdateItemInline,
  handleConfirmCopyTask,
  handleActionEditTask,
  disableDraggable = false,
}: ListViewItemProps) => {
  const queryClient = useQueryClient();

  const {
    setDataClickTask,
    setDataRunning,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setShowWarningStartTaskModal,
    setDataActualAddSchedule,
  } = useContext(TaskContext);

  const [dataOptionsStatus, setDataOptionsStatus] = useState<
    OptionDropdownType[]
  >([]);

  const {
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    mode: 'onSubmit',
  });

  const { data: session } = useSessionCache();

  const searchParams = useSearchParams();

  const taskDetailId = searchParams.get('task');

  const [checkDeadline, setCheckDeadline] = useState<boolean>(false);

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
    };
    if (content) {
      (value.title = content.title),
        (value.statusId = {
          label: (content.status && content.status.name) || '',
          value: (content.status && content.status.id) || '',
        });
    }
    return value;
  }, [content]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (content && content.deadline) {
      setCheckDeadline(compareWithCurrentDate(content.deadline));
    }
  }, [content]);

  // Save data from create task
  useEffect(() => {
    if (creationDataTaskData) {
      setDataOptionsStatus(
        creationDataTaskData.status.map((org) => ({
          label: org.name,
          value: org.id || '',
        })),
      );
    }
  }, [creationDataTaskData]);
  //  Handle call api delete task
  const { calculateDurationTask } = useCalculateDurationTask({
    onSuccess: (response, task) => {
      const data = response.data;

      if (data.isAnotherTaskStarted) {
        setIdTaskStarting({
          id: data.id,
          type: data.type,
        });
        setDataClickTask({
          id: task.id,
          type: task.type,
        });
        setShowWarningStartTaskModal(true);
        return;
      }
      setDataRunning({
        id: `${content.id}`,
        type: ItemStartType.TASK,
      });

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
      }
    },
  });
  // Action call API check start task
  const handleConfirmCheckStartTask = (id: string) => {
    calculateDurationTask({
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
    handleActionEditTask(
      parseInt(`${content.id}`),
      content.status && content.status.id == StatusValueTask.MY_ROUTINE
        ? ItemStartType.FIXED_TASK
        : ItemStartType.TASK,
    );

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

  const largeColor =
    content.categories &&
    content.categories.find((item) => item.type === EventWorkCategory.LARGE)
      ?.color;

  return (
    <>
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
              deadline:
                content.status?.id == StatusValueTask.MY_ROUTINE
                  ? ''
                  : content.deadline,
            })}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative ${isPermissionUpdate ? 'ex-event-draggable' : ''} group border border-transparent no-show hover:border hover:border-[#BEC9CE]  hover:border-solid   ${content.isStart && ' !border-primary'} bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-1 ${snapshot.isDragging && 'opacity-100'}`}>
            <div
              className="flex items-center py-2.5 px-3 w-full"
              onClick={() => {
                if (!taskDetailId) {
                  handleClick();
                }
              }}>
              <div className="flex items-center gap-4 w-3/5">
                <div className="flex items-center w-3/4 gap-2">
                  {isShowSchedule ? (
                    <div className="h-full min-w-4">
                      <ClockIconWithDynamicColor
                        size={16}
                        color={largeColor || '#228CDB'}
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-4 min-w-4 flex items-center justify-center`}>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: largeColor }}></div>
                    </div>
                  )}
                  <p className="font-bold text-sm max-w-[calc(100%_-_16px)] truncate">
                    {content.title}
                  </p>
                </div>

                <div className="w-1/4 flex items-center justify-evenly">
                  <DynamicTooltip
                    content={content.pinAt ? 'ピンを外す' : 'ピン留め'}
                    placement="top">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPermissionUpdate) {
                          handlePinItem(`${content.id}`);
                        }
                      }}>
                      <ImageRound
                        src={
                          content.pinAt
                            ? `/icons/pin-task.svg`
                            : `/icons/unpin-task.svg`
                        }
                        name="Pin icon"
                        className=" text-gray-400 cursor-pointer w-[14px] h-[14px]"
                      />
                    </div>
                  </DynamicTooltip>

                  {isPermissionAdd ? (
                    <DynamicTooltip content="タスクを複製" placement="top">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmCopyTask(
                            parseInt(`${content.id}`),
                            content.status?.id == StatusValueTask.MY_ROUTINE
                              ? ItemStartType.FIXED_TASK
                              : ItemStartType.TASK,
                          );
                        }}>
                        <ImageRound
                          src="/icons/copy.svg"
                          name="Copy icon"
                          className="text-gray-400 cursor-pointer w-[14px] h-[14px]"
                        />
                      </div>
                    </DynamicTooltip>
                  ) : (
                    <div className="w-4"></div>
                  )}
                  <DynamicTooltip
                    content={content.isStart ? '計測停止' : '計測開始'}
                    placement="top">
                    <div
                    className="!w-[30px] !h-[30px] flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}>
                      {content.isMyTask && (
                        <ImageRound
                          src={`/icons/${content.isStart ? 'pause-task' : 'play-task'}.svg`}
                          name="Start task"
                          className={`hover:cursor-pointer ${content.isStart ? '!w-[20px] !h-[20px]' : '!w-[30px] !h-[30px]'}`}
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
              <div className="flex items-center w-2/5">
                {content.status?.id !== StatusValueTask.MY_ROUTINE ? (
                  <>
                    <p
                      className={`hover:cursor-pointer ${checkDeadline && 'text-primary'} border-x-2 w-2/5 text-center`}>
                      {content.deadline &&
                        formatShowDeadlineTask(content.deadline)}
                    </p>
                    {content.isImportant ? (
                      <div className="w-1/5 border-r-2 flex items-center justify-center">
                        <p className="text-center font-medium text-primary bg-[#DFE6EA] rounded w-fit px-1 py-0.5">
                          重要
                        </p>
                      </div>
                    ) : (
                      <div className="w-1/5 border-r-2"></div>
                    )}

                    <div
                      className="pl-4 w-20 max-w-20 h-[21px] rounded flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}>
                      <Controller
                        control={control}
                        name={'statusId'}
                        render={({ field: { value, onChange } }) => (
                          <Dropdown
                            openByDefault
                            isStatusDropdown={true}
                            disabled={
                              !isPermissionUpdate ||
                              content.status?.id === StatusValueTask.MY_ROUTINE
                            }
                            className={`!py-1 border-none disabled:opacity-100 !shadow-none !bg-[#EBF1F7]`}
                            styleClass={{
                              fontSize: '12px',
                              lineHeight: '18px',
                              width: '80px',
                              height: '21px',
                              padding: '6px',
                              gap: '10px',
                              borderRadius: '4px',
                            }}
                            classNameTextData={`!text-[12px]`}
                            classNameOption={`!text-[12px] !w-[120px]`}
                            classNameError={`!text-[12px]`}
                            styleClassOption={{
                              fontSize: '12px',
                              lineHeight: '18px',
                            }}
                            options={
                              content.status?.id === StatusValueTask.MY_ROUTINE
                                ? dataOptionsStatus
                                : dataOptionsStatus.filter(
                                    (item) =>
                                      item.value !== StatusValueTask.MY_ROUTINE,
                                  )
                            }
                            selectedOption={dataOptionsStatus.find(
                              (element) => element.value === value?.value,
                            )}
                            onChange={(e) => {
                              onChange(e);
                              editTaskInline({
                                id: `${content.id}`,
                                oldIdStatus: `${content.status?.id}`,
                                statusId: watch('statusId')?.value as number,
                              });
                            }}
                            error={errors.statusId?.message}
                          />
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="w-[calc(50%_+_7px)] text-center border-x-2">
                      {displayRoutineTaskScheduleTitle(content)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
};

export default ListViewItem;
