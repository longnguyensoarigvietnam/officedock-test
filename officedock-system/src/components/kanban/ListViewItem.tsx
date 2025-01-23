'use client';
import { Draggable } from '@hello-pangea/dnd';
import { Controller, useForm } from 'react-hook-form';
import { formatISO } from 'date-fns';
import { UseMutateFunction, useMutation, useQueryClient } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

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

import {
  addHoursToDate,
  compareWithCurrentTime,
  convertToCurrentTimezone,
  formatShowDeadline,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import api from '@base/api';

interface ListViewItemProps {
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
const ListViewItem = ({
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
            className={`relative ${isPermissionUpdate ? 'ex-event-draggable' : ''} group border border-transparent no-show hover:border hover:border-[#BEC9CE]  hover:border-solid   ${content.isStart && ' !border-[#0068B6]'} bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-1 ${snapshot.isDragging && 'opacity-100'}`}>
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
                    <div className="h-full">
                      <ImageRound
                        src="/icons/clock.svg"
                        name="Clock icon"
                        className="text-gray-400 w-4 h-4"
                      />
                    </div>
                  ) : (
                    <div className="w-4"></div>
                  )}
                  <p className="font-bold text-sm max-w-[calc(100%_-_16px)] truncate">
                    {content.title}
                  </p>
                </div>

                <div className="w-1/4 flex items-center justify-evenly">
                  <Tippy
                    content={content.pinAt ? 'ピン留めを外す' : 'ピン留め'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
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
                        className=" text-gray-400 cursor-pointer w-3 h-3"
                      />
                    </div>
                  </Tippy>

                  {isPermissionAdd ? (
                    <Tippy
                      content="タスクを複製"
                      arrow={false}
                      delay={1000}
                      placement="top"
                      offset={[0, 5]}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmCopyTask(parseInt(`${content.id}`));
                        }}>
                        <ImageRound
                          src="/icons/copy.svg"
                          name="Copy icon"
                          className="text-gray-400 cursor-pointer w-4 h-4"
                        />
                      </div>
                    </Tippy>
                  ) : (
                    <div className="w-4"></div>
                  )}
                  <Tippy
                    content={content.isStart ? '計測停止' : '計測開始'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}>
                      {content.isMyTask && (
                        <ImageRound
                          src={`/icons/${content.isStart ? 'pause' : 'play'}.svg`}
                          name="Start task"
                          className={`hover:cursor-pointer w-[24px] h-[24px]`}
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
                  </Tippy>
                </div>
              </div>
              <div className="flex items-center w-2/5">
                {content.status?.id !== StatusValueTask.MY_ROUTINE ? (
                  <>
                    <p
                      className={`hover:cursor-pointer ${!checkDeadline && 'text-red-600'} border-x-2 w-2/5 text-center`}>
                      {content.deadline && formatShowDeadline(content.deadline)}
                    </p>
                    {content.isImportant ? (
                      <div className="w-1/5 border-r-2 flex items-center justify-center">
                        <p className="text-center font-medium text-[#0068B6] bg-[#DFE6EA] rounded w-fit px-1 py-0.5">
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
                            className={`!py-1 border-none disabled:opacity-100  !shadow-none ${statusStyle}`}
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
                  </>
                ) : (
                  <>
                    <p className="w-[calc(50%_+_7px)] text-center border-x-2">毎週水曜日13:00~14:00</p>
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
