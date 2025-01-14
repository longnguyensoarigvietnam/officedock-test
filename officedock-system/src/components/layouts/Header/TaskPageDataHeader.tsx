import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { memo, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from 'react-query';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';

import {
  ActionTask,
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
} from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';

import useCalculateDurationTask from '@hooks/useCalculateDurationTask';
import useContinueCounterTime from '@hooks/useContinueCounterTime';
import useTaskHeaderStart from '@hooks/useTaskHeaderStart';
import { useDebounce } from '@hooks/useDebounce';
import useTaskDurationDetail from '@hooks/useTaskDurationDetail';

import { OptionDropdownType } from '@interfaces/common';
import { TaskDuration } from '@interfaces/task';
import { TaskContext } from '@providers/TaskProvider';
import { handleSearchRegex, hasPermissionInArray } from '@utils';
import api from '@base/api';
import WarningStartTaskModal from '@components/modals/WarningStartTaskModal';
import {
  convertToCurrentTimezone,
  formatQueryStartDateForCalendar,
} from '@utils/date';
import useDataHeaderTaskList from '@hooks/useDataHeaderTask';

const ShowTimeCounter = memo(
  ({ statusTaskSelected }: { statusTaskSelected: TaskDuration }) => {
    const elapsedTime = useContinueCounterTime(statusTaskSelected);

    return <span className="text-[#77858F]">{elapsedTime}</span>;
  },
);

const TaskPageDataHeader = () => {
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams);

  const userIdTask = searchParams.get('user');

  const { data: session } = useSession();

  const router = useRouter();

  const pathname = usePathname();

  const queryClient = useQueryClient();

  const isTaskPage = pathname.startsWith('/task');

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
    setSearchValue,
    setIdTaskStarting,
    setShowWarningStartTaskModal,
    setDataRunning,
    setIdEventDelete,
    setIdTaskDelete,
    setDataEventEdit,
    setDataTaskEditKanban,
    setTaskSelectedToStart,
    setDataActualAddSchedule,
  } = useContext(TaskContext);
  const debouncedSetSearchValue = useDebounce(setSearchValue, 1000);

  const [optionsTaskMe, setOptionsTaskMe] = useState<OptionDropdownType[]>([]);
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

  const { dataTaskHeaderStart, refetchTaskHeaderStart } = useTaskHeaderStart({
    userId: `${userIdTask}`,
  });
  const { dataTaskHeaderList, refetchDataHeaderTaskList } =
    useDataHeaderTaskList({
      start_date: formatQueryStartDateForCalendar(startOfDay),
      end_date: formatQueryStartDateForCalendar(endOfDay),
    });

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
      const dataOption = dataTaskHeaderList.map((item) => {
        return {
          label: item.title,
          value: item.type === ItemStartType.TASK ? item.id : `${item.id}event`,
          type: item.type,
        };
      });

      setOptionsTaskMe(dataOption);
    }
  }, [dataTaskHeaderList]);

  useEffect(() => {
    if (dataTaskHeaderStart && dataTaskHeaderStart.id) {
      setTaskSelected({
        label: dataTaskHeaderStart.title,
        value:
          dataTaskHeaderStart.type === ItemStartType.TASK
            ? dataTaskHeaderStart.id
            : `${dataTaskHeaderStart.id}event`,
        type: dataTaskHeaderStart.type,
      });
      setDataRunning({
        id:
          dataTaskHeaderStart.type === ItemStartType.TASK
            ? `${dataTaskHeaderStart.id}`
            : `${dataTaskHeaderStart.id}event`,
        type: dataTaskHeaderStart.type,
      });

      if (dataTaskHeaderStart.id) {
        setStatusTaskSelected({
          taskDuration: dataTaskHeaderStart.taskDuration,
          isStart: dataTaskHeaderStart.isStart,
        });
      }
    } else {
      if (!taskSelected) {
        setTaskSelected({
          label: '',
          value: '',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataTaskHeaderStart, setStatusTaskSelected, setDataRunning]);

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
            label: dataTaskEditKanban.label,
          };
        } else {
          return item;
        }
      });
      setOptionsTaskMe(newOptions);
      if (
        `${taskSelected.value}`.replace('event', '') ===
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
    onSuccess: (response) => {
      const data = response.data;
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
      if (pathname === pageRouters.STATISTICS_MANAGEMENT.href) {
        queryClient.refetchQueries(['getDataStatistic']);
      }
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
      onSuccess: async (response, task) => {
        const items = response.data;

        if (!items.isAnotherTaskStarted) {
          calculateDurationTask({
            id: `${taskSelected.value}`.replace('event', ''),
            type: `${taskSelected.type}`,
          });
          setDataRunning({
            id: `${taskSelected.value}`,
            type: `${taskSelected.type}`,
          });
        } else {
          setIdTaskStarting({
            id: items.id,
            type: items.type,
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
  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.delete('event');
    params.delete('action');
    params.delete('type');
    params.set('action', action);
    params.set('type', ItemStartType.TASK);
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
      });
    setShowWarningStartTaskModal(false);
    taskSelectedToStart &&
      setDataRunning({
        id: `${taskSelectedToStart.id}`,
        type: `${taskSelectedToStart.type}`,
      });
  };

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
                  className="!w-[220px] h-full !p-2"
                  placeholder="打ち合わせ"
                  disabled={!isTaskPage}
                  searchOption
                  selectedOption={
                    taskSelected.value
                      ? optionsTaskMe.find(
                          (element) => element.value === taskSelected.value,
                        )
                      : undefined
                  }
                  onChange={(option: OptionDropdownType) => {
                    setTaskSelected(option);
                  }}
                />
              </div>
              <ImageRound
                src={`/icons/${statusTaskSelected?.isStart && taskSelected.value ? 'pause' : 'play'}.svg`}
                name="Start task day"
                className={`!w-9 !h-9 hover:cursor-pointer`}
                onClick={() => {
                  const selectedTask = taskSelected.value;

                  if (!selectedTask) return;

                  setTaskSelectedToStart({
                    title: taskSelected.label,
                    id: taskSelected.value,
                    type: taskSelected.type as string,
                  });

                  checkTask({
                    id: `${selectedTask}`.replace('event', ''),
                    type: `${taskSelected.type}`,
                  });
                }}
              />
              {taskSelected.value && parseInt(String(taskSelected.value)) ? (
                <ShowTimeCounter statusTaskSelected={statusTaskSelected} />
              ) : (
                <span className="text-[#77858F]">{'00:00:00'}</span>
              )}
              <Button
                variant="secondary"
                className="whitespace-nowrap !text-[#77858F] !px-2 !py-1 !rounded-sm"
                onClick={() => {
                  if (
                    taskSelected.value &&
                    parseInt(String(taskSelected.value))
                  ) {
                    if (taskSelected.type === ItemStartType.SCHEDULE) {
                      handleSetEventParam({
                        id: `${taskSelected.value}`.replace('event', ''),
                        action: ActionTask.EDIT,
                      });
                    } else {
                      handleSetParam({
                        id: `${taskSelected.value}`,
                        action: ActionTask.EDIT,
                      });
                    }
                  }
                }}>
                詳細
              </Button>
            </div>
          )}
        {isTaskPage && (
          <InputSearch
            placeholder="タスク、キーワードを検索"
            className="w-[360px]"
            inputClassName="!py-2"
            onChange={(e) =>
              debouncedSetSearchValue(handleSearchRegex(e.target.value))
            }
          />
        )}
      </div>
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
    </>
  );
};

export default TaskPageDataHeader;
