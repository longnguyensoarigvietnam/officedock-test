'use client';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { ChangeEvent, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { EventContentArg } from '@fullcalendar/core/index.js';

import ImageRound from '@components/common/ImageRound';
import WarningStartTaskModal from '@components/modals/WarningStartTaskModal';
import PopupDetail from './PopupDetail';
import PopupDetailEvent from './PopupDetailEvent';

import { NO_SETTING } from '@constants';
import { ItemScheduleType, ItemStartType, ViewOptions } from '@constants/enums';
import useCalculateDurationTask from '@hooks/useCalculateDurationTask';
import { TaskContext } from '@providers/TaskProvider';
import {
  compareWithCurrentDate,
  convertToCurrentTimezone,
  convertToTimeString,
  getMinuteDifference,
  isMoreThanFifteenMinutes,
  isMoreThanThirtyMinutes,
} from '@utils/date';
import { TaskTimeSchedule } from '@interfaces/task';
import { EventEditFormData } from '@interfaces/calendar';

interface TaskCardProps {
  event: EventContentArg;
  slotHeight: number;
  titleSize: number;
  contentSize: number;
  isOptionZoomSchedule: string;
  isSelect: boolean;
  isShiftPressed: boolean;
  taskTimeScheduleList: TaskTimeSchedule[];
  isModalShow: boolean;
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
  deletePlanTask: (uuid: string, taskId: number) => void;
  deleteActualTask: (uuid: string) => void;
  handleChangeStartTime: (
    e: ChangeEvent<HTMLInputElement>,
    endDate: string,
    uuid: string,
    resourcePlan: boolean,
  ) => void;
  handleChangeEndTime: (
    e: ChangeEvent<HTMLInputElement>,
    startDate: string,
    uuid: string,
    resourcePlan: boolean,
  ) => void;
  onDeleteEvent?: (values: EventEditFormData) => void;
}
const TaskCard = ({
  event,
  isModalShow,
  isSelect,
  isShiftPressed,
  slotHeight,
  isOptionZoomSchedule,
  taskTimeScheduleList,
  onDeleteEvent,
  deletePlanTask,
  deleteActualTask,
  handleUpdateItemStart,
  handleChangeStartTime,
  handleChangeEndTime,
}: TaskCardProps) => {
  const {
    isInteracting,
    idTaskStarting,
    taskSelectedToStart,
    setIdTaskEditSelected,
    setDataRunning,
    setDataClickTask,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setTaskSelectedAction,
    setTaskSelected,
    setDataActualAddSchedule,
  } = useContext(TaskContext);

  const searchParams = useSearchParams();

  const view = searchParams.get('view');

  const resourcePlan =
    event.event._def &&
    event.event._def.resourceIds?.length &&
    event.event._def.resourceIds[0] === ItemScheduleType.PLANS;

  let isStart = false;
  let isEvent = false;
  let isCalculation = false;
  let largeColor = '';
  let checkDeadline = false;

  try {
    const extendedProps = event?.event?.extendedProps;
    isStart = extendedProps?.isStart ?? false;
    isEvent = extendedProps?.type === ItemStartType.SCHEDULE;
    isCalculation = extendedProps?.isCalculation ?? false;
    largeColor = extendedProps.largeColor;
    checkDeadline =
      extendedProps && compareWithCurrentDate(extendedProps.deadline);
  } catch (error) {
    // Handle Error
  }

  const [showWarningStartModal, setShowWarningStartModal] =
    useState<boolean>(false);

  const queryClient = useQueryClient();

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
        setShowWarningStartModal(true);
        return;
      }

      setTaskSelectedAction({
        id: isEvent ? event.event.id : event.event.extendedProps.taskId,
        isStart: !isStart,
        title: event.event.title,
        type: isEvent ? ItemStartType.SCHEDULE : ItemStartType.TASK,
      });
      setDataRunning({
        id: isEvent
          ? event.event.extendedProps.scheduleId
          : event.event.extendedProps.taskId,
        type: isEvent ? ItemStartType.SCHEDULE : ItemStartType.TASK,
      });

      taskSelectedToStart &&
        queryClient.refetchQueries([
          'getTaskDurationDetail',
          {
            id: `${taskSelectedToStart.id}`,
            type: `${taskSelectedToStart.type}`,
          },
        ]);
      handleUpdateItemStart({
        id: isEvent
          ? event.event.extendedProps.scheduleId
          : event.event.extendedProps.taskId,
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

  // Action call API check start task
  const handleConfirmCheckStartTask = (id: string) => {
    calculateDurationTask({
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
      handleConfirmCheckStartTask(`${event.event.extendedProps.scheduleId}`);
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
          ? `${event.event.extendedProps.scheduleId}`
          : event.event.extendedProps.taskId,
      type:
        event.event.extendedProps.type === ItemStartType.SCHEDULE
          ? ItemStartType.SCHEDULE
          : ItemStartType.TASK,
      isStart: true,
    });
    setShowWarningStartModal(false);

    setDataRunning({
      id: `${event.event.extendedProps.scheduleId}`,
      type:
        event.event.extendedProps.type === ItemStartType.SCHEDULE
          ? ItemStartType.SCHEDULE
          : ItemStartType.TASK,
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps

  const baseHeight =
    isOptionZoomSchedule === '00:05:00'
      ? 20
      : isOptionZoomSchedule === '01:00:00'
        ? 90
        : 46;

  const [isShowAction, setIsShowAction] = useState(false);

  const [local, setLocal] = useState({
    clientX: 0,
    clientY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const [isHovering, setIsHovering] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: any) => {
    setLocal({
      clientX: e.clientX,
      clientY: e.clientY,
    });
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setTimeout(() => {
      if (!popupRef.current?.matches(':hover')) {
        setIsHovering(false);
        setIsShowAction(false);
      }
    }, 100);
  };

  const handlePopupLeave = () => {
    setTimeout(() => {
      if (!popupRef.current?.matches(':hover')) {
        setIsHovering(false);
        setIsShowAction(false);
      }
    }, 100);
  };
  useEffect(() => {
    if (isModalShow) {
      setIsHovering(false);
    }
  }, [isModalShow]);

  const renderModal = () => {
    return (
      <div
        className={`w-[250px]    fixed top-0 left-0 z-[999]  h-fit rounded-md pl-5 pr-[10px] pt-[10px] pb-5 bg-white`}
        ref={popupRef}
        onMouseLeave={handlePopupLeave}
        onMouseEnter={() => setIsHovering(true)}
        style={{
          top: local.clientY,
          left: local.clientX - 100,
          boxShadow: '0px 2px 8px 0px #0000001A',
        }}>
        {isEvent ? (
          <PopupDetailEvent
            dataEvent={{
              title: event.event?.title,
              id: event.event?.extendedProps.scheduleId,
              eventSchedule: event.event?.extendedProps.eventSchedule,
              scheduleId: event.event?.extendedProps.scheduleId,
              start: event.event?.extendedProps.planStartDate,
              end: event.event?.extendedProps.isAllDay
                ? event.event?.extendedProps.endDate
                : event.event?.extendedProps.planEndDate,
              left: 0,
              top: 0,
              address: event.event?.extendedProps.address,
              participants: event.event?.extendedProps.participants,
              isAllDay: event.event?.extendedProps.isAllDay,
              type: {
                label: event.event?.extendedProps.eventType,
                value: event.event?.extendedProps.eventType,
              },
              repeatType: event.event?.extendedProps?.repeatType,
              repeatInterval: event.event?.extendedProps?.repeatInterval,
              weekDay: event.event?.extendedProps?.weekDay,
              monthDay: event.event?.extendedProps?.monthDay,
              month: event.event?.extendedProps?.month,
            }}
            onDelete={onDeleteEvent}
          />
        ) : (
          <PopupDetail
            title={event?.event?.title}
            isCalculation={isCalculation}
            largeColor={largeColor}
            resourcePlan={resourcePlan}
            isShowAction={isShowAction}
            planStartDate={event.event?.extendedProps.planStartDate}
            planEndDate={event.event?.extendedProps.planEndDate}
            checkDeadline={checkDeadline}
            isStart={isStart}
            uuid={event.event?.extendedProps?.uuid}
            taskTimeScheduleList={taskTimeScheduleList}
            setIsShowAction={(show: boolean) => {
              setIsShowAction(show);
            }}
            handleChangeStartTime={handleChangeStartTime}
            handleChangeEndTime={handleChangeEndTime}
            deletePlanTask={deletePlanTask}
            deleteActualTask={deleteActualTask}
            setIdTaskEditSelected={setIdTaskEditSelected}
            handleStartStopTask={handleStartStopTask}
            deadline={event.event?.extendedProps.deadline}
            isImportant={event.event?.extendedProps.isImportant}
            setIsHovering={(show: boolean) => {
              setIsHovering(show);
            }}
            statusId={
              resourcePlan
                ? event.event?.extendedProps.statusId ||
                  event.event?.extendedProps.status.id
                : 0
            }
            taskId={event.event?.extendedProps.taskId}
            scheduleId={event.event?.extendedProps.scheduleId}
          />
        )}
      </div>
    );
  };

  const [isSmallItem, setIsSmallItem] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.offsetHeight;
      if (height > 40) {
        setIsSmallItem(false);
      } else {
        setIsSmallItem(true);
      }
    }
  }, [isOptionZoomSchedule, slotHeight, event]);
  useEffect(() => {
    if (isShiftPressed) {
      setIsHovering(false);
    }
  }, [isShiftPressed]);

  const [isTooSmall, setIsTooSmall] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setIsTooSmall(width < 50);
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <>
      <div
        style={{
          paddingTop: `${(slotHeight / baseHeight) * 7}px`,
          paddingBottom: `${(slotHeight / baseHeight) * 8}px`,
          borderLeftColor: resourcePlan ? largeColor : '',
          backgroundColor: resourcePlan
            ? 'white'
            : largeColor
              ? largeColor
              : '#A7B9C2',
        }}
        ref={containerRef}
        onMouseEnter={(e) => {
          if (isSmallItem) {
            if (isShiftPressed) return;
            if (isInteracting) return;
            handleMouseEnter(e);
            const fcEvent = containerRef.current?.closest(
              '.fc-event',
            ) as HTMLElement;
            const resizer = fcEvent?.querySelector(
              '.fc-event-resizer-end',
            ) as HTMLElement;
            if (resizer) {
              resizer.style.setProperty('opacity', '0', 'important');
            }
          }
        }}
        onMouseLeave={() => {
          if (isSmallItem) {
            handleMouseLeave();
            const fcEvent = containerRef.current?.closest(
              '.fc-event',
            ) as HTMLElement;
            const resizer = fcEvent?.querySelector(
              '.fc-event-resizer-end',
            ) as HTMLElement;
            if (resizer) {
              resizer.style.setProperty('opacity', '1', 'important');
            }
          }
        }}
        className={`h-full event-bottom  ${isSelect && '!opacity-30'} ${largeColor && resourcePlan && 'border border-l-2'} flex relative z-30  bg-white card-schedule item-schedule-shadow ${isCalculation && '!bg-custom-gradient'} ${!resourcePlan && ' !text-white'} ${isEvent && '!text-[#0068B6]'}    text-black rounded-md   justify-between   px-2 border`}>
        <div className="flex w-full relative  h-full justify-between ">
          <div
            onMouseEnter={(e) => {
              if (isShiftPressed) return;
              if (isInteracting) return;
              handleMouseEnter(e);
              const fcEvent = containerRef.current?.closest(
                '.fc-event',
              ) as HTMLElement;
              const resizer = fcEvent?.querySelector(
                '.fc-event-resizer-end',
              ) as HTMLElement;
              if (resizer) {
                resizer.style.setProperty('opacity', '0', 'important');
              }
            }}
            onMouseLeave={() => {
              handleMouseLeave();
              const fcEvent = containerRef.current?.closest(
                '.fc-event',
              ) as HTMLElement;
              const resizer = fcEvent?.querySelector(
                '.fc-event-resizer-end',
              ) as HTMLElement;
              if (resizer) {
                resizer.style.setProperty('opacity', '1', 'important');
              }
            }}
            className={`group  bg-transparent z-[20] w-full ${resourcePlan ? 'h-[calc(100%_-_27px)]' : 'h-[calc(100%_-_10px)]'} ${isSmallItem && '!h-full overflow-hidden'}`}>
            <div className="flex overflow-hidden flex-col gap-1 w-[95%]">
              <p
                style={{
                  width: event.event?.extendedProps.isAllDay
                    ? view === ViewOptions.WEEK
                      ? '100%'
                      : '100px'
                    : '100%',
                  paddingRight: event.event?.extendedProps.isAllDay
                    ? view === ViewOptions.WEEK
                      ? '44px'
                      : '0'
                    : '0',
                }}
                className="font-bold min-h-[20px] text-sm truncate block w-full  ">
                {event?.event instanceof Error
                  ? ''
                  : event?.event?.title
                    ? event.event.title
                    : NO_SETTING}
              </p>
              <div className="text-[11px] flex gap-2">
                <p
                  style={{
                    width: resourcePlan ? '100%' : 'fit-content',
                  }}
                  className=" h-full w-fit">
                  {!isCalculation ? (
                    event.timeText && isEvent ? (
                      <p className="w-[80%] break-all">
                        {event.event?.extendedProps &&
                          convertToTimeString(
                            event.event?.extendedProps.planStartDate,
                          )}
                        ~
                        {event.event?.extendedProps &&
                          convertToTimeString(
                            event.event?.extendedProps.planEndDate,
                          )}{' '}
                      </p>
                    ) : (
                      event.timeText &&
                      differentTime &&
                      event.timeText.replace(' - ', ' ~')
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
          </div>
          {resourcePlan && (
            <>
              {isEvent && (
                <ImageRound
                  src={`/icons/lock.svg`}
                  name="icon lock"
                  style={{
                    bottom: `${(slotHeight / baseHeight) * 13}px`,
                  }}
                  className={`absolute w-3 h-3 bottom-1 right-9 ${isTooSmall && 'hidden'}`}
                />
              )}
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
                className="absolute   w-[20px] h-[20px] bottom-2 z-[30] right-2  hover:cursor-pointer"
                onClick={handleStartStopTask}
              />
            </>
          )}
        </div>
      </div>
      {isHovering &&
        !isInteracting &&
        createPortal(renderModal(), document.body)}

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
    </>
  );
};

export default TaskCard;
