import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { memo, useContext, useEffect, useState } from 'react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useMutation, useQueryClient } from 'react-query';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import WarningStartTaskModal from '@components/modals/WarningStartTaskModal';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Input from '@components/common/Input';

import {
  ActionTask,
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
  SocketActions,
  StatusValueTask,
} from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';
import { DEFAULT_TIME_TEXT, OPTION_DEFAULT_TASK } from '@constants';

import useCalculateDurationTask from '@hooks/useCalculateDurationTask';
import useContinueCounterTime from '@hooks/useContinueCounterTime';
import useTaskHeaderStart from '@hooks/useTaskHeaderStart';
import useTaskDurationDetail from '@hooks/useTaskDurationDetail';
import useDataHeaderTaskList from '@hooks/useDataHeaderTask';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import { OptionDropdownType } from '@interfaces/common';
import {
  Task,
  TaskDuration,
  TaskRequest,
  TaskRunningType,
} from '@interfaces/task';
import { WebSocketMessageDataOverTime } from '@interfaces/chat';
import { TaskContext } from '@providers/TaskProvider';
import { hasPermissionInArray } from '@utils';
import {
  combineDateAndTime,
  convertDateString,
  convertDateStringWithFormat,
  convertToMinutesNumber,
  formatCurrentDay,
  formatDateServer,
  formatQueryStartDateForCalendar,
  formatTime24h,
  formatTimeInputCustom,
  formatTimeTaskCustom,
  getTimeDifference,
  isTimeEarlier,
} from '@utils/date';
import api from '@base/api';

const ShowTimeCounter = memo(
  ({ statusTaskSelected }: { statusTaskSelected: TaskDuration }) => {
    const elapsedTime = useContinueCounterTime(statusTaskSelected);

    return <span className="text-[#77858F]">{elapsedTime}</span>;
  },
);

const TaskPageDataHeader = () => {
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);

  const { data: session } = useSessionCache();

  const router = useRouter();

  const pathname = usePathname();

  const queryClient = useQueryClient();

  const isTaskPage = pathname.startsWith('/task');
  const isTaskTeamPage = pathname.startsWith('/task-teams');

  const {
    idEventDelete,
    idTaskDelete,
    taskSelected,
    statusTaskSelected,
    dataEventEdit,
    dataTaskEditKanban,
    idTaskStarting,
    showWarningStartTaskModal,
    taskSelectedToStart,
    setDataClickTask,
    setTaskSelected,
    setStatusTaskSelected,
    setTaskSelectedAction,
    setIdTaskStarting,
    setShowWarningStartTaskModal,
    setDataRunning,
    setIdEventDelete,
    setIdTaskDelete,
    setDataEventEdit,
    setDataTaskEditKanban,
    setTaskSelectedToStart,
    setDataActualAddSchedule,
    displayHeaderDateStart,
    displayHeaderDateEnd,
    setTaskAddEmpty,
    setDataActualEdit,
  } = useContext(TaskContext);

  const [isShowWarningEmptyTask, setIsShowWarningEmptyTask] = useState(false);

  const [optionsTaskMe, setOptionsTaskMe] = useState<OptionDropdownType[]>([]);
  const [_dataOverTimeWarning, setDataOverTimeWarning] = useState<{
    id: string;
    type: string;
    isOverEstimate: boolean;
    taskDurationRunningUuid: string;
  } | null>();
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    99,
    999,
  );
  const { authenticatedUser } = useAuthenticatedUser({});

  const { dataTaskHeaderStart, refetchTaskHeaderStart } = useTaskHeaderStart({
    onSuccess: (data) => {
      if (data.isOverEstimate) {
        setDataOverTimeWarning({
          id: `${data.id}`,
          type: data.type,
          isOverEstimate: true,
          taskDurationRunningUuid: data.taskDurationRunningUuid,
        });
      } else {
        setDataOverTimeWarning(null);
      }
      setDataRunning({
        id: String(data.id),
        type: data.type,
      });
    },
  });

  const { dataTaskHeaderList, refetchDataHeaderTaskList } =
    useDataHeaderTaskList({
      start_date: formatQueryStartDateForCalendar(startOfDay),
      end_date: formatQueryStartDateForCalendar(endOfDay),
    });

  useEffect(() => {
    refetchDataHeaderTaskList();
  }, [pathname, refetchDataHeaderTaskList]);

  useEffect(() => {
    const handleSocketMessage = (data: WebSocketMessageDataOverTime) => {
      switch (data.action) {
        case SocketActions.DURATION_OVERTIME_WARNING:
          if (data.isOverEstimate) {
            setDataOverTimeWarning({
              id: `${data.id}`,
              type: data.type,
              isOverEstimate: true,
              taskDurationRunningUuid: data.taskDurationRunningUuid,
            });
          } else {
            setDataOverTimeWarning(null);
          }
          break;

        default:
          break;
      }
    };

    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTaskPage) {
      refetchDataHeaderTaskList();
    }
  }, [isTaskPage]);

  const { taskDurationDetail, refetchTaskDurationDetail } =
    useTaskDurationDetail({
      item: {
        id: `${taskSelected.value}`.replace('event', ''),
        type: `${taskSelected.type}`,
      },
    });

  useEffect(() => {
    if (dataTaskHeaderList) {
      const dataOption = dataTaskHeaderList.cards.map((item) => {
        return {
          label: item.title || '',
          value: item.type === ItemStartType.TASK ? item.id : `${item.id}event`,
          type: item.type,
          totalData: item.totalDuration,
          isMyRoutine: item.isMyRoutine,
        };
      });

      setOptionsTaskMe([OPTION_DEFAULT_TASK, ...dataOption]);
    }
  }, [dataTaskHeaderList]);

  useEffect(() => {
    if (
      dataTaskHeaderStart &&
      dataTaskHeaderStart.id &&
      dataTaskHeaderStart.isStart
    ) {
      setTaskSelected({
        label: dataTaskHeaderStart.title,
        value:
          dataTaskHeaderStart.type === ItemStartType.TASK
            ? dataTaskHeaderStart.id
            : `${dataTaskHeaderStart.id}event`,
        type: dataTaskHeaderStart.type,
      });

      if (dataTaskHeaderStart.id) {
        setStatusTaskSelected({
          taskDuration: dataTaskHeaderStart.taskDuration,
          isStart: dataTaskHeaderStart.isStart,
          taskDurationRunningUuid: dataTaskHeaderStart.taskDurationRunningUuid,
        });
      }
    } else {
      setTaskSelected(OPTION_DEFAULT_TASK);
    }
  }, [dataTaskHeaderStart, setStatusTaskSelected, setTaskSelected]);

  useEffect(() => {
    if (idEventDelete) {
      const newOptions = optionsTaskMe.filter(
        (item) => `${item.value}` !== idEventDelete,
      );
      setTaskSelected({
        label: '',
        value: '',
      });
      refetchTaskHeaderStart();
      setOptionsTaskMe(newOptions);
      setIdEventDelete('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEventDelete, optionsTaskMe, setIdEventDelete, setTaskSelected]);

  useEffect(() => {
    if (idTaskDelete) {
      const newOptions = optionsTaskMe.filter(
        (item) => `${item.value}` !== idTaskDelete,
      );
      setTaskSelected({
        label: '',
        value: '',
      });
      refetchTaskHeaderStart();

      setOptionsTaskMe(newOptions);
      setIdTaskDelete('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idTaskDelete, optionsTaskMe, setIdTaskDelete, setTaskSelected]);

  useEffect(() => {
    if (dataEventEdit && dataEventEdit.value) {
      const newOptions = optionsTaskMe.map((item) => {
        if (`${item.value}` === `${dataEventEdit.value}event`) {
          return {
            ...item,
            label: dataEventEdit.label,
          };
        } else {
          return item;
        }
      });
      setOptionsTaskMe(newOptions);
      if (
        `${taskSelected.value}`.replace('event', '') ===
        `${dataEventEdit.value}`.replace('event', '')
      ) {
        setTaskSelected((prev) => {
          return {
            ...prev,
            label: dataEventEdit.label,
          };
        });
      }
      setDataEventEdit({
        label: '',
        value: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataEventEdit]);
  useEffect(() => {
    if (dataTaskEditKanban && dataTaskEditKanban.value) {
      const newOptions = optionsTaskMe.map((item) => {
        if (`${item.value}` === `${dataTaskEditKanban.value}`) {
          return {
            ...item,
            label: dataTaskEditKanban?.label,
          };
        } else {
          return item;
        }
      });
      setOptionsTaskMe(newOptions);
      if (
        `${taskSelected?.value}`.replace('event', '') ===
        `${dataTaskEditKanban.value}`.replace('event', '')
      ) {
        setTaskSelected((prev) => {
          return {
            ...prev,
            label: dataTaskEditKanban.label,
          };
        });
      }
      setDataTaskEditKanban({
        label: '',
        value: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataTaskEditKanban]);

  useEffect(() => {
    if (taskDurationDetail) {
      setStatusTaskSelected(taskDurationDetail);
    }
  }, [setStatusTaskSelected, taskDurationDetail]);

  // Handle start and stop task
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
        id: `${taskSelected.value}`,
        type: `${taskSelected.type}`,
      });
      setTaskSelectedAction({
        id:
          taskSelected.type === ItemStartType.TASK
            ? `${taskSelected.value}`
            : `${`${taskSelected.value}`.replace('event', '')}event`,
        isStart: !statusTaskSelected?.isStart,
        type: `${taskSelected.type}`,
      });
      refetchTaskDurationDetail();
      refetchTaskHeaderStart();
      if (pathname === pageRouters.DAILY_REPORT_MANAGEMENT.href) {
        queryClient.refetchQueries(['getDataStatistic']);
      }

      if (data) {
        const startDateActual = new Date(`${data.planStartDate}`);
        const endDateActual = new Date(`${data.planEndDate}`);
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
          refetchTaskHeaderStart();
          refetchDataHeaderTaskList();
        }
      }
    },
  });

  const handleSetParam = ({
    id,
    action,
    type = ItemStartType.TASK,
  }: {
    id: string | null;
    action: string;
    type: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.delete('event');
    params.delete('action');
    params.delete('type');
    params.set('action', action);
    params.set('type', type);
    router.push(`?${params.toString()}`);
  };
  const handleSetEventParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('event', id);
    }
    params.delete('task');
    params.delete('action');
    params.delete('type');
    params.set('action', action);
    params.set('type', ItemStartType.SCHEDULE);
    router.push(`?${params.toString()}`);
  };

  const handleConfirmStartNewTask = async () => {
    taskSelectedToStart &&
      calculateDurationTask({
        id: `${taskSelectedToStart.id}`.replace('event', ''),
        type: `${taskSelectedToStart.type}`,
        isStart: true,
      });
    setShowWarningStartTaskModal(false);
    taskSelectedToStart &&
      setDataRunning({
        id: `${taskSelectedToStart.id}`,
        type: `${taskSelectedToStart.type}`,
      });
  };

  // Handle call API cancel alert
  const handleCancelAlert = async ({
    uuid,
    isCancelAlert,
  }: {
    uuid: string;
    isCancelAlert: boolean;
  }) => {
    return await api.put(apiRouters.UPDATE_TASK_ACTUAL(uuid), {
      isCancelAlert,
    });
  };
  // Function call API  cancel alert
  const { mutate: _cancelAlert } = useMutation(
    'postCancelAlert',
    handleCancelAlert,
    {
      onSuccess: async () => {
        refetchTaskHeaderStart();
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  //  Handle call api create task
  const handleCreateTask = async (data: TaskRequest) => {
    return await api.post(apiRouters.CREATE_TASK, data);
  };
  // Handle create task and response
  const { mutate: createTask } = useMutation(
    'postCreateUser',
    handleCreateTask,
    {
      onSuccess: async ({ data }: { data: Task }) => {
        setTaskAddEmpty(data);
        setTaskSelectedToStart({
          title: data.title,
          id: data.id,
          type: ItemStartType.TASK,
        });
        setOptionsTaskMe([
          ...optionsTaskMe,
          {
            label: data.title,
            value: data.id,
            type: ItemStartType.TASK,
          },
        ]);

        setTaskSelectedAction({
          id:
            idTaskStarting.type === ItemStartType.TASK
              ? `${idTaskStarting.id}`
              : `${`${idTaskStarting.id}`.replace('event', '')}event`,
          isStart: false,
          type: `${idTaskStarting.type}`,
        });

        calculateDurationTask({
          id: String(data.id),
          type: ItemStartType.TASK,
          isStart: true,
        });
      },
      onError: () => {},
      onSettled: () => {},
    },
  );
  // Check star with task empty
  const handleCheckTaskStartWithEmpty = async () => {
    const apiUrl = apiRouters.TASK_HEADER_START;
    const { data } = await api.get<TaskRunningType>(apiUrl);
    return data;
  };

  const { mutate: checkTaskStartWithEmpty } = useMutation(
    'handleCheckTaskStartWithEmpty',
    handleCheckTaskStartWithEmpty,
    {
      onSuccess: async (data) => {
        if (data.isStart) {
          setIdTaskStarting({
            id: String(data.id),
            type: data.type,
          });
          setIsShowWarningEmptyTask(true);
          return;
        } else {
          handleStartEmptyTask();
        }
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handleStartEmptyTask = () => {
    const isMainOrg = authenticatedUser?.organizations?.find(
      (organization) => organization.isMain,
    );
    if (isMainOrg) {
      createTask({
        title: convertDateStringWithFormat(new Date()),
        statusId: StatusValueTask.IN_PROGRESS,
        priority: '',
        deadline: null,
        description: '',
        tagIds: [],
        isImportant: false,
        sendToChat: false,
        organizationId: isMainOrg.id,
        task_schedule_from_date: formatDateServer(displayHeaderDateStart),
        task_schedule_end_date: formatDateServer(displayHeaderDateEnd),
        remindCountdown: null,
        remindType: null,
        repeatType: null,
        isTeamTask: false,
        peopleInChargeIds: [{ peopleInChargeId: session?.user.id as number }],
      });
    }
  };

  const timeTaskSelect = dataTaskHeaderList?.cards.find(
    (item) =>
      item.id === parseInt(String(taskSelected.value).replace('event', '')) &&
      item.type === taskSelected.type,
  );
  const [valueStart, setValueStart] = useState('');

  useEffect(() => {
    setValueStart(
      statusTaskSelected?.isStart && taskSelected.value
        ? formatTimeTaskCustom(`${dataTaskHeaderStart?.startedAt}`)
        : formatTimeTaskCustom(
            `${timeTaskSelect ? timeTaskSelect?.startedAt : ''}`,
          ),
    );
  }, [
    dataTaskHeaderStart?.startedAt,
    statusTaskSelected?.isStart,
    taskSelected.value,
    timeTaskSelect,
  ]);

  // Update actual for task
  const handleUpdateActualTime = async ({
    uuid,
    data,
  }: {
    uuid: string;
    data: { startedAt: string | null; pausedAt: string | null };
  }) => {
    return await api.patch(apiRouters.UPDATE_TASK_ACTUAL(`${uuid}`), data);
  };

  const { mutate: updateActualTime } = useMutation(
    'postUpdateActualTime',
    handleUpdateActualTime,
    {
      onSuccess: async ({ data }, task) => {
        refetchDataHeaderTaskList();
        if (task.data.pausedAt === null) {
          queryClient.refetchQueries(['getTaskHeaderStart']);
          queryClient.refetchQueries(['getTaskDurationDetail']);
        } else {
          if (data.length > 0) {
            const totalDuration =
              data[0].planStartDate &&
              data[0].planEndDate &&
              getTimeDifference(data[0].planStartDate, data[0].planEndDate);
            setStatusTaskSelected({
              ...statusTaskSelected,
              taskDuration: totalDuration || '',
            });
          }
        }
        if (data.length > 0) {
          setDataActualEdit({
            uuid: data[0].uuid,
            startDate: data[0].planStartDate,
          });
        }
      },
      onError: () => {
        setValueStart(
          statusTaskSelected?.isStart && taskSelected.value
            ? formatTimeTaskCustom(`${dataTaskHeaderStart?.startedAt}`)
            : formatTimeTaskCustom(
                `${timeTaskSelect ? timeTaskSelect.startedAt : ''}`,
              ),
        );
      },
      onSettled: () => {},
    },
  );

  return (
    <>
      <div className="flex justify-between flex-grow">
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.MY_TASK_VIEW,
          ) && (
            <div className="flex items-center gap-4 px-4">
              <div className="w-fit h-10">
                <Dropdown
                  options={optionsTaskMe.filter((item) => item.type)}
                  className={`!w-[220px] h-full !p-2 !rounded-[6px] !border-[1px] !border-[#63B7EE] !text-sm !font-semibold`}
                  labelOptionClass="!text-sm"
                  classNameOption="!rounded-[6px]"
                  placeholder="打ち合わせ"
                  disabled={!isTaskPage || isTaskTeamPage}
                  searchOption
                  isShowTextActive
                  selectedOption={
                    taskSelected?.value
                      ? optionsTaskMe.find(
                          (element) => element.value === taskSelected?.value,
                        )
                      : OPTION_DEFAULT_TASK
                  }
                  onChange={(option: OptionDropdownType) => {
                    setTaskSelected(option);
                  }}
                />
              </div>
              {taskSelected?.value &&
              statusTaskSelected &&
              taskSelected?.value !== OPTION_DEFAULT_TASK.value ? (
                <DynamicTooltip
                  content={
                    statusTaskSelected?.isStart && taskSelected?.value
                      ? '計測停止'
                      : '計測開始'
                  }
                  placement="right">
                  <div
                    className={`flex justify-center items-center ${statusTaskSelected?.isStart && taskSelected.value && 'mx-5'}`}>
                    <div
                      className={`animated-border-box-glow ${
                        statusTaskSelected?.isStart && taskSelected.value
                          ? 'animate'
                          : ''
                      }`}></div>
                    <div
                      className={`animated-border-box ${
                        statusTaskSelected?.isStart && taskSelected.value
                          ? 'animate'
                          : ''
                      }`}>
                      <div className="mt-[4px] ml-[4px]">
                        <ImageRound
                          src={`/icons/${statusTaskSelected?.isStart && taskSelected.value ? 'pause' : 'play'}.svg`}
                          name="Start task day"
                          className={` !w-9 !h-9 hover:cursor-pointer`}
                          onClick={() => {
                            const selectedTask = taskSelected.value;

                            if (!selectedTask) return;
                            if (
                              optionsTaskMe.find(
                                (element) =>
                                  element.value === taskSelected.value,
                              )
                            ) {
                              setTaskSelectedToStart({
                                title: taskSelected.label,
                                id: taskSelected.value,
                                type: taskSelected.type as string,
                              });

                              calculateDurationTask({
                                id: `${selectedTask}`.replace('event', ''),
                                type: `${taskSelected.type}`,
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </DynamicTooltip>
              ) : (
                <div className="mt-[4px] ml-[4px]">
                  <ImageRound
                    src={`/icons/play.svg`}
                    name="Start task day"
                    className={`!w-9 !h-9 hover:cursor-pointer`}
                    onClick={() => checkTaskStartWithEmpty()}
                  />
                </div>
              )}

              {taskSelected?.value &&
              parseInt(String(taskSelected?.value)) &&
              optionsTaskMe.find(
                (element) => element.value === taskSelected?.value,
              ) ? (
                <div className="flex gap-x-4">
                  <ShowTimeCounter statusTaskSelected={statusTaskSelected} />
                  <div className="flex items-center justify-center text-xs font-medium text-[#A7B7C2] gap-x-1 min-w-[146px]">
                    <p>開始</p>
                    <p className="text-base font-normal text-[#77858F]">
                      <Input
                        type="text"
                        value={valueStart}
                        onChange={(e) => {
                          setValueStart(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={(e) => {
                          // Edit start data running in header
                          const startDate =
                            statusTaskSelected?.isStart && taskSelected.value
                              ? formatTimeTaskCustom(
                                  `${dataTaskHeaderStart?.startedAt}`,
                                )
                              : formatTimeTaskCustom(
                                  `${timeTaskSelect ? timeTaskSelect.startedAt : ''}`,
                                );
                          const isEventRunning =
                            statusTaskSelected?.isStart && taskSelected.value;

                          const endDate = dataTaskHeaderList?.cards.find(
                            (item) =>
                              item.id ===
                                parseInt(
                                  String(taskSelected.value).replace(
                                    'event',
                                    '',
                                  ),
                                ) && item.type === taskSelected.type,
                          )?.pausedAt;
                          const data = isTimeEarlier(
                            formatTimeInputCustom(
                              `${convertToMinutesNumber(e.target.value)}`,
                            ),
                            isEventRunning
                              ? formatCurrentDay()
                              : formatTime24h(endDate || ''),
                          );

                          if (data) {
                            setValueStart(
                              formatTimeInputCustom(
                                `${convertToMinutesNumber(e.target.value)}`,
                              ),
                            );
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length > 4) {
                              value = value.substring(0, 4);
                            }
                            updateActualTime({
                              data: {
                                startedAt: combineDateAndTime(
                                  isEventRunning
                                    ? new Date()
                                    : new Date(endDate as string),
                                  `${formatTimeInputCustom(`${convertToMinutesNumber(value)}`)}`,
                                ),
                                pausedAt: isEventRunning
                                  ? null
                                  : convertDateString(endDate as string),
                              },
                              uuid:
                                statusTaskSelected.taskDurationRunningUuid ||
                                '',
                            });
                          } else {
                            setValueStart(startDate);
                          }
                        }}
                        className="!w-[50px] !px-0 !py-0 text-[#77858F] !text-base  font-normal text-center !border-none  !opacity-100"
                      />
                    </p>
                    <p className="px-[2px]">~</p>

                    {statusTaskSelected?.isStart && taskSelected.value ? (
                      <>
                        <p>終了</p>
                        <p className="text-xs font-normal text-[#77858F]">
                          計測中
                        </p>
                      </>
                    ) : (
                      <>
                        <p>終了</p>
                        <p className="text-base font-normal text-[#77858F]">
                          {formatTimeTaskCustom(
                            `${
                              dataTaskHeaderList?.cards.find(
                                (item) =>
                                  item.id ===
                                    parseInt(
                                      String(taskSelected.value).replace(
                                        'event',
                                        '',
                                      ),
                                    ) && item.type === taskSelected.type,
                              )?.pausedAt
                            }`,
                          )}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[#77858F]">{DEFAULT_TIME_TEXT}</span>
              )}
              {/* TODO: Close show nottify */}
              {/* {statusTaskSelected?.isStart &&
                taskSelected?.value &&
                dataOverTimeWarning &&
                dataOverTimeWarning?.isOverEstimate &&
                taskSelected?.type === dataOverTimeWarning?.type &&
                `${String(taskSelected?.value).replace('event', '')}` ===
                  dataOverTimeWarning.id && (
                  <div className="flex gap-1 items-center text-xs font-normal text-[#E95062] mt-[2px]">
                    <ImageRound
                      src={`/icons/overlap-task.svg`}
                      name="icon warning"
                      className=" w-3 h-3"
                    />
                    <ImageRound
                      src={`/icons/red-close.svg`}
                      name="icon cancel"
                      onClick={() => {
                        cancelAlert({
                          uuid: dataOverTimeWarning.taskDurationRunningUuid,
                          isCancelAlert: true,
                        });
                      }}
                      className=" w-4 h-4 cursor-pointer"
                    />
                    <p className="break-keep">{ERROR_TIME_START_MESSAGE}</p>
                  </div>
                )} */}
              <Button
                variant="secondary"
                className="whitespace-nowrap mt-1 min-w-[22px]  bg-transparent border-none hover:opacity-75  !px-0 !py-0 !rounded-lg"
                onClick={() => {
                  const itemFind = optionsTaskMe.find(
                    (element) => element.value === taskSelected?.value,
                  );
                  if (parseInt(String(taskSelected.value)) && itemFind) {
                    if (taskSelected.type === ItemStartType.SCHEDULE) {
                      handleSetEventParam({
                        id: `${taskSelected.value}`.replace('event', ''),
                        action: ActionTask.EDIT,
                      });
                    } else {
                      handleSetParam({
                        id: `${taskSelected.value}`,
                        action: ActionTask.EDIT,
                        type: itemFind.isMyRoutine
                          ? ItemStartType.FIXED_TASK
                          : ItemStartType.TASK,
                      });
                    }
                  }
                }}>
                <ImageRound
                  src="/icons/detail-task.svg"
                  name="right"
                  style={{
                    height: '22px',
                    width: '22px',
                  }}
                  className="!text-transparent cursor-pointer"
                />
              </Button>
            </div>
          )}
        {session?.user.permissions &&
          hasPermissionInArray(
            session?.user.permissions,
            PermissionsSystem.MY_TASK_VIEW,
          ) && (
            <div className="flex flex-col gap-1 text-xs font-medium text-[#A7B7C2]">
              <p className="break-keep">本日の作業時間</p>
              <p className="text-base font-normal text-[#77858F] w-full text-center">
                {dataTaskHeaderList ? dataTaskHeaderList.totalDuration : ''}
              </p>
            </div>
          )}
      </div>
      {showWarningStartTaskModal && isTaskTeamPage && (
        <WarningStartTaskModal
          open={showWarningStartTaskModal}
          type={idTaskStarting.type === ItemStartType.TASK ? 'タスク' : '予定'}
          onClose={() => {
            setShowWarningStartTaskModal(false);
          }}
          onConfirm={handleConfirmStartNewTask}
        />
      )}
      {showWarningStartTaskModal && !isTaskPage && (
        <WarningStartTaskModal
          open={showWarningStartTaskModal}
          type={idTaskStarting.type === ItemStartType.TASK ? 'タスク' : '予定'}
          onClose={() => {
            setShowWarningStartTaskModal(false);
          }}
          onConfirm={handleConfirmStartNewTask}
        />
      )}
      {isShowWarningEmptyTask && (
        <WarningStartTaskModal
          open={isShowWarningEmptyTask}
          type={idTaskStarting.type === ItemStartType.TASK ? 'タスク' : '予定'}
          onClose={() => {
            setIsShowWarningEmptyTask(false);
          }}
          onConfirm={() => {
            handleStartEmptyTask();
            setIsShowWarningEmptyTask(false);
          }}
        />
      )}
    </>
  );
};

export default TaskPageDataHeader;
