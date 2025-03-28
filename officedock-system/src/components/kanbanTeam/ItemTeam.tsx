'use client';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';

import {
  EventWorkCategory,
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
  StatusValueTask,
} from '@constants/enums';
import { apiRouters } from '@constants/routers';
import { Task, TaskFormData } from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';

import useCalculateDurationTask from '@hooks/useCalculateDurationTask';

import { TaskContext } from '@providers/TaskProvider';

import api from '@base/api';
import {
  compareWithCurrentDate,
  convertToCurrentTimezone,
  formatShowDeadlineTask,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';

interface ItemProps {
  id: string;
  index: number;
  content: Task;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTask: (data: {
    status: string;
    task: number;
    oldIdStatus: string;
    oldNameStatus: string;
  }) => void;
  handlePinItem: (id: string) => void;
  handleUnPinItem: (id: string) => void;

  disableDraggable?: boolean;
}
const ItemTeam = ({
  content,
  editTask,
  handlePinItem,
  handleUnPinItem,
  handleUpdateItemInline,
  handleConfirmCopyTask,
  handleActionEditTask,
}: ItemProps) => {
  const queryClient = useQueryClient();

  const {
    setDataClickTask,
    setDataRunning,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setShowWarningStartTaskModal,
    setDataActualAddSchedule,
  } = useContext(TaskContext);
  const { creationDataTaskData, columnWidth, selectedOptionZoom } =
    useContext(TaskTeamStateContext);

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
  const largeColor =
    content.categories &&
    content.categories.find((item) => item.type === EventWorkCategory.LARGE)
      ?.color;

  return (
    <>
      {selectedOptionZoom.value !== 25 ? (
        <div>
          <div
            className={`relative ${largeColor && !content.isStart && 'border border-l-2'} ${selectedOptionZoom.value !== 50 && 'gap-2'} ${isPermissionUpdate ? 'ex-event-draggable' : ''}   group border border-transparent no-show hover:border hover:border-[#BEC9CE] active:bg-[#EBF1F7]  hover:border-solid   ${content.isStart && ' !border-[#0068B6]'} bg-white shadow-common rounded-md text-xs flex flex-col  mb-2 `}>
            <div className="relative w-[100%]   h-full">
              {isPermissionUpdate && (
                <>
                  <Tippy
                    content={content.pinAt ? 'ピンを外す' : 'ピン留め'}
                    arrow={false}
                    delay={1000}
                    placement="right"
                    offset={[0, 5]}>
                    <div
                      style={{
                        top: `${(columnWidth / 247) * 12}px`,
                        right: `${(columnWidth / 247) * 12}px`,
                      }}
                      onClick={() => {
                        if (isPermissionUpdate) {
                          if (content.pinAt) {
                            handleUnPinItem(`${content.id}`);
                          } else {
                            handlePinItem(`${content.id}`);
                          }
                        }
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
                    </div>
                  </Tippy>
                </>
              )}
              {isPermissionAdd && (
                <Tippy
                  content="タスクを複製"
                  arrow={false}
                  delay={1000}
                  placement="right"
                  offset={[0, 5]}>
                  <div
                    style={{
                      top:
                        (selectedOptionZoom.value as number) > 75
                          ? `${(columnWidth / 247) * 32}px`
                          : `${(columnWidth / 247) * 38}px`,
                      right: `${(columnWidth / 247) * 12}px`,
                    }}
                    className="absolute opacity-0 group-hover:opacity-100">
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
                        handleConfirmCopyTask(parseInt(`${content.id}`));
                      }}
                    />
                  </div>
                </Tippy>
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
                    className="h-full flex items-center">
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
                    width:
                      selectedOptionZoom.value !== 50
                        ? `${(columnWidth / 247) * 175}px`
                        : '85px',
                    fontSize:
                      (selectedOptionZoom.value as number) > 75
                        ? (selectedOptionZoom.value as number) == 90
                          ? '15px'
                          : '16px'
                        : '12px',
                    minHeight:
                      (selectedOptionZoom.value as number) > 75
                        ? '20px'
                        : '18px',
                    marginRight: `${(columnWidth / 247) * 12}px`,
                  }}
                  className={`!border-none break-words cursor-pointer rounded-none bg-transparent !p-0 !pb-1 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                  {content.title}
                </p>
              </div>

              {content.status?.id !== StatusValueTask.MY_ROUTINE && (
                <div className="flex items-center justify-between">
                  <div
                    style={{
                      paddingTop:
                        selectedOptionZoom.value !== 50
                          ? `${(columnWidth / 247) * 10}px`
                          : 0,
                      gap: `${(columnWidth / 247) * 10}px`,
                    }}
                    className="flex items-center">
                    {content.isImportant ? (
                      <div
                        style={{
                          width:
                            (selectedOptionZoom.value as number) > 75
                              ? '36px'
                              : '26px',
                          height:
                            (selectedOptionZoom.value as number) > 75
                              ? '20px'
                              : '15px',
                          fontSize:
                            (selectedOptionZoom.value as number) > 75
                              ? '12px'
                              : '9px',
                        }}
                        className="flex items-center justify-center font-medium text-[#0068B6] bg-[#DFE6EA] rounded">
                        重要
                      </div>
                    ) : null}
                    <p
                      style={{
                        fontSize:
                          (selectedOptionZoom.value as number) > 75
                            ? '13px'
                            : '10px',
                      }}
                      className="flex gap-2 items-center">
                      締切
                      <span
                        className={`hover:cursor-pointer ${checkDeadline && 'text-[#0068B6]'}`}>
                        {content.deadline &&
                          formatShowDeadlineTask(content.deadline)}
                      </span>
                    </p>
                  </div>
                  {selectedOptionZoom.value === 50 && (
                    <Tippy
                      content={content.isStart ? '計測停止' : '計測開始'}
                      arrow={false}
                      delay={1000}
                      placement="top"
                      offset={[0, 5]}>
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
                    </Tippy>
                  )}
                </div>
              )}
              {selectedOptionZoom.value !== 50 && (
                <div className="flex justify-between items-center mt-[2px]">
                  <Tippy
                    content="ステータスを変更"
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
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
                            isStatusDropdown={true}
                            disabled={
                              !isPermissionUpdate ||
                              content.status?.id === StatusValueTask.MY_ROUTINE
                            }
                            className={`!py-1 border-none disabled:opacity-100  !shadow-none ${statusStyle}`}
                            styleClass={{
                              fontSize:
                                (selectedOptionZoom.value as number) > 75
                                  ? '12px'
                                  : '9px',
                              width:
                                (selectedOptionZoom.value as number) > 75
                                  ? '70px'
                                  : '50px',
                              height:
                                (selectedOptionZoom.value as number) > 75
                                  ? '22px'
                                  : '16px',
                              padding: `${(columnWidth / 247) * 6}px`,
                              gap: `${(columnWidth / 247) * 10}px`,
                              borderRadius: `${(columnWidth / 247) * 4}px`,
                            }}
                            classNameTextData={`!text-xs`}
                            classNameOption={`!text-xs !w-[120px]`}
                            classNameError={`!text-xs`}
                            styleClassOption={{
                              fontSize: '12px',
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
                                oldIdStatus: `${content.status?.id}`,
                                status: watch('statusId')?.value as string,
                                task: content.id,
                                oldNameStatus: content.status?.name || '',
                              });
                            }}
                            error={errors.statusId?.message}
                          />
                        )}
                      />
                    </div>
                  </Tippy>

                  <Tippy
                    content={content.isStart ? '計測停止' : '計測開始'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
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
                  </Tippy>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div
            className={`relative ${isPermissionUpdate ? 'ex-event-draggable' : ''}   group border border-transparent no-show hover:border hover:border-[#BEC9CE] active:bg-[#EBF1F7]  hover:border-solid   ${content.isStart && ' !border-[#0068B6]'} bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-2 `}>
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
                      ? `${(columnWidth / 247) * 130}px`
                      : `${(columnWidth / 247) * 160}px`,
                    fontSize: '12px',
                    marginRight: `${(columnWidth / 247) * 12}px`,
                  }}
                  className={`!border-none break-words cursor-pointer rounded-none bg-transparent !p-0 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                  {content.title}
                </p>
                <Tippy
                  content={content.isStart ? '計測停止' : '計測開始'}
                  arrow={false}
                  delay={1000}
                  placement="top"
                  offset={[0, 5]}>
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
                </Tippy>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemTeam;
