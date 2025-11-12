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
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import {
  compareWithCurrentDate,
  convertToTimeString,
  getMinuteDifference,
  isMoreThanFifteenMinutes,
  isMoreThanThirtyMinutes,
} from '@utils/date';
import { TaskTimeSchedule } from '@interfaces/task';
import { EventEditFormData } from '@interfaces/calendar';
import { generateVerticalGradient } from '@utils';
import { CreationDataCommon } from '@interfaces/common';

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
  creationDataCommonData: CreationDataCommon | undefined;
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
    isCalculation?: boolean,
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
  creationDataCommonData,
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
  const { getDelay, recordHover } = useContext(GlobalStateContext);

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
  let extendedPropsData = {
    isAllDay: false,
    planStartDate: '',
    planEndDate: '',
  };

  try {
    const extendedProps = event?.event?.extendedProps;
    isStart = extendedProps?.isStart ?? false;
    isEvent = extendedProps?.type === ItemStartType.SCHEDULE;
    isCalculation = extendedProps?.isCalculation ?? false;
    largeColor = extendedProps.largeColor;
    extendedPropsData = {
      isAllDay: extendedProps.isAllDay,
      planStartDate: extendedProps.planStartDate,
      planEndDate: extendedProps.planEndDate,
    };
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
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const POPUP_WIDTH = 250; //  w-[250px]
  const GAP = 10;

  function computePopupLeftByEvent(host: HTMLElement) {
    const rect = host.getBoundingClientRect();
    const vw = window.innerWidth;

    // Priority to display on the right side of the event
    const rightSide = rect.right + GAP;
    const leftSide = rect.left - POPUP_WIDTH - GAP;

    // If the right edge overflows, move it to the left; otherwise, use the right side.
    if (rightSide + POPUP_WIDTH > vw) {
      // block from exceeding the left edge
      return Math.max(GAP, leftSide);
    }
    // block from exceeding the right edge
    return Math.min(rightSide, vw - POPUP_WIDTH - GAP);
  }

  const handleMouseEnter = (e: any) => {
    const viewportHeight = window.innerHeight;
    const cursorY = e.clientY;
    const isNearBottom = viewportHeight - cursorY < 150;
    const nextTop = isNearBottom ? e.clientY - 150 : e.clientY;
    // --- ONLY CALCULATE LEFT BY EVENT ---
    // Get the host event FullCalendar (sure to get many views)
    const host =
      (containerRef.current?.closest(
        '.fc-timegrid-event, .fc-event, .fc-timeline-event',
      ) as HTMLElement | null) ?? (e.currentTarget as HTMLElement | null);

    // If event is found → track event; if not → fallback to mouse (same as before)
    const nextLeft = host ? computePopupLeftByEvent(host) : e.clientX - 100;

    // Update state: only change left according to event, top remains the same according to old logic
    setLocal({ clientX: nextLeft, clientY: nextTop });
    setIsHovering(true);
  };
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseLeave = () => {
    // If there is an old timeout → clear it
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Set new timeout, but only hide if no hover event or popup
    hideTimeoutRef.current = setTimeout(() => {
      const isOverPopup = popupRef.current?.matches(':hover');
      const isOverEvent = containerRef.current?.matches(':hover');
      if (!isOverPopup && !isOverEvent) {
        setIsHovering(false);
        setIsShowAction(false);
      }
    }, 1100);
  };
  useEffect(() => {
    if (isModalShow) {
      setTimeout(() => {
        setIsHovering(false);
      }, 1000);
    }
  }, [isModalShow]);

  const renderModal = () => {
    if (isShiftPressed) return;
    return (
      <div
        className={`w-[250px]    fixed top-0 left-0 z-[999]  h-fit rounded-[14px] pl-5 pr-[10px] pt-[10px] pb-5 bg-white`}
        ref={popupRef}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHovering(true)}
        style={{
          top: local.clientY,
          left:
            view === ViewOptions.WEEK ? local.clientX - 30 : local.clientX - 15,
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
            creationDataCommonData={creationDataCommonData}
            onDelete={onDeleteEvent}
          />
        ) : (
          <PopupDetail
            title={event?.event?.title}
            isCalculation={isCalculation}
            largeColor={largeColor}
            resourcePlan={resourcePlan}
            isShowAction={isShowAction}
            startEditable={event.event?.startEditable}
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
  const [isShowSmallData, setIsShowSmallData] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      if (width > 70) {
        setIsTooSmall(false);
      } else {
        if (width < 40) {
          setIsShowSmallData(false);
        } else {
          setIsShowSmallData(true);
        }
        setIsTooSmall(true);
      }
    }
  }, [isOptionZoomSchedule, slotHeight, event]);

  return (
    <>
      <div
        style={{
          paddingTop: `${Math.min((slotHeight / baseHeight) * 7, 8)}px`,
          paddingBottom: `${Math.min((slotHeight / baseHeight) * 8, 8)}px`,
          background: resourcePlan
            ? 'white'
            : largeColor
              ? generateVerticalGradient(largeColor)
              : '#A7B9C2',
        }}
        ref={containerRef}
        onMouseEnter={(e) => {
          if (isSmallItem) {
            if (isShiftPressed || isInteracting) return;
            const delay = getDelay();

            const fcEvent = containerRef.current?.closest(
              '.fc-event',
            ) as HTMLElement | null;
            const resizer = fcEvent?.querySelector(
              '.fc-event-resizer-end',
            ) as HTMLElement | null;
            if (resizer) {
              resizer.style.setProperty('opacity', '0', 'important');
            }
            timeoutId.current = setTimeout(() => {
              handleMouseEnter(e);
              recordHover();
            }, delay);
          }
        }}
        onMouseLeave={() => {
          if (timeoutId.current) clearTimeout(timeoutId.current);
          const fcEvent = containerRef.current?.closest(
            '.fc-event',
          ) as HTMLElement | null;
          const resizer = fcEvent?.querySelector(
            '.fc-event-resizer-end',
          ) as HTMLElement | null;
          if (resizer) {
            resizer.style.setProperty('opacity', '1', 'important');
          }
          handleMouseLeave();
        }}
        className={`h-full event-bottom  ${isSelect && '!opacity-30'} ${isStart && resourcePlan && '!border !border-[#3CABF3]'} flex relative z-30  bg-white card-schedule item-schedule-shadow ${isCalculation && '!bg-custom-gradient'} ${!resourcePlan && ' !text-white'} ${isEvent && '!text-primary'}    text-black rounded-[14px]   justify-between   px-2 border`}>
        <div className="flex w-full relative  h-full justify-between ">
          <div
            onMouseEnter={(e) => {
              if (isShiftPressed || isInteracting) return;
              const fcEvent = containerRef.current?.closest(
                '.fc-event',
              ) as HTMLElement | null;
              const resizer = fcEvent?.querySelector(
                '.fc-event-resizer-end',
              ) as HTMLElement | null;
              if (resizer) {
                resizer.style.setProperty('opacity', '0', 'important');
              }
              const delay = getDelay();

              timeoutId.current = setTimeout(() => {
                handleMouseEnter(e);

                recordHover();
              }, delay);
            }}
            onMouseLeave={() => {
              if (timeoutId.current) clearTimeout(timeoutId.current);

              const fcEvent = containerRef.current?.closest(
                '.fc-event',
              ) as HTMLElement | null;
              const resizer = fcEvent?.querySelector(
                '.fc-event-resizer-end',
              ) as HTMLElement | null;
              if (resizer) {
                resizer.style.setProperty('opacity', '1', 'important');
              }
              handleMouseLeave();
            }}
            className={`group  flex items-end ${isTooSmall && 'flex-col justify-between'} h-full bg-transparent z-[20] w-full ${resourcePlan ? 'h-[calc(100%_-_27px)]' : 'h-[calc(100%_-_10px)]'} ${isSmallItem && '!h-full overflow-hidden'}`}>
            <div
              className={`${isTooSmall && 'hidden'} flex overflow-hidden h-full flex-col   flex-grow gap-[10px]`}>
              <div className="flex items-center gap-[6px] w-full">
                {!isEvent && resourcePlan == true && largeColor && (
                  <div
                    style={{ backgroundColor: largeColor || 'white' }}
                    className="w-2 h-2 rounded-full  flex-shrink-0"></div>
                )}
                <p
                  style={{
                    width: extendedPropsData.isAllDay
                      ? view === ViewOptions.WEEK
                        ? '100%'
                        : '100px'
                      : '100%',
                    paddingRight: extendedPropsData.isAllDay
                      ? view === ViewOptions.WEEK
                        ? '44px'
                        : '0'
                      : '0',
                  }}
                  className="font-bold  text-sm break-all truncate  w-full   ">
                  {event?.event instanceof Error
                    ? ''
                    : event?.event?.title || event?.event?.title != ''
                      ? event.event.title
                      : NO_SETTING}
                </p>
              </div>
              <div className="text-[11px] flex gap-2">
                <p
                  style={{
                    width: resourcePlan ? '100%' : 'fit-content',
                  }}
                  className=" h-full w-fit">
                  {!isCalculation ? (
                    event.timeText && isEvent ? (
                      <p className="w-[80%] break-all">
                        {extendedPropsData &&
                          convertToTimeString(extendedPropsData.planStartDate)}
                        ~
                        {extendedPropsData &&
                          convertToTimeString(
                            extendedPropsData.planEndDate,
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
                  <p className="break-all">
                    {getMinuteDifference(event.timeText)}分
                  </p>
                )}
              </div>
            </div>
            {isTooSmall && (
              <div className="w-full">
                <div className="flex items-center gap-[6px] w-full">
                  {!isEvent &&
                    resourcePlan &&
                    isShowSmallData &&
                    largeColor && (
                      <div
                        style={{ backgroundColor: largeColor || 'white' }}
                        className="w-2 h-2 rounded-full flex-shrink-0"></div>
                    )}
                  {!isShowSmallData ? (
                    <p>...</p>
                  ) : (
                    <p
                      style={{
                        width: extendedPropsData.isAllDay
                          ? view === ViewOptions.WEEK
                            ? '100%'
                            : '100px'
                          : '100%',
                        paddingRight: extendedPropsData.isAllDay
                          ? view === ViewOptions.WEEK
                            ? '44px'
                            : '0'
                          : '0',
                      }}
                      className="font-bold  text-sm break-all truncate  w-full   ">
                      {event?.event instanceof Error
                        ? ''
                        : event?.event?.title || event?.event?.title != ''
                          ? event.event.title
                          : NO_SETTING}
                    </p>
                  )}
                </div>
                {/* TODO: UPDATE UI if item too small */}
                {/* <div className="text-[11px] flex gap-2">
                  <p
                    style={{
                      width: resourcePlan ? '100%' : 'fit-content',
                    }}
                    className=" h-full w-fit">
                    {!isCalculation ? (
                      event.timeText && isEvent ? (
                        <p className="w-[80%] break-all">
                          {extendedPropsData &&
                            convertToTimeString(
                              extendedPropsData.planStartDate,
                            )}
                          ~
                          {extendedPropsData &&
                            convertToTimeString(
                              extendedPropsData.planEndDate,
                            )}{' '}
                        </p>
                      ) : (
                        event.timeText &&
                        differentTime &&
                        event.timeText.replace(' - ', ' ~')
                      )
                    ) : (
                      <>
                        {convertToTimeString(`${event.event.start}`)} ~ 計測中
                      </>
                    )}
                  </p>
                  {!resourcePlan && !isCalculation && (
                    <p className="break-all">
                      {getMinuteDifference(event.timeText)}分
                    </p>
                  )}
                </div> */}
              </div>
            )}

            <div className="h-fit flex gap-[6px] items-end w-fit flex-shrink-0">
              {resourcePlan == true && (
                <>
                  {isEvent && (
                    <ImageRound
                      src={`/icons/lock.svg`}
                      name="icon lock"
                      className={` w-3 h-3 relative   top-[-5px] icon-circle `}
                    />
                  )}
                  <div
                    className={`w-[30px] h-[30px] flex items-center justify-center relative top-[5px] right-[-5px]`}>
                    <ImageRound
                      src={`/icons/${isStart ? 'pause-task' : 'play-task'}.svg`}
                      name="Start task"
                      hidden={
                        !isMoreThanFifteenMinutes(
                          `${event.event.start}`,
                          `${event.event.end}`,
                        ) && isOptionZoomSchedule === '01:00:00'
                      }
                      className={`!w-fit  !h-fit  z-[30] icon-circle   hover:cursor-pointer`}
                      onClick={handleStartStopTask}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
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
