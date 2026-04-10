'use client';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from 'react-query';
import { EventContentArg } from '@fullcalendar/core/index.js';

import ImageRound from '@components/common/ImageRound';
import WarningStartTaskModal from '@components/modals/WarningStartTaskModal';
import PopupDetail from './PopupDetail';
import PopupDetailEvent from './PopupDetailEvent';

import { NO_SETTING } from '@constants';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { ItemScheduleType, ItemStartType, ViewOptions } from '@constants/enums';

import { useErrorToast } from '@hooks/useErrorToast';
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
import { generateVerticalGradient } from '@utils';
import { TaskTimeSchedule } from '@interfaces/task';
import { EventEditFormData } from '@interfaces/calendar';
import { CreationDataCommon } from '@interfaces/common';
import { AxiosError } from 'axios';

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
    setIsInteracting,
    idTaskStarting,
    taskSelectedToStart,
    scheduleCardPopupOwnerKey,
    setScheduleCardPopupOwnerKey,
    setIdTaskEditSelected,
    setDataRunning,
    setDataClickTask,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setTaskSelectedAction,
    setTaskSelected,
    setDataActualAddSchedule,
  } = useContext(TaskContext);
  const showErrorToast = useErrorToast();

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
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_COMMON_MESSAGE);
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

  const [isShowAction, setIsShowAction] = useState(false);

  const [local, setLocal] = useState({
    clientX: 0,
    clientY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const [isHovering, setIsHovering] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerOverCardRef = useRef(false);
  const pointerOverPopupRef = useRef(false);
  const lastPointerClientRef = useRef({ x: 0, y: 0 });
  const isInteractingRef = useRef(isInteracting);
  isInteractingRef.current = isInteracting;

  const hoverOwnerKey = useMemo(() => {
    const id = String(event.event.id ?? '');
    const start =
      typeof event.event.startStr === 'string'
        ? event.event.startStr
        : event.event.start != null
          ? String(event.event.start)
          : '';
    const lane = resourcePlan ? 'plan' : 'actual';
    return `${id}\u0001${start}\u0001${lane}`;
  }, [event.event.id, event.event.start, event.event.startStr, resourcePlan]);

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

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearScheduledHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const closeScheduleHoverPopup = useCallback(() => {
    pointerOverCardRef.current = false;
    pointerOverPopupRef.current = false;
    clearScheduledHide();
    setIsHovering(false);
    setIsShowAction(false);
    setScheduleCardPopupOwnerKey((prev) =>
      prev === hoverOwnerKey ? null : prev,
    );
  }, [hoverOwnerKey, setScheduleCardPopupOwnerKey]);

  const closeScheduleHoverPopupRef = useRef(closeScheduleHoverPopup);
  closeScheduleHoverPopupRef.current = closeScheduleHoverPopup;

  const isHoveringRef = useRef(isHovering);
  isHoveringRef.current = isHovering;

  const clearPendingShow = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const queueShowPopup = useCallback(
    (e: {
      clientX: number;
      clientY: number;
      currentTarget: EventTarget | null;
      buttons?: number;
    }) => {
      if (isShiftPressed) return;
      const isDraggingPointer =
        typeof e.buttons === 'number' && e.buttons !== 0;
      if (isInteractingRef.current && isDraggingPointer) return;
      if (isInteractingRef.current && !isDraggingPointer) {
        setIsInteracting(false);
      }
      pointerOverCardRef.current = true;
      clearScheduledHide();
      clearPendingShow();
      const delay = getDelay();
      showTimeoutRef.current = setTimeout(() => {
        showTimeoutRef.current = null;
        const viewportHeight = window.innerHeight;
        const cursorY = e.clientY;
        const isNearBottom = viewportHeight - cursorY < 150;
        const nextTop = isNearBottom ? e.clientY - 150 : e.clientY;
        const host =
          (containerRef.current?.closest(
            '.fc-timegrid-event, .fc-event, .fc-timeline-event',
          ) as HTMLElement | null) ?? (e.currentTarget as HTMLElement | null);
        const nextLeft = host ? computePopupLeftByEvent(host) : e.clientX - 100;
        lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
        setLocal({ clientX: nextLeft, clientY: nextTop });
        setIsHovering(true);
        setScheduleCardPopupOwnerKey(hoverOwnerKey);
        recordHover();
      }, delay);
    },
    [
      clearPendingShow,
      getDelay,
      hoverOwnerKey,
      isShiftPressed,
      recordHover,
      setIsInteracting,
      setScheduleCardPopupOwnerKey,
    ],
  );

  const scheduleHideIfPointerLeft = () => {
    clearScheduledHide();
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
      if (!pointerOverCardRef.current && !pointerOverPopupRef.current) {
        closeScheduleHoverPopup();
      }
    }, 500);
  };

  const pointerStillInsideCard = (relatedTarget: EventTarget | null) =>
    relatedTarget instanceof Node &&
    Boolean(containerRef.current?.contains(relatedTarget));

  const pointerStillInsidePopup = (relatedTarget: EventTarget | null) =>
    relatedTarget instanceof Node &&
    Boolean(popupRef.current?.contains(relatedTarget));

  useEffect(() => {
    if (!isHovering) return;
    if (
      scheduleCardPopupOwnerKey != null &&
      scheduleCardPopupOwnerKey !== hoverOwnerKey
    ) {
      closeScheduleHoverPopup();
    }
  }, [
    scheduleCardPopupOwnerKey,
    hoverOwnerKey,
    isHovering,
    closeScheduleHoverPopup,
  ]);

  useEffect(() => {
    if (!isHovering) return;
    const track = (e: PointerEvent) => {
      lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', track, { passive: true });
    return () => window.removeEventListener('pointermove', track);
  }, [isHovering]);

  useEffect(() => {
    const onViewportChange = () => {
      if (!isHoveringRef.current) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!isHoveringRef.current) return;
          const { x, y } = lastPointerClientRef.current;
          const w = window.innerWidth;
          const h = window.innerHeight;
          if (x < 0 || y < 0 || x > w || y > h) {
            closeScheduleHoverPopupRef.current();
            return;
          }
          const el = document.elementFromPoint(x, y);
          const card = containerRef.current;
          const popup = popupRef.current;
          const hit =
            !!el &&
            ((!!card && (card === el || card.contains(el))) ||
              (!!popup && (popup === el || popup.contains(el))));
          if (!hit) {
            closeScheduleHoverPopupRef.current();
          }
        });
      });
    };
    window.addEventListener('resize', onViewportChange);
    document.addEventListener('fullscreenchange', onViewportChange);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      document.removeEventListener('fullscreenchange', onViewportChange);
    };
  }, []);

  useEffect(() => {
    if (isModalShow) {
      setTimeout(() => {
        clearPendingShow();
        closeScheduleHoverPopup();
      }, 500);
    }
  }, [isModalShow, clearPendingShow, closeScheduleHoverPopup]);

  useEffect(() => {
    if (!isInteracting) return;
    clearPendingShow();
    closeScheduleHoverPopup();
  }, [isInteracting, clearPendingShow, closeScheduleHoverPopup]);

  useEffect(() => {
    if (isInteracting || isShiftPressed || isHovering) return;
    const card = containerRef.current;
    if (!card || !card.matches(':hover')) return;
    const { x, y } = lastPointerClientRef.current;
    if (x <= 0 && y <= 0) return;
    queueShowPopup({
      clientX: x,
      clientY: y,
      currentTarget: card,
    });
  }, [isInteracting, isShiftPressed, isHovering, queueShowPopup]);

  useEffect(() => () => clearPendingShow(), [clearPendingShow]);

  const renderModal = () => {
    if (isShiftPressed) return;

    return (
      <div
        className={`w-[250px]    fixed top-0 left-0 z-[999]  h-fit rounded-[14px] pl-5 pr-[10px] pt-[10px] pb-5 bg-white`}
        ref={popupRef}
        onMouseLeave={(e) => {
          if (pointerStillInsidePopup(e.relatedTarget)) return;
          pointerOverPopupRef.current = false;
          scheduleHideIfPointerLeft();
        }}
        onMouseEnter={() => {
          pointerOverPopupRef.current = true;
          clearScheduledHide();
          setScheduleCardPopupOwnerKey(hoverOwnerKey);
          setIsHovering(true);
        }}
        style={{
          top: local.clientY,
          left:
            view === ViewOptions.WEEK ? local.clientX - 10 : local.clientX - 15,
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
              address: event.event?.extendedProps?.location,
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
            onDelete={(values: EventEditFormData) => {
              closeScheduleHoverPopup();
              onDeleteEvent && onDeleteEvent(values);
            }}
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
              if (!show) {
                closeScheduleHoverPopup();
              } else {
                pointerOverPopupRef.current = true;
                clearScheduledHide();
                setScheduleCardPopupOwnerKey(hoverOwnerKey);
                setIsHovering(true);
              }
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
      closeScheduleHoverPopup();
    }
  }, [isShiftPressed, closeScheduleHoverPopup]);

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

  const [isTooSmallHeight, setIsTooSmallHeight] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.offsetHeight;
      if (height > 50) {
        setIsTooSmallHeight(false);
      } else {
        setIsTooSmallHeight(true);
      }
    }
  }, [isOptionZoomSchedule, slotHeight, event]);

  return (
    <>
      <div
        style={{
          paddingTop: resourcePlan
            ? `${isTooSmallHeight ? 5 : 12}px`
            : `${isTooSmallHeight ? 5 : 10}px`,
          paddingBottom: resourcePlan
            ? `${isTooSmallHeight ? 5 : 12}px`
            : `${isTooSmallHeight ? 5 : 10}px`,
          paddingLeft: resourcePlan ? '12px' : '10px',
          paddingRight: resourcePlan ? '12px' : '10px',
          background: resourcePlan
            ? 'white'
            : largeColor
              ? generateVerticalGradient(largeColor)
              : '#A7B9C2',
        }}
        ref={containerRef}
        onMouseEnter={(e) => {
          lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
          queueShowPopup(e);
          if (isSmallItem) {
            const fcEvent = containerRef.current?.closest(
              '.fc-event',
            ) as HTMLElement | null;
            const resizer = fcEvent?.querySelector(
              '.fc-event-resizer-end',
            ) as HTMLElement | null;
            if (resizer) {
              resizer.style.setProperty('opacity', '0', 'important');
            }
          }
        }}
        onMouseMove={(e) => {
          lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
          if (isHovering || showTimeoutRef.current) {
            return;
          }
          queueShowPopup(e);
        }}
        onMouseLeave={(e) => {
          clearPendingShow();
          if (!pointerStillInsideCard(e.relatedTarget)) {
            pointerOverCardRef.current = false;
            scheduleHideIfPointerLeft();
          }
          const fcEvent = containerRef.current?.closest(
            '.fc-event',
          ) as HTMLElement | null;
          const resizer = fcEvent?.querySelector(
            '.fc-event-resizer-end',
          ) as HTMLElement | null;
          if (resizer) {
            resizer.style.setProperty('opacity', '1', 'important');
          }
        }}
        className={`h-full event-bottom  ${isSelect && '!opacity-30'} ${isStart && resourcePlan && '!border !border-[#3CABF3]'} flex relative z-30  bg-white card-schedule item-schedule-shadow ${isCalculation && '!bg-custom-gradient'} ${!resourcePlan && ' !text-white'} ${isEvent && '!text-primary'}    text-black rounded-[14px]   justify-between  border`}>
        <div className="flex w-full relative  h-full justify-between ">
          <div
            onMouseEnter={(e) => {
              lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
              queueShowPopup(e);
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
            }}
            onMouseMove={(e) => {
              lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
              if (isHovering || showTimeoutRef.current) {
                return;
              }
              queueShowPopup(e);
            }}
            onMouseLeave={(e) => {
              clearPendingShow();
              if (!pointerStillInsideCard(e.relatedTarget)) {
                pointerOverCardRef.current = false;
                scheduleHideIfPointerLeft();
              }

              const fcEvent = containerRef.current?.closest(
                '.fc-event',
              ) as HTMLElement | null;
              const resizer = fcEvent?.querySelector(
                '.fc-event-resizer-end',
              ) as HTMLElement | null;
              if (resizer) {
                resizer.style.setProperty('opacity', '1', 'important');
              }
            }}
            className={`group  flex flex-col ${isTooSmallHeight && '!flex-row'} relative flex-shrink-0 items-end justify-between h-full bg-transparent z-[20] w-full ${resourcePlan ? 'h-[calc(100%_-_27px)]' : 'h-[calc(100%_-_10px)]'} ${isSmallItem && '!h-full overflow-hidden'}`}>
            <div
              className={`${isTooSmall && 'hidden'} w-full flex overflow-hidden h-full flex-col   flex-grow gap-[10px]`}>
              <div className="flex items-center gap-[6px] w-full">
                {!isEvent && resourcePlan == true && (
                  <div
                    style={{ backgroundColor: largeColor || '#BFBFBF' }}
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
                  className="font-bold  text-sm break-all truncate  w-full leading-[1.4]  ">
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
                  {!isEvent && resourcePlan && isShowSmallData && (
                    <div
                      style={{ backgroundColor: largeColor || '#BFBFBF' }}
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
                      className="font-bold  text-sm break-all truncate min-h-5  w-full   ">
                      {event?.event instanceof Error
                        ? ''
                        : event?.event?.title || event?.event?.title != ''
                          ? event.event.title
                          : NO_SETTING}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div
              className={`h-fit ${isTooSmallHeight ? '!w-fit flex flex-shrink-0' : 'flex-shrink-0'} absolute bottom-0 right-0 w-full flex gap-[6px] items-end justify-end  `}>
              {resourcePlan == true && (
                <>
                  {isEvent && (
                    <ImageRound
                      src={`/icons/lock.svg`}
                      name="icon lock"
                      className={` w-3 h-3 relative   top-0 icon-circle `}
                    />
                  )}
                  <div
                    className={`w-fit h-fit ${isTooSmallHeight && 'flex-shrink-0 !w-[34px] !top-0'}  ${isTooSmall && 'flex-shrink-0'} flex items-center justify-center relative top-[5px] right-[-4px]`}>
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
