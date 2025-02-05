'use client';
import { useContext, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from 'react-query';
import { EventContentArg } from '@fullcalendar/core/index.js';

import ImageRound from '@components/common/ImageRound';
import WarningStartTaskModal from '@components/modals/WarningStartTaskModal';
import ActionActualSchedule from '@components/modals/ActionActualSchedule';

import { apiRouters } from '@constants/routers';
import { NO_SETTING } from '@constants';
import {
  ActionsEvent,
  ActionTask,
  ItemScheduleType,
  ItemStartType,
} from '@constants/enums';
import useCalculateDurationTask from '@hooks/useCalculateDurationTask';
import { TaskContext } from '@providers/TaskProvider';
import api from '@base/api';
import {
  adjustEndDate,
  convertToCurrentTimezone,
  convertToTimeString,
  getMinuteDifference,
  getNext30MinuteSlot,
  isMoreThanFifteenMinutes,
  isMoreThanThirtyMinutes,
} from '@utils/date';
import { TaskActualType, TaskTimeSchedule } from '@interfaces/task';

interface TaskCardProps {
  event: EventContentArg;
  slotHeight: number;
  titleSize: number;
  contentSize: number;
  isOptionZoomSchedule: string;
  handleSetEventParam: ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => void;
  handleUpdateItemStart: (data: {
    id: string;
    isStart: boolean;
    type: string;
  }) => void;
  setTaskTimeScheduleList: React.Dispatch<
    React.SetStateAction<TaskTimeSchedule[]>
  >;
}
const TaskCard = ({
  event,
  slotHeight,
  isOptionZoomSchedule,
  handleSetEventParam,
  handleUpdateItemStart,
  setTaskTimeScheduleList,
}: TaskCardProps) => {
  const {
    idTaskStarting,
    taskSelectedToStart,
    setDataRunning,
    setDataClickTask,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setIdTaskEditSelected,
    setTaskSelectedAction,
    setTaskSelected,
    setDataActualAddSchedule,
  } = useContext(TaskContext);

  const [isShowEditActual, setIsShowEditActual] = useState(false);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const resourcePlan =
    event.event._def &&
    event.event._def.resourceIds?.length &&
    event.event._def.resourceIds[0] === ItemScheduleType.PLANS;

  let isStart = false;
  let isEvent = false;
  let isCalculation = false;

  try {
    const extendedProps = event?.event?.extendedProps;
    isStart = extendedProps?.isStart ?? false;
    isEvent = extendedProps?.type === ItemStartType.SCHEDULE;
    isCalculation = extendedProps?.isCalculation ?? false;
  } catch (error) {
    // Handle Error
  }

  const [showWarningStartModal, setShowWarningStartModal] =
    useState<boolean>(false);

  const router = useRouter();

  const queryClient = useQueryClient();

  const { calculateDurationTask } = useCalculateDurationTask({
    onSuccess: (response) => {
      const data = response.data;
      taskSelectedToStart &&
        queryClient.refetchQueries([
          'getTaskDurationDetail',
          {
            id: `${taskSelectedToStart.id}`,
            type: `${taskSelectedToStart.type}`,
          },
        ]);
      handleUpdateItemStart({
        id: isEvent ? event.event.id : event.event.extendedProps.taskId,
        isStart: !isStart,
        type: isEvent ? ItemStartType.SCHEDULE : ItemStartType.TASK,
      });

      taskSelectedToStart &&
        setTaskSelected({
          label: taskSelectedToStart?.title,
          value:
            taskSelectedToStart.type === ItemStartType.TASK
              ? taskSelectedToStart.id
              : `${taskSelectedToStart.id}event`,
          type: taskSelectedToStart.type,
        });
      queryClient.refetchQueries(['getTaskHeaderStart']);
      queryClient.refetchQueries(['getDataTaskHeaderList']);

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
            id: isEvent
              ? event.event.id.replace('event', '')
              : event.event.extendedProps.taskId,
            type: isEvent ? ItemStartType.SCHEDULE : ItemStartType.TASK,
          });
          setTaskSelectedAction({
            id: isEvent ? event.event.id : event.event.extendedProps.taskId,
            isStart: !isStart,
            title: event.event.title,
            type: isEvent ? ItemStartType.SCHEDULE : ItemStartType.TASK,
          });
          setDataRunning({
            id: isEvent
              ? event.event.id.replace('event', '')
              : event.event.extendedProps.taskId,
            type: isEvent ? ItemStartType.SCHEDULE : ItemStartType.TASK,
          });
        } else {
          setDataClickTask({
            id: task.id,
            type: task.type,
          });
          setIdTaskStarting({
            id: data.id,
            type: data.type,
          });
          setShowWarningStartModal(true);
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
      type:
        event.event.extendedProps.type === ItemStartType.SCHEDULE
          ? ItemStartType.SCHEDULE
          : ItemStartType.TASK,
    });
  };

  const handleStartStopTask = async (e: any) => {
    e.stopPropagation();
    if (isEvent) {
      await new Promise<void>((resolve) => {
        setTaskSelectedToStart({
          id: parseInt(event.event.id),
          title: event.event.title,
          type:
            event.event.extendedProps.type === ItemStartType.SCHEDULE
              ? ItemStartType.SCHEDULE
              : ItemStartType.TASK,
        });
        resolve();
      });
      handleConfirmCheckStartTask(`${event.event.id.replace('event', '')}`);
    } else {
      await new Promise<void>((resolve) => {
        setTaskSelectedToStart({
          id: parseInt(event.event.extendedProps.taskId),
          title: event.event.title,
          type:
            event.event.extendedProps.type === ItemStartType.SCHEDULE
              ? ItemStartType.SCHEDULE
              : ItemStartType.TASK,
        });
        resolve();
      });
      handleConfirmCheckStartTask(`${event.event.extendedProps.taskId}`);
    }
  };

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
    params.set('type', ItemStartType.TASK);
    params.set('action', action);
    router.push(`?${params.toString()}`);
  };

  const differentTime =
    event.timeText && isMoreThanThirtyMinutes(event.timeText);

  const handleConfirmStartNewTask = async () => {
    handleUpdateItemStart({
      id:
        idTaskStarting.type === ItemStartType.TASK
          ? `${idTaskStarting.id}`
          : `${idTaskStarting.id}event`,
      isStart: false,
      type: idTaskStarting.type,
    });
    calculateDurationTask({
      id:
        event.event.extendedProps.type === ItemStartType.SCHEDULE
          ? `${event.event.id.replace('event', '')}`
          : event.event.extendedProps.taskId,
      type:
        event.event.extendedProps.type === ItemStartType.SCHEDULE
          ? ItemStartType.SCHEDULE
          : ItemStartType.TASK,
    });
    setShowWarningStartModal(false);

    setDataRunning({
      id: `${event.event.id.replace('event', '')}`,
      type:
        event.event.extendedProps.type === ItemStartType.SCHEDULE
          ? ItemStartType.SCHEDULE
          : ItemStartType.TASK,
    });
  };

  const handleUpdateSchedule = (data: TaskActualType[], uuid: string) => {
    const tasksActualSchedule = data
      .filter((task) => task.planStartDate)
      .map((task) => {
        const startDateActual = new Date(
          convertToCurrentTimezone(`${task.planStartDate}`),
        );
        const endDateActual = new Date(
          convertToCurrentTimezone(`${task.planEndDate}`),
        );
        const endTimeCustom = task.planEndDate
          ? endDateActual
          : getNext30MinuteSlot(startDateActual);
        if (task.type === ItemStartType.TASK) {
          return {
            title: task.title,
            start: startDateActual,
            end: task.planEndDate
              ? adjustEndDate(startDateActual, endDateActual, 5)
              : adjustEndDate(startDateActual, endTimeCustom as Date),
            id: task.id.toString(),
            taskId: task.taskId,
            uuid: task.uuid,
            planStartDate: task.planStartDate,
            planEndDate: task.planEndDate
              ? task.planEndDate
              : `${endTimeCustom}`,
            startEditable: task.planEndDate ? true : false,
            resourceId: ItemScheduleType.ACTUAL,
            type: ItemStartType.TASK,
            isMyTask: false,
            isStart: false,
            isCalculation: task.planEndDate ? false : true,
          };
        } else {
          return {
            title: task.title,
            start: startDateActual,
            end: task.planEndDate
              ? adjustEndDate(startDateActual, endDateActual)
              : adjustEndDate(startDateActual, endTimeCustom as Date),
            id: task.id.toString(),
            taskId: task.taskId,
            uuid: task.uuid,
            planStartDate: task.planStartDate,
            planEndDate: task.planEndDate
              ? task.planEndDate
              : `${endTimeCustom}`,
            startEditable: task.planEndDate ? true : false,
            resourceId: ItemScheduleType.ACTUAL,
            type: ItemStartType.SCHEDULE_ACTUAL,
            eventId: task.scheduleId,
            isMyTask: false,
            isStart: false,
            isCalculation: task.planEndDate ? false : true,
          };
        }
      });
    setTaskTimeScheduleList((prevEvents) => {
      return [
        ...prevEvents.filter((item) => item.uuid !== uuid),
        ...tasksActualSchedule,
      ];
    });
    setIsShowEditActual(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps

  const baseHeight =
    isOptionZoomSchedule === '00:05:00'
      ? 20
      : isOptionZoomSchedule === '01:00:00'
        ? 90
        : 46;
  const extendedProps = event.event?.extendedProps;

  return (
    <>
      <div
        style={{
          paddingTop: `${(slotHeight / baseHeight) * 7}px`,
          paddingBottom: `${(slotHeight / baseHeight) * 8}px`,
        }}
        className={`h-full group flex relative z-30  bg-white card-schedule item-schedule-shadow ${isCalculation && '!bg-custom-gradient'} ${!resourcePlan && '!bg-[#A7B9C2] !text-white'} ${isEvent && '!text-[#0068B6]'}    text-black rounded-md   justify-between   px-2 border`}
        onClick={() => {
          if (event.event.extendedProps.type === ItemStartType.SCHEDULE) {
            const newId = event.event.id.replace('event', '');
            handleSetEventParam({
              id: newId,
              action: ActionsEvent.EDIT,
            });
          } else {
            if (resourcePlan) {
              setIdTaskEditSelected(`${event.event.extendedProps.taskId}`);
              handleSetParam({
                id: `${event.event.extendedProps.taskId}`,
                action: ActionTask.EDIT,
              });
            }
          }
        }}>
        <div className="flex w-full relative h-full justify-between overflow-hidden">
          <div className="flex overflow-hidden flex-col gap-2 w-[95%]">
            <p className="font-bold min-h-[20px] text-sm truncate block w-full  ">
              {event?.event instanceof Error
                ? ''
                : event?.event?.title
                  ? event.event.title
                  : NO_SETTING}
            </p>
            <div className="text-[11px] flex gap-2">
              <p className=" h-full">
                {!isCalculation ? (
                  !event.timeText && isEvent ? (
                    <>
                      {extendedProps &&
                        convertToTimeString(extendedProps.planStartDate)}
                      ~
                      {extendedProps &&
                        convertToTimeString(extendedProps.planEndDate)}{' '}
                    </>
                  ) : (
                    event.timeText &&
                    differentTime &&
                    event.timeText.replace(' - ', ' ~ ')
                  )
                ) : (
                  <>{convertToTimeString(`${event.event.start}`)} ~ 計測中</>
                )}
              </p>
              {!resourcePlan && !isCalculation && (
                <p>{getMinuteDifference(event.timeText)}分</p>
              )}
            </div>
          </div>
          {resourcePlan ? (
            isEvent ? (
              <>
                <ImageRound
                  src={`/icons/lock.svg`}
                  name="icon lock"
                  style={{
                    bottom: `${(slotHeight / baseHeight) * 8}px`,
                  }}
                  className="absolute w-3 h-3 bottom-2 right-2 "
                />
              </>
            ) : (
              <>
                <ImageRound
                  src={`/icons/${isStart ? 'pause' : 'play'}.svg`}
                  name="Start task"
                  style={{
                    bottom: `${(slotHeight / baseHeight) * 8}px`,
                  }}
                  hidden={
                    !isMoreThanFifteenMinutes(
                      `${event.event.start}`,
                      `${event.event.end}`,
                    ) && isOptionZoomSchedule === '01:00:00'
                  }
                  className="absolute  w-[20px] h-[20px] bottom-2 right-2  hover:cursor-pointer"
                  onClick={handleStartStopTask}
                />
              </>
            )
          ) : (
            <ImageRound
              src={`/icons/edit.svg`}
              name="Start task"
              style={{
                top: `${(slotHeight / baseHeight) * 8}px`,
              }}
              className={`absolute resize-icon w-[14px] h-[14px]  right-2 hover:cursor-pointer ${isCalculation && 'hidden'}`}
              onClick={() => {
                setIsShowEditActual(true);
              }}
            />
          )}
        </div>

        <div className="absolute opacity-0 group-hover:opacity-100 bottom-[-20px] left-1/2 -translate-x-1/2 z-50">
          <ImageRound
            src={`/icons/resize-task.svg`}
            name="icon resize"
            className=""
          />
        </div>
      </div>
      {showWarningStartModal && (
        <WarningStartTaskModal
          open={showWarningStartModal}
          type={idTaskStarting.type === ItemStartType.TASK ? 'タスク' : '予定'}
          onClose={() => {
            setShowWarningStartModal(false);
          }}
          onConfirm={handleConfirmStartNewTask}
        />
      )}
      {isShowEditActual && (
        <ActionActualSchedule
          open={isShowEditActual}
          title={event.event.title ? event.event.title : ''}
          data={{
            uuid:
              event.event?.extendedProps && event.event?.extendedProps?.uuid,
            start: event.event.start?.toISOString() || '',
            end: event.event.end?.toISOString() || '',
          }}
          onSubmit={handleUpdateSchedule}
          onClose={() => setIsShowEditActual(false)}
        />
      )}
    </>
  );
};

export default TaskCard;
