'use client';
import { Draggable } from '@hello-pangea/dnd';
import { Controller, useForm } from 'react-hook-form';
import { formatISO } from 'date-fns';
import { UseMutateFunction, useMutation, useQueryClient } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';

import {
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
  StatusValueTask,
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
import { OptionDropdownType } from '@interfaces/common';

import useCalculateDurationTask from '@hooks/useCalculateDurationTask';

import { TaskContext } from '@providers/TaskProvider';

import api from '@base/api';
import {
  addHoursToDate,
  compareWithCurrentTime,
  convertToCurrentTimezone,
  formatShowDeadline,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';

interface ItemProps {
  id: string;
  index: number;
  content: Task;
  creationDataTaskData?: CreationDataTask;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
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
const Item = ({
  id,
  index,
  content,
  creationDataTaskData,
  editTask,
  handlePinItem,
  handleUpdateItemInline,
  handleConfirmCopyTask,
  handleActionEditTask,
  disableDraggable = false,
}: ItemProps) => {
  const queryClient = useQueryClient();

  const {
    columnWidth,
    setDataClickTask,
    setDataRunning,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setShowWarningStartTaskModal,
    setDataActualAddSchedule,
    calculateFontSizeTitle,
    calculateFontSizeContent,
  } = useContext(TaskContext);

  const [dataOptionsStatus, setDataOptionsStatus] = useState<
    OptionDropdownType[]
  >([]);

  let statusStyle = '';

  // TODO: Because the number of states can change.
  // So, determining the color code from the enum is unreasonable.
  // This is a temporary solution as there is no defined color code, this will be changed and updated
  switch (content.status && content.status.id) {
    case StatusValueTask.NOT_STARTED:
      statusStyle = '!bg-[#A3EBF0]';
      break;
    case StatusValueTask.IN_PROGRESS:
      statusStyle = '!bg-[#92E9AF]';
      break;
    case StatusValueTask.CONFIRMING:
      statusStyle = '!bg-[#FCCF79]';
      break;
    case StatusValueTask.COMPLETED:
      statusStyle = '!bg-[#F58383]';
      break;
    case StatusValueTask.MY_ROUTINE:
      statusStyle = '!bg-[#EBF1F7]';
      break;
    default:
      break;
  }
  const {
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    mode: 'onSubmit',
  });

  const { data: session } = useSession();

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
      setCheckDeadline(compareWithCurrentTime(content.deadline));
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
    handleActionEditTask(parseInt(`${content.id}`));

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
              end: formatISO(addHoursToDate(`${now}`)),
              startEditable: true,
              itemKanban: true,
            })}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative ${isPermissionUpdate ? 'ex-event-draggable' : ''}   group border border-transparent no-show hover:border hover:border-[#BEC9CE]  hover:border-solid   ${content.isStart && ' !border-[#0068B6]'} bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-2 ${snapshot.isDragging && 'opacity-100'}`}>
            <div className="relative w-[100%]   h-full">
              <div
                onClick={() => {
                  if (isPermissionUpdate) {
                    handlePinItem(`${content.id}`);
                  }
                }}
                style={{
                  top: `${(columnWidth / 247) * 6}px`,
                  left: `${(columnWidth / 247) * 5}px`,
                }}
                className={`absolute ${isPermissionUpdate ? '' : 'opacity-75'}  ${content.pinAt ? '' : 'opacity-0 group-hover:opacity-100'} `}>
                <ImageRound
                  src={
                    content.pinAt
                      ? `/icons/pin-task.svg`
                      : `/icons/unpin-task.svg`
                  }
                  name="Pin icon"
                  style={{
                    width: `${(columnWidth / 247) * 10}px`,
                    height: `${(columnWidth / 247) * 14}px`,
                  }}
                  className=" text-gray-400 cursor-pointer"
                />
              </div>
              {isPermissionUpdate && (
                <>
                  <div
                    style={{
                      top: `${(columnWidth / 247) * 12}px`,
                      right: `${(columnWidth / 247) * 12}px`,
                    }}
                    className="absolute  opacity-0 group-hover:opacity-100">
                    <ImageRound
                      src="/icons/edit-gray.svg"
                      name="Edit icon"
                      style={{
                        width: `${(columnWidth / 247) * 14}px`,
                        height: `${(columnWidth / 247) * 14}px`,
                      }}
                      className="cursor-pointer"
                      onClick={handleClick}
                    />
                  </div>
                </>
              )}
              {isPermissionAdd && (
                <div
                  style={{
                    top: `${(columnWidth / 247) * 32}px`,
                    right: `${(columnWidth / 247) * 12}px`,
                  }}
                  className="absolute opacity-0 group-hover:opacity-100">
                  <ImageRound
                    src="/icons/copy.svg"
                    name="Copy icon"
                    style={{
                      width: `${(columnWidth / 247) * 16}px`,
                      height: `${(columnWidth / 247) * 16}px`,
                    }}
                    className="text-gray-400 cursor-pointer"
                    onClick={() => {
                      handleConfirmCopyTask(parseInt(`${content.id}`));
                    }}
                  />
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
                        width: `${(columnWidth / 247) * 14}px`,
                        height: `${(columnWidth / 247) * 14}px`,
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
                    width: `${(columnWidth / 247) * 186}px`,
                    fontSize: calculateFontSizeTitle(),
                    lineHeight: `${calculateFontSizeTitle() * 1.5}px`,
                    marginRight: `${(columnWidth / 247) * 12}px`,
                  }}
                  className={`!border-none break-words cursor-pointer rounded-none bg-white !p-0 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                  {content.title}
                </p>
              </div>

              {content.status?.id !== StatusValueTask.MY_ROUTINE && (
                <div
                  style={{
                    fontSize: calculateFontSizeContent(),
                    lineHeight: `${calculateFontSizeContent() * 1.5}px`,
                    paddingTop: `${(columnWidth / 247) * 10}px`,
                    gap: `${(columnWidth / 247) * 10}px`,
                  }}
                  className="flex items-center">
                  {content.isImportant ? (
                    <div
                      style={{
                        width: `${(columnWidth / 247) * 36}px`,
                        height: `${(columnWidth / 247) * 21}px`,
                        fontSize: calculateFontSizeContent(),
                      }}
                      className="flex items-center justify-center font-medium text-[#0068B6] bg-[#DFE6EA] rounded">
                      重要
                    </div>
                  ) : null}
                  <p className="flex gap-2 items-center">
                    締切
                    <span
                      className={`hover:cursor-pointer ${!checkDeadline && 'text-red-600'}`}>
                      {content.deadline && formatShowDeadline(content.deadline)}
                    </span>
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center mt-[2px]">
                <div
                  className="w-20 max-w-20 h-[21px] rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}>
                  <Controller
                    control={control}
                    name={'statusId'}
                    render={({ field: { value, onChange } }) => (
                      <Dropdown
                        openByDefault
                        disabled={
                          !isPermissionUpdate ||
                          content.status?.id === StatusValueTask.MY_ROUTINE
                        }
                        className={`!py-1 border-none disabled:opacity-100  !shadow-none ${statusStyle}`}
                        styleClass={{
                          fontSize: calculateFontSizeContent(),
                          lineHeight: `${calculateFontSizeContent() * 1.5}px`,
                          width:
                            content.status?.id === StatusValueTask.MY_ROUTINE
                              ? `${(columnWidth / 247) * 90}px`
                              : `${(columnWidth / 247) * 80}px`,
                          height: `${(columnWidth / 247) * 21}px`,
                          padding: `${(columnWidth / 247) * 6}px`,
                          gap: `${(columnWidth / 247) * 10}px`,
                          borderRadius: `${(columnWidth / 247) * 4}px`,
                        }}
                        classNameTextData={`!text-[${calculateFontSizeContent()}px]`}
                        classNameOption={`!text-[${calculateFontSizeContent()}px]`}
                        classNameError={`!text-[${calculateFontSizeContent()}px]`}
                        styleClassOption={{
                          fontSize: calculateFontSizeContent(),
                          lineHeight: `${calculateFontSizeContent() * 1.5}px`,
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
                          editTask({
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
                        width: `${(columnWidth / 247) * 24}px`,
                        height: `${(columnWidth / 247) * 24}px`,
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
              </div>
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
};

export default Item;
