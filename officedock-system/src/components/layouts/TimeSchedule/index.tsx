'use client';
import {
  ChangeEvent,
  Dispatch,
  memo,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import moment from 'moment';
import { useMutation, useQueryClient } from 'react-query';
import { v4 as uuidv4 } from 'uuid';
import { debounce, throttle } from 'lodash';

import {
  format,
  addDays,
  isSameDay,
  parseISO,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  getHours,
  getMinutes,
  subSeconds,
  addMilliseconds,
} from 'date-fns';
import interactionPlugin, {
  EventDragStopArg,
  EventReceiveArg,
  EventResizeDoneArg,
  ThirdPartyDraggable,
} from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourcePlugin from '@fullcalendar/resource';
import jaLocale from '@fullcalendar/core/locales/ja';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import scrollGridPlugin from '@fullcalendar/scrollgrid';
import { EventImpl } from '@fullcalendar/core/internal';

import {
  DateSpanApi,
  EventApi,
  EventContentArg,
  EventDropArg,
} from '@fullcalendar/core/index.js';
import { AxiosError } from 'axios';

import { ja } from 'date-fns/locale';

import Heading from '@components/common/Heading';
import ImageRound from '@components/common/ImageRound';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import DatePicker from '@components/common/DatePicker';
import ScheduleDaySkeleton from '@components/skeleton/ScheduleDaySkeleton';
import RangeSlider from '@components/common/RangeSlider';
import DetailPlanItemModal from '@components/modals/DetailPlanItemModal';
import DetailEventPlanModal from '@components/modals/DetailEventPlanModal';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import TaskCard from './TaskCard';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { TaskContext } from '@providers/TaskProvider';

import {
  DATE_SCHEDULE_FORMAT,
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  NO_OPTION_CATEGORY,
} from '@constants';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ActionsEvent,
  CalendarViewOptions,
  EventCalendarType,
  EventWorkCategory,
  ItemScheduleTitleType,
  ItemScheduleType,
  ItemStartType,
  PermissionsSystem,
  ScreenName,
  ServerStatusCode,
  ViewOptions,
} from '@constants/enums';
import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_NOT_FOUND_EVENT,
  ERROR_SAVE_ZOOM,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import { useErrorToast } from '@hooks/useErrorToast';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

import api from '@base/api';
import {
  DataDetailEventType,
  DataDetailTaskType,
  Task,
  TaskActualType,
  TaskRequest,
  TaskTimeSchedule,
} from '@interfaces/task';
import {
  EventCalendarProps,
  EventEditFormData,
  EventParticipant,
  EventRequest,
} from '@interfaces/calendar';
import { OptionDropdownType } from '@interfaces/common';
import {
  addTimeDifference,
  addTimeToDate,
  adjustEndDate,
  areDatesDifferent,
  combineDateAndTime,
  convertDateString,
  convertToCurrentTimezone,
  convertToMinutesNumber,
  formatQueryEndDateForCalendar,
  formatQueryStartDateForCalendar,
  formatTimeInput,
  getDateInfo,
  getNext30MinuteSlot,
  isDateInFutureOrToday,
  isDateLessThanToday,
  isMidnight,
  isTodaySchedule,
  splitMultiDayEventsArray,
} from '@utils/date';

import './styles/schedule.css';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import {
  adjustPositionForViewportSchedule,
  hasPermissionInArray,
} from '@utils';

const formatDateJp = (date: Date) => {
  return format(date, DATE_SCHEDULE_FORMAT, {
    locale: ja,
  });
};

interface TypeDateTimeSchedule {
  dataItemUpdateSchedule: Task | undefined;
  dataItemChangeInline: Task | undefined;
  dataItemAddSchedule: Task | undefined;
  idTaskDelete?: number;
  exEvents: MutableRefObject<HTMLDivElement | null>;
  setDataItemChangeInline: Dispatch<SetStateAction<Task | undefined>>;
  handleUpdateItemStart: (data: {
    id: string;
    isStart: boolean;
    type: string;
  }) => void;
  setFrequentlyTasks: Dispatch<SetStateAction<Task[]>>;
  setIdTaskDelete: Dispatch<SetStateAction<string>>;
  setDataItemResizeSchedule: Dispatch<SetStateAction<TaskRequest | undefined>>;
  updateTaskDates: ({
    taskId,
    newStartDate,
    newEndDate,
  }: {
    taskId: number;
    newStartDate: string;
    newEndDate: string;
  }) => void;
  handleEditShowClockItem: (taskId: number, isToday?: boolean) => void;
}

const TimeSchedule = memo(
  ({
    exEvents,
    idTaskDelete,
    dataItemAddSchedule,
    dataItemUpdateSchedule,
    dataItemChangeInline,
    setDataItemChangeInline,
    updateTaskDates,
    setFrequentlyTasks,
    setIdTaskDelete,
    handleUpdateItemStart,
    handleEditShowClockItem,
  }: TypeDateTimeSchedule) => {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const calendarRef = useRef<FullCalendar | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);

    const {
      memberSelected,
      dataActualAddSchedule,
      displayHederDateStart,
      displayHederDateEnd,
      setIsInteracting,
      setDisplayHeaderDayStart,
      setDisplayHeaderDayEnd,
      setDataEventEdit,
      setIdEventDelete,
      setWidthCalendar,
    } = useContext(TaskContext);

    const queryClient = useQueryClient();
    const showErrorToast = useErrorToast();

    const { setIsLoading } = useContext(LoadingContext);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

    const { isExtendCalendar, setIsExtendCalendar } =
      useContext(GlobalStateContext);
    const resizableElementRef = useRef<HTMLDivElement>(null);
    const [taskTimeScheduleList, setTaskTimeScheduleList] = useState<
      TaskTimeSchedule[]
    >([]);
    const today = new Date();

    const [isStartPopupDetail, setIsStartPopupDetail] = useState(false);
    const [idBackToEvent, setIdBackToEvent] = useState<string>('');

    const [currentResources, setCurrentResources] = useState<
      {
        id: string;
        title: string;
      }[]
    >([
      { id: ItemScheduleType.ACTUAL, title: ItemScheduleTitleType.ACTUAL },
      { id: ItemScheduleType.PLANS, title: ItemScheduleTitleType.PLANS },
    ]);
    const [popoverInfo, setPopoverInfo] = useState<DataDetailTaskType | null>(
      null,
    );
    const [EventInfo, setEventInfo] = useState<DataDetailEventType | null>(
      null,
    );

    const router = useRouter();
    const searchParams = useSearchParams();

    const params = new URLSearchParams(searchParams);

    const idEvent = searchParams.get('event');

    const actionType = searchParams.get('action');

    const typeDetail = searchParams.get('type');
    const view = searchParams.get('type');

    const screenHeight = window.innerHeight;

    const baseHeight = Math.round(43 * (screenHeight / 890));
    const baseSlider = Math.round(43 * (screenHeight / 890));

    const [sliderValue, setSliderValue] = useState(baseSlider);
    const [slotHeight, setSlotHeight] = useState(baseHeight);
    const [resetTrigger, setResetTrigger] = useState(0);

    const baseFontSizeSm = 14;
    const baseFontSizeXs = 14;
    const [isOptionZoomSchedule, setIsOptionZoomSchedule] =
      useState('00:15:00');

    const calculateFontSizeTitle = () => {
      if (isOptionZoomSchedule === '00:05:00') {
        return (slotHeight / 20) * baseFontSizeSm;
      }
      if (isOptionZoomSchedule === '01:00:00') {
        return (slotHeight / 90) * baseFontSizeSm;
      }
      return (slotHeight / baseSlider) * baseFontSizeSm;
    };
    const calculateFontSizeContent = () => {
      if (isOptionZoomSchedule === '00:05:00') {
        return (slotHeight / 20) * baseFontSizeXs;
      }
      if (isOptionZoomSchedule === '01:00:00') {
        return (slotHeight / 90) * baseFontSizeXs;
      }

      return (slotHeight / baseSlider) * baseFontSizeXs;
    };
    const formattedCurrentDate = formatDateJp(new Date());
    const formattedStartDate = formatDateJp(displayHederDateStart);
    const formattedEndDate = formatDateJp(displayHederDateEnd);
    const isToday = isSameDay(new Date(), displayHederDateStart);

    // Event state
    const [dataEventEdit, setDataEventEditLocal] =
      useState<EventEditFormData>();
    const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
    const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
      useState(false);
    const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
      useState(false);
    const [openCreateEventModal, setOpenCreateEventModal] =
      useState<boolean>(false);
    const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
      useState<EventEditFormData>();
    const [backToEditing, setBackToEditing] = useState(false);

    // Style for rbc-current-time-indicator when extend or narrow (show week or day)

    const debouncedFunction = useCallback(
      debounce((func) => {
        func();
      }, 300),
      [],
    );

    const handlePreviousDay = () => {
      setIsLoadingSchedule(true);
      if (isExtendCalendar) {
        setIsScroll(true);
      }
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi?.prev();
        const startDateISOString = formatQueryStartDateForCalendar(
          calendarApi.view.activeStart,
        );
        const endDateISOString = formatQueryEndDateForCalendar(
          calendarApi.view.activeEnd,
        );
        setDisplayHeaderDayStart(new Date(startDateISOString));
        setDisplayHeaderDayEnd(new Date(endDateISOString));

        handleCallApiAllData(startDateISOString, endDateISOString);
        saveZoomSchedule({
          dateFilterScheduleFrom: startDateISOString,
        });
        scrollToNowIndicator();
      }
    };
    const handleNextDay = () => {
      setIsLoadingSchedule(true);
      if (isExtendCalendar) {
        setIsScroll(true);
      }

      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi?.next();
        const startDateISOString = formatQueryStartDateForCalendar(
          calendarApi.view.activeStart,
        );
        const endDateISOString = formatQueryEndDateForCalendar(
          calendarApi.view.activeEnd,
        );
        setDisplayHeaderDayStart(new Date(startDateISOString));
        setDisplayHeaderDayEnd(new Date(endDateISOString));

        handleCallApiAllData(startDateISOString, endDateISOString);
        saveZoomSchedule({
          dateFilterScheduleFrom: startDateISOString,
        });
        scrollToNowIndicator();
      }
    };
    const handleChooseDay = (date?: Date) => {
      if (date) {
        const newDate = new Date(date);
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          calendarApi.gotoDate(newDate);
          const startDateISOString = formatQueryStartDateForCalendar(
            calendarApi.view.activeStart,
          );
          const endDateISOString = formatQueryEndDateForCalendar(
            calendarApi.view.activeEnd,
          );
          setDisplayHeaderDayStart(new Date(startDateISOString));

          handleCallApiAllData(startDateISOString, endDateISOString);
          saveZoomSchedule({
            dateFilterScheduleFrom: startDateISOString,
          });
          scrollToNowIndicator();
        }
      }
    };
    const handleGetEventCalendarByUsers = async ({
      userId,
      startDate,
      endDate,
    }: {
      userId: string;
      startDate?: string;
      endDate?: string;
    }) => {
      setIsLoadingSchedule(true);
      const apiUrl = `${apiRouters.SCHEDULES}?${userId ? `&user_ids=${userId}` : ''}${startDate && `&start_date=${startDate}`}${endDate && `&end_date=${endDate}`}&current_screen=${ScreenName.MY_TASK}`;
      const { data } = await api.get<EventCalendarProps[]>(apiUrl);
      return data;
    };

    const { mutateAsync: getEventCalendarByUsers } = useMutation(
      'getEventCalendarByUsers',
      handleGetEventCalendarByUsers,
      {
        onSuccess: (data) => {
          if (data) {
            const splitMultiDayEvent = (event: TaskTimeSchedule) => {
              const startDate = parseISO(String(event.startDate));
              let endDate = parseISO(String(event.endDate));

              if (getHours(endDate) === 0 && getMinutes(endDate) === 0) {
                endDate = subSeconds(endDate, 1);
              }

              if (isSameDay(startDate, endDate)) {
                return [{ ...event }];
              }
              if (event.isAllDay) {
                return [{ ...event, uuid: uuidv4() }];
              }

              const days = eachDayOfInterval({
                start: startDate,
                end: endDate,
              });

              return days.map((day, index) => {
                const start = index === 0 ? startDate : startOfDay(day);
                const end = index === days.length - 1 ? endDate : endOfDay(day);

                return {
                  ...event,
                  start,
                  end,
                  id: `${event.id}-split-${index}`,
                  uuid: uuidv4(),
                };
              });
            };

            const eventsTimeSchedule = data
              .filter((event) => event.startDate && event.endDate)
              .flatMap((event) => {
                const startDate = parseISO(`${event.startDate}`);
                const endDate = parseISO(`${event.endDate}`);
                const adjustedEndDate =
                  isSameDay(startDate, endDate) || isMidnight(endDate)
                    ? endDate
                    : addDays(endDate, 1);
                const largeColor =
                  event.categories &&
                  event.categories.find(
                    (item) => item.type === EventWorkCategory.LARGE,
                  )?.color;

                const newEvent = {
                  ...event,
                  start: startDate,
                  // Fake show data allday
                  end: event.isAllDay
                    ? new Date(
                        new Date(String(event.endDate)).setHours(24, 0, 0, 0),
                      )
                    : adjustedEndDate,

                  id: `${event.id}event`,
                  peopleInCharge: [],
                  status: {
                    name: '',
                    id: null,
                  },
                  taskId: event.taskId as number,
                  scheduleId: parseInt(`${event.id}`),
                  uuid: uuidv4(),
                  planStartDate: `${event.startDate}`,
                  planEndDate: `${event.endDate}`,
                  isStart: event.isStart,
                  isMyTask: event.isMySchedule,
                  type: `${event.type}`,
                  taskSchedules: [],
                  startEditable: false,
                  resourceId: ItemScheduleType.PLANS,
                  largeColor: largeColor,
                  address: event.address,
                  isAllDay: event.isAllDay,
                  participants: event.participants,
                };

                return splitMultiDayEvent(newEvent);
              });

            setTaskTimeScheduleList((prevEvents) => {
              const updatedEvents = [...prevEvents];
              const myTasks = updatedEvents.filter(
                (event) => event.type == EventCalendarType.TASK,
              );

              return [...myTasks, ...eventsTimeSchedule];
            });
          }
        },
        onSettled: () => {},
      },
    );

    const handleGetTaskCalendarByUsers = async ({
      userId,
      startDate,
      endDate,
    }: {
      userId: string;
      startDate?: string;
      endDate?: string;
    }) => {
      setIsLoadingSchedule(true);

      const apiUrl = `${apiRouters.TASK_CALENDAR_LIST}?${userId ? `&user_id=${userId}` : ''}${startDate && `&start_date=${startDate}`}${endDate && `&end_date=${endDate}`}`;
      const { data } = await api.get<Task[]>(apiUrl);
      return data;
    };

    const { mutateAsync: getMyTaskCalendar } = useMutation(
      'getMyTaskCalendar',
      handleGetTaskCalendarByUsers,
      {
        onSuccess: (data) => {
          if (data) {
            const tasksTimeSchedule = data
              .filter((task) => task.taskSchedules && task.taskSchedules.length)
              .flatMap((item) =>
                item.taskSchedules.map((taskSchedule) => {
                  const startDate = parseISO(`${taskSchedule.planStartDate}`);
                  const endDate = parseISO(`${taskSchedule.planEndDate}`);
                  const adjustedEndDate =
                    isSameDay(startDate, endDate) || isMidnight(endDate)
                      ? endDate
                      : addDays(endDate, 1);
                  const largeColor =
                    item.categories &&
                    item.categories.find(
                      (item) => item.type === EventWorkCategory.LARGE,
                    )?.color;
                  return {
                    id: `${taskSchedule.id}`,
                    uuid: taskSchedule.uuid,
                    taskId: item.id,
                    title: item.title ? item.title : '',
                    start: startDate,
                    isStart: item.isStart,
                    type: item.type,
                    planStartDate: taskSchedule.planStartDate,
                    planEndDate: taskSchedule.planEndDate as string,
                    end: adjustedEndDate,
                    startEditable: true,
                    largeColor: largeColor,
                    isImportant: item.isImportant,
                    deadline: item.deadline,
                    resourceId: ItemScheduleType.PLANS,
                    statusId: Number(item.status?.id),
                  };
                }),
              );

            setTaskTimeScheduleList((prevEvents) => {
              const updatedEvents = [...prevEvents];
              const mySchedule = updatedEvents.filter(
                (event) => event.type == EventCalendarType.SCHEDULE,
              );

              return [...mySchedule, ...tasksTimeSchedule];
            });
          }
        },
        onSettled: () => {},
      },
    );

    // Get data actual
    const handleGetTaskActualCalendar = async ({
      userId,
      startDate,
      endDate,
    }: {
      userId: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const apiUrl = `${apiRouters.TASK_DURATION}?${userId ? `&user_id=${userId}` : ''}${startDate && `&start_date=${startDate}`}${endDate && `&end_date=${endDate}`}`;
      const { data } = await api.get<TaskActualType[]>(apiUrl);
      return data;
    };

    const { mutateAsync: getMyTaskActualCalendar } = useMutation(
      'getMyTaskActualCalendar',
      handleGetTaskActualCalendar,
      {
        onSuccess: (data) => {
          if (data) {
            const tasksActualSchedule = data
              .filter((data) => data.planStartDate)
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
                const largeColor =
                  task.categories &&
                  task.categories.find(
                    (item) => item.type === EventWorkCategory.LARGE,
                  )?.color;
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
                    largeColor: largeColor,
                  };
                } else {
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
                    type: ItemStartType.SCHEDULE_ACTUAL,
                    scheduleId: task.scheduleId,
                    isMyTask: false,
                    isStart: false,
                    isCalculation: task.planEndDate ? false : true,
                    largeColor: largeColor,
                  };
                }
              });
            setTaskTimeScheduleList((prevEvents) => {
              const taskMap = new Map<string, TaskTimeSchedule>();

              prevEvents.forEach((event) => {
                taskMap.set(event.uuid || '', event);
              });
              tasksActualSchedule.forEach((task) => {
                taskMap.set(task.uuid || '', task);
              });

              return Array.from(taskMap.values());
            });
          }
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_COMMON_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
          setIsLoadingSchedule(false);
        },
      },
    );
    // Create new plan for task
    const handleCreatePlanTime = async (data: {
      taskId: string;
      uuid: string;
      planEndDate: string | null;
      planStartDate: string | null;
    }) => {
      return await api.post(apiRouters.TASK_SCHEDULE_UPDATE, data);
    };

    const { mutate: createPlanTime } = useMutation(
      'postCreatePlanTime',
      handleCreatePlanTime,
      {
        onSuccess: async () => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_CREATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );
    const handleCreateActualDuration = async (data: {
      uuid: string;
      taskId: number;
      startedAt: string;
      pausedAt: string;
    }) => {
      const { data: response } = await api.post(
        apiRouters.ACTUAL_DURATIONS_LIST,
        data,
      );
      return response;
    };
    // Handle delete plan task
    const handleDeletePlanTask = async (uuid: string) => {
      const { data: response } = await api.delete(
        apiRouters.TASK_PLAN_SCHEDULE_DETAIL(`${uuid}`),
      );
      return response;
    };

    const { mutate: deletePlanTask } = useMutation(
      'deletePlanTask',
      handleDeletePlanTask,
      {
        onSuccess: async () => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_DELETE_MESSAGE);
        },
        onSettled: () => {},
      },
    );

    // Handle delete Actual task
    const handleDeleteActualTask = async (uuid: string) => {
      const { data: response } = await api.delete(
        apiRouters.UPDATE_TASK_ACTUAL(uuid),
      );
      return response;
    };

    const { mutate: deleteActualTask } = useMutation(
      'deleteActualTask',
      handleDeleteActualTask,
      {
        onSuccess: async (data, variant) => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
          setTaskTimeScheduleList(
            taskTimeScheduleList.filter((item) => item.uuid !== variant),
          );
          setPopoverInfo(null);
          showToast({
            description: SUCCESS_DELETE_MESSAGE,
          });
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_DELETE_MESSAGE);
        },
        onSettled: () => {},
      },
    );

    // COPY plan for task
    const handleCopyPlanTime = async (uuid: string) => {
      return await api.get(apiRouters.TASK_SCHEDULE_COPY(`${uuid}`));
    };

    const { mutate: copyPlanTime } = useMutation(
      'postCopyPlanTime',
      handleCopyPlanTime,
      {
        onSuccess: async ({ data }) => {
          const startDate = parseISO(`${data.planStartDate}`);
          const endDate = parseISO(`${data.planEndDate}`);
          const adjustedEndDate =
            isSameDay(startDate, endDate) || isMidnight(endDate)
              ? endDate
              : addDays(endDate, 1);
          const largeColor =
            data.categories &&
            data.categories.find(
              (item: {
                name: string;
                type: string;
                id: number;
                color: string;
              }) => item.type === EventWorkCategory.LARGE,
            )?.color;

          setTaskTimeScheduleList([
            ...taskTimeScheduleList,
            {
              id: `${data.id}`,
              uuid: data.uuid,
              taskId: data.id,
              title: data.title ? data.title : '',
              start: startDate,
              isStart: data.isStart,
              type: data.type,
              planStartDate: data.planStartDate,
              planEndDate: data.planEndDate as string,
              end: adjustedEndDate,
              startEditable: true,
              largeColor: largeColor,
              isImportant: data.isImportant,
              deadline: data.deadline,
              resourceId: ItemScheduleType.PLANS,
            },
          ]);
          setPopoverInfo(null);
          showToast({
            description: SUCCESS_CREATE_MESSAGE,
          });
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_CREATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );

    // Create new actual for task
    const { mutate: createActualDuration } = useMutation(
      'postCreateActualDuration',
      handleCreateActualDuration,
      {
        onSuccess: () => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_CREATE_MESSAGE);
        },
        onSettled: () => {},
      },
    );

    // Update plan for task
    const handleUpdatePlanTime = async ({
      uuid,
      data,
    }: {
      uuid: string;
      data: { planEndDate: string | null; planStartDate: string | null };
    }) => {
      return await api.patch(apiRouters.TASK_SCHEDULE_DETAIL(`${uuid}`), data);
    };

    const { mutate: updatePlanTime } = useMutation(
      'postUpdatePlanTime',
      handleUpdatePlanTime,
      {
        onSuccess: async () => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
          setSelectedEvents([]);
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );

    // Update multi plan for task
    const handleUpdateMultiPlanTime = async ({
      taskSchedules,
    }: {
      taskSchedules: {
        uuid: string;
        taskId: number;
        planStartDate: string;
        planEndDate: string;
      }[];
    }) => {
      return await api.post(apiRouters.TASK_SCHEDULE_MULTIPLE, {
        taskSchedules: taskSchedules,
      });
    };

    const { mutate: updateMultiPlanTime } = useMutation(
      'postUpdateMultiPlanTime',
      handleUpdateMultiPlanTime,
      {
        onSuccess: async () => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
          setSelectedEvents([]);
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );
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
        onSuccess: async () => {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );

    const handleCallApiAllData = async (
      startDateISOString: string,
      endDateISOString: string,
    ) => {
      await getEventCalendarByUsers({
        userId: String(session?.user.id),
        startDate: startDateISOString,
        endDate: endDateISOString,
      }),
        await getMyTaskCalendar({
          userId: `${memberSelected}` || `${session?.user.id}`,
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      await getMyTaskActualCalendar({
        userId: `${memberSelected}` || `${session?.user.id}`,
        startDate: startDateISOString,
        endDate: endDateISOString,
      });
    };

    // Update data when edit in modal edit
    useEffect(() => {
      if (dataItemUpdateSchedule && dataItemUpdateSchedule.status) {
        // Check item exist in list schedule
        const updatedTaskList = taskTimeScheduleList.filter(
          (item) =>
            !(
              `${item.taskId}` === `${dataItemUpdateSchedule.id}` &&
              item.resourceId === ItemScheduleType.PLANS
            ),
        );

        const largeColor =
          dataItemUpdateSchedule.categories &&
          dataItemUpdateSchedule.categories.find(
            (item) => item.type === EventWorkCategory.LARGE,
          )?.color;
        const dataUpdateTitle = updatedTaskList.map((item) => {
          if (`${item.taskId}` === `${dataItemUpdateSchedule.id}`) {
            return {
              ...item,
              title: dataItemUpdateSchedule.title
                ? dataItemUpdateSchedule.title
                : '',
              largeColor: largeColor,
              isImportant: dataItemUpdateSchedule.isImportant,
              deadline: dataItemUpdateSchedule.deadline,
            };
          }
          return item;
        });

        const newDataList =
          dataItemUpdateSchedule.taskSchedules &&
          dataItemUpdateSchedule.taskSchedules.map((item) => {
            return {
              ...dataItemUpdateSchedule,
              id: `${item.id}`,
              uuid: `${item.uuid}`,
              planStartDate: item.planStartDate,
              planEndDate: item.planEndDate as string,
              isMyTask: dataItemUpdateSchedule.isMyTask,
              taskId: parseInt(`${dataItemUpdateSchedule.id}`),
              type: ItemStartType.TASK,
              title: dataItemUpdateSchedule.title
                ? dataItemUpdateSchedule.title
                : '',
              isStart: dataItemUpdateSchedule.isStart,
              status: dataItemUpdateSchedule.status,
              taskSchedules: [],
              startEditable: true,
              start: new Date(`${item.planStartDate}`),
              end: new Date(`${item.planEndDate}`),
              resourceId: ItemScheduleType.PLANS,
              largeColor: largeColor,
            };
          });
        setTaskTimeScheduleList([...dataUpdateTitle, ...newDataList]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataItemUpdateSchedule]);

    // Check for existence and change it if edited
    useEffect(() => {
      if (dataItemAddSchedule && dataItemAddSchedule.taskSchedules.length) {
        const idExists = taskTimeScheduleList.some(
          (item) => `${item.taskId}` === `${dataItemAddSchedule.id}`,
        );
        if (!idExists) {
          const newDataList = dataItemAddSchedule.taskSchedules.map((item) => {
            const isFutureDate = isDateInFutureOrToday(`${item.planStartDate}`);
            return {
              ...dataItemAddSchedule,
              id: `${item.id}`,
              uuid: `${item.uuid}`,
              taskId: parseInt(`${dataItemAddSchedule.id}`),
              planStartDate: item.planStartDate,
              planEndDate: item.planEndDate as string,
              type: dataItemAddSchedule.type,
              title: dataItemAddSchedule.title || '',
              isStart: dataItemAddSchedule.isStart,
              status: dataItemAddSchedule.status,
              startEditable: isFutureDate,
              start: new Date(`${item.planStartDate}`),
              end: new Date(`${item.planEndDate}`),
              resourceId: dataItemAddSchedule.resourceId
                ? dataItemAddSchedule.resourceId
                : ItemScheduleType.PLANS,
            };
          });
          setTaskTimeScheduleList((prevList) => [...prevList, ...newDataList]);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataItemAddSchedule]);

    // Check for existence and delete if idTaskDelete is set
    useEffect(() => {
      if (idTaskDelete) {
        const updatedTaskList = taskTimeScheduleList.filter(
          (item) => `${item.taskId}` !== `${idTaskDelete}`,
        );
        setTaskTimeScheduleList(updatedTaskList);
        setIdTaskDelete('');
      }
    }, [idTaskDelete, setIdTaskDelete, taskTimeScheduleList]);

    // Update data when start item
    useEffect(() => {
      if (dataItemChangeInline) {
        const updatedList = taskTimeScheduleList.map((item) => {
          if (dataItemChangeInline.type === ItemStartType.SCHEDULE) {
            if (`${item.scheduleId}` === `${dataItemChangeInline.id}`) {
              return {
                ...item,
                isStart:
                  dataItemChangeInline.isStart !== undefined
                    ? dataItemChangeInline.isStart
                    : item.isStart,
              };
            }
          } else {
            if (`${item.taskId}` === `${dataItemChangeInline.id}`) {
              return {
                ...item,
                isStart:
                  dataItemChangeInline.isStart !== undefined
                    ? dataItemChangeInline.isStart
                    : item.isStart,
              };
            }
          }

          return item;
        });

        setTaskTimeScheduleList(updatedList);
        setDataItemChangeInline(undefined);
      }
    }, [dataItemChangeInline]);

    //Add data Actual
    useEffect(() => {
      if (dataActualAddSchedule) {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          const startDateISOString = formatQueryStartDateForCalendar(
            calendarApi.view.activeStart,
          );
          const endDateISOString = formatQueryEndDateForCalendar(
            calendarApi.view.activeEnd,
          );
          getMyTaskActualCalendar({
            userId: `${memberSelected}` || `${session?.user.id}`,
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        }
      }
    }, [dataActualAddSchedule]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (resizableElementRef.current) {
        const newWidth =
          e.clientX - resizableElementRef.current.getBoundingClientRect().left;
        if (newWidth <= 1040) {
          resizableElementRef.current.style.width = `${newWidth}px`;
          resizableElementRef.current.style.minWidth = `${newWidth}px`;
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
      if (!isExtendCalendar && resizableElementRef.current) {
        resizableElementRef.current.style.width = '';
        resizableElementRef.current.style.minWidth = '';
      }
    }, [isExtendCalendar]);

    useEffect(() => {
      const draggableEl = exEvents.current;
      let draggable: any;
      if (draggableEl) {
        draggable = new ThirdPartyDraggable(draggableEl, {
          itemSelector: '.ex-event-draggable',
          mirrorSelector: '.ex-event-draggable',
          eventData(eventEl) {
            const data = JSON.parse(eventEl.dataset.event as string);
            if (data.start) {
              return {
                ...data,
                source: 'external',
                id: data.id,
                title: data.title || '',
                status: data.status,
                startTime: { day: 1 },
                duration: {
                  minutes:
                    data.end && data.start
                      ? moment(data.end).diff(moment(data.start), 'minutes')
                      : undefined,
                },
              };
            } else {
              return {
                id: data.id,
                title: data.title || '',
                startTime: { day: 1 },
              };
            }
          },
        });
      }
      return () => draggable?.destroy();
    }, [exEvents]);

    // Many drag & drop item
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

    const [isShiftPressed, setIsShiftPressed] = useState(false);

    useEffect(() => {
      const handleKeyDown = (e: any) => {
        if (e.key === 'Shift') setIsShiftPressed(true);
      };

      const handleKeyUp = (e: any) => {
        if (e.key === 'Shift') setIsShiftPressed(false);
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, []);

    const handleViewChange = async (calendarView: string) => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();

        if (calendarView === CalendarViewOptions.VIEW_BY_WEEK) {
          params.set('view', ViewOptions.WEEK);
          router.push(`?${params.toString()}`);
          setIsExtendCalendar(true);
        } else if (calendarView === CalendarViewOptions.VIEW_BY_DAY) {
          params.set('view', ViewOptions.DAY);
          router.push(`?${params.toString()}`);
          setIsExtendCalendar(false);
        }
        calendarApi.changeView(calendarView);
        const startDateISOString = formatQueryStartDateForCalendar(
          calendarApi.view.activeStart,
        );
        const endDateISOString = formatQueryEndDateForCalendar(
          calendarApi.view.activeEnd,
        );

        setDisplayHeaderDayStart(new Date(startDateISOString));
        setDisplayHeaderDayEnd(new Date(endDateISOString));
        setResetTrigger((prev) => prev + 1);
        setIsLoadingSchedule(true);
        await handleCallApiAllData(startDateISOString, endDateISOString);

        setTimeout(() => {
          calendarApi.refetchEvents();
        }, 300);
        setTimeout(() => {
          saveZoomSchedule({
            isShowWeekSchedule:
              calendarView === CalendarViewOptions.VIEW_BY_WEEK,
            dateFilterScheduleFrom: startDateISOString,
          });
          scrollToNowIndicator();
        }, 300);
      }
    };
    const handleViewChangeDefault = async (calendarView: string) => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();

        if (calendarView === CalendarViewOptions.VIEW_BY_WEEK) {
          params.set('view', ViewOptions.WEEK);
          router.push(`?${params.toString()}`);
          setIsExtendCalendar(true);
        } else if (calendarView === CalendarViewOptions.VIEW_BY_DAY) {
          params.set('view', ViewOptions.DAY);
          router.push(`?${params.toString()}`);
          setIsExtendCalendar(false);
        }
        calendarApi.changeView(calendarView);
        const startDateISOString = formatQueryStartDateForCalendar(
          calendarApi.view.activeStart,
        );
        const endDateISOString = formatQueryEndDateForCalendar(
          calendarApi.view.activeEnd,
        );
        setDisplayHeaderDayStart(new Date(startDateISOString));
        setDisplayHeaderDayEnd(new Date(endDateISOString));
        setSlotHeight(baseHeight);
        setResetTrigger((prev) => prev + 1);
        setTimeout(() => {
          calendarApi.refetchEvents();
        }, 300);
      }
    };

    const handleChangeStartTime = (
      e: ChangeEvent<HTMLInputElement>,
      endDate: string,
      uuid: string,
      resourcePlan: boolean,
    ): void => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 4) {
        value = value.substring(0, 4);
      }

      const updatedTasks = taskTimeScheduleList.map((item) => {
        if (item.uuid === uuid) {
          return {
            ...item,
            start: new Date(
              combineDateAndTime(
                item.start,
                `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
              ),
            ),
            planStartDate: combineDateAndTime(
              item.start,
              `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
            ),
          };
        }
        return item;
      });

      if (!resourcePlan) {
        updateActualTime({
          uuid: uuid,
          data: {
            startedAt: combineDateAndTime(
              new Date(endDate),
              `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
            ),
            pausedAt: convertDateString(endDate),
          },
        });
      } else {
        updatePlanTime({
          uuid: uuid,
          data: {
            planStartDate: combineDateAndTime(
              new Date(endDate),
              `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
            ),
            planEndDate: convertDateString(endDate),
          },
        });
      }
      setTaskTimeScheduleList(updatedTasks);
    };
    const handleChangeEndTime = (
      e: ChangeEvent<HTMLInputElement>,
      startDate: string,
      uuid: string,
      resourcePlan: boolean,
    ): void => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 4) {
        value = value.substring(0, 4);
      }
      const updatedTasks = taskTimeScheduleList.map((item) => {
        if (item.uuid === uuid) {
          return {
            ...item,
            end: new Date(
              combineDateAndTime(
                item.start as Date,
                `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
              ),
            ),
            planEndDate: combineDateAndTime(
              item.start as Date,
              `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
            ),
          };
        }
        return item;
      });
      if (!resourcePlan) {
        updateActualTime({
          uuid: uuid,
          data: {
            startedAt: convertDateString(startDate),
            pausedAt: combineDateAndTime(
              new Date(startDate),
              `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
            ),
          },
        });
      } else {
        updatePlanTime({
          uuid: uuid,
          data: {
            planStartDate: convertDateString(startDate),
            planEndDate: combineDateAndTime(
              new Date(startDate),
              `${formatTimeInput(`${convertToMinutesNumber(value)}`)}`,
            ),
          },
        });
      }
      setTaskTimeScheduleList(updatedTasks);
    };

    const isErrorObject = (obj: any): boolean => {
      return obj instanceof Error || obj?.message || obj?.stack;
    };

    const handleRenderEvent = (eventInfo: EventContentArg) => {
      const event = eventInfo?.event as any;
      if (isErrorObject(event)) {
        return null;
      }
      const extendedProps = event?.extendedProps;
      if (!extendedProps) null;
      if (!event.start || !event.end) return null;

      const isSelect = selectedEvents.includes(extendedProps?.uuid);

      return (
        <>
          {!isLoadingSchedule && (
            <TaskCard
              event={eventInfo}
              deletePlanTask={(uuid: string, taskId: number) => {
                // DELETE plan task
                const newDataTimeList = taskTimeScheduleList.filter(
                  (item) => item.uuid !== uuid,
                );
                deletePlanTask(uuid);
                setTaskTimeScheduleList(newDataTimeList);
                const hasMatchingItem = newDataTimeList.some(
                  (item) =>
                    item.taskId === taskId &&
                    item.resourceId === ItemScheduleType.PLANS &&
                    item.start &&
                    isTodaySchedule(item.start),
                );
                if (!hasMatchingItem) {
                  handleEditShowClockItem(taskId, false);
                }
                setPopoverInfo(null);
                showToast({
                  description: SUCCESS_DELETE_MESSAGE,
                });
              }}
              deleteActualTask={(uuid: string) => deleteActualTask(uuid)}
              isSelect={isSelect}
              slotHeight={slotHeight}
              isOptionZoomSchedule={isOptionZoomSchedule}
              taskTimeScheduleList={taskTimeScheduleList}
              titleSize={calculateFontSizeTitle()}
              contentSize={calculateFontSizeContent()}
              handleSetEventParam={handleSetEventParam}
              handleUpdateItemStart={handleUpdateItemStart}
              handleChangeStartTime={handleChangeStartTime}
              handleChangeEndTime={handleChangeEndTime}
              onDeleteEvent={(data) => {
                setDataEventEditLocal(data);
                setConfirmEventDataToEdit(data);
                setOpenCreateEventModal(false);
                setOpenConfirmDeleteEventModal(true);
                setIdBackToEvent(data.id as string);
              }}
            />
          )}
          <div></div>
        </>
      );
    };
    const modifyEvents = (events: TaskTimeSchedule[]) => {
      return events.map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const timeDifference = (end.getTime() - start.getTime()) / (1000 * 60);

        if (
          event.resourceId === ItemScheduleType.PLANS &&
          timeDifference < 15 &&
          start.getHours() === 23 &&
          start.getMinutes() <= 44
        ) {
          event.end = new Date(start.getTime() + 15 * 60 * 1000);
        } else if (
          event.resourceId === ItemScheduleType.ACTUAL &&
          timeDifference < 5 &&
          start.getHours() < 23 &&
          start.getMinutes() <= 40
        ) {
          event.end = new Date(start.getTime() + 5 * 60 * 1000);
        } else if (
          event.resourceId === ItemScheduleType.PLANS &&
          timeDifference < 15 &&
          start.getHours() < 23
        ) {
          event.end = new Date(start.getTime() + 15 * 60 * 1000);
        }
        if (event.isAllDay && event.type === ItemStartType.SCHEDULE) {
          event.allDay = true;
        } else {
          event.allDay = false;
        }

        return event;
      });
    };

    // Handle event drag from kanban into calendar
    const handleEventReceive = async (info: EventReceiveArg) => {
      const newEvent = info.event as any;
      const newEventId = newEvent.id;
      const uuidData = uuidv4();

      const isLessThanToday = isDateLessThanToday(newEvent.start);

      if (!info.draggedEl) {
        info.event.remove();
      }
      if (areDatesDifferent(`${newEvent.start}`, `${newEvent.end}`)) {
        info.event.remove();
      }
      if (isLoadingSchedule) {
        info.event.remove();
      }
      const resourcePlan =
        searchParams.get('view') === ViewOptions.DAY
          ? newEvent._def.resourceIds?.length &&
            newEvent._def.resourceIds[0] === ItemScheduleType.PLANS
          : isLessThanToday
            ? false
            : true;

      if (!newEventId || newEventId === '') {
        info.view.calendar.refetchEvents();
      }

      if (newEvent.extendedProps.itemKanban) {
        if (
          searchParams.get('view') === ViewOptions.DAY &&
          isDateInFutureOrToday(`${newEvent.end}`) &&
          !resourcePlan
        ) {
          info.event.remove();
        }

        const hasOverlap = taskTimeScheduleList.some((item) => {
          return (
            newEvent.start < item.end &&
            newEvent.end > item.start &&
            item.resourceId === ItemScheduleType.ACTUAL &&
            !resourcePlan &&
            item.taskId === Number(newEventId)
          );
        });

        // Check overlap actual
        if (hasOverlap) {
          const externalEvents = document.getElementById('external-events');
          const eventEl = document.createElement('div');
          eventEl.className = 'fc-event';
          eventEl.innerText = '1234';
          eventEl.setAttribute('data-id', '11111');

          externalEvents?.appendChild(eventEl);
        } else {
          info.view.calendar.refetchEvents();

          // Add new data into schedule
          setTaskTimeScheduleList((prevEvents) => {
            const updatedEvents = [...prevEvents];

            updatedEvents.push({
              taskId: parseInt(`${newEventId}`),
              id: uuidv4(),
              uuid: uuidData,
              title: newEvent.title || '',
              start: newEvent.start || new Date(),
              end: newEvent.end || new Date(),
              type: ItemStartType.TASK,
              isStart: newEvent.extendedProps.isStart,
              allDay: false,
              resourceId:
                searchParams.get('view') === ViewOptions.WEEK
                  ? isLessThanToday
                    ? ItemScheduleType.ACTUAL
                    : ItemScheduleType.PLANS
                  : resourcePlan
                    ? ItemScheduleType.PLANS
                    : ItemScheduleType.ACTUAL,

              startEditable: true,
              planStartDate: String(newEvent.start) || '',
              planEndDate: String(newEvent.end) || '',
              largeColor: newEvent.extendedProps.largeColor,
              deadline: newEvent.extendedProps.deadline,
              statusId: newEvent.extendedProps.status.id,
            });

            return updatedEvents;
          });
          if (isTodaySchedule(newEvent.start) && resourcePlan) {
            handleEditShowClockItem(parseInt(newEventId));
          }

          await new Promise((resolve) => setTimeout(resolve, 100));

          if (searchParams.get('view') === ViewOptions.WEEK) {
            if (isLessThanToday) {
              createActualDuration({
                taskId: newEventId,
                uuid: uuidData,
                startedAt: convertDateString(`${newEvent.start}`),
                pausedAt: convertDateString(`${newEvent.end}`),
              });
            } else {
              // Set data time default for task frequently in kanban for color show task
              setFrequentlyTasks((prevFrequentlyTasks) =>
                prevFrequentlyTasks.map((item) => {
                  if (`${item.id}` === `${newEventId}`) {
                    return {
                      ...item,
                      taskSchedules: [
                        {
                          planStartDate: `${newEvent.start}`,
                          planEndDate: `${newEvent.end}`,
                        },
                      ],
                    };
                  }
                  return item;
                }),
              );
              updateTaskDates({
                taskId: parseInt(`${newEvent.id}`),
                newStartDate: `${newEvent.start}`,
                newEndDate: `${newEvent.end}`,
              });

              createPlanTime({
                taskId: newEventId,
                uuid: uuidData,
                planStartDate: convertDateString(`${newEvent.start}`),
                planEndDate: convertDateString(`${newEvent.end}`),
              });
            }
          } else {
            if (resourcePlan) {
              // Set data time default for task frequently in kanban for color show task
              setFrequentlyTasks((prevFrequentlyTasks) =>
                prevFrequentlyTasks.map((item) => {
                  if (`${item.id}` === `${newEventId}`) {
                    return {
                      ...item,
                      taskSchedules: [
                        {
                          planStartDate: `${newEvent.start}`,
                          planEndDate: `${newEvent.end}`,
                        },
                      ],
                    };
                  }
                  return item;
                }),
              );
              updateTaskDates({
                taskId: parseInt(`${newEvent.id}`),
                newStartDate: `${newEvent.start}`,
                newEndDate: `${newEvent.end}`,
              });

              createPlanTime({
                taskId: newEventId,
                uuid: uuidData,
                planStartDate: convertDateString(`${newEvent.start}`),
                planEndDate: convertDateString(`${newEvent.end}`),
              });
            } else {
              createActualDuration({
                taskId: newEventId,
                uuid: uuidData,
                startedAt: convertDateString(`${newEvent.start}`),
                pausedAt: convertDateString(`${newEvent.end}`),
              });
            }
          }
        }
      } else {
        const newDataTimeList = taskTimeScheduleList.map((event) => {
          if (event.uuid === newEvent.extendedProps.uuid) {
            const newData = {
              ...event,
            };
            return newData;
          } else {
            return event;
          }
        });
        // Set data schedule
        setTaskTimeScheduleList(newDataTimeList);
      }
      setTimeout(() => setIsInteracting(false), 200);
    };

    // Event resize
    const handleEventResize = async (info: EventResizeDoneArg) => {
      const resizedEvent = info.event as any;
      const isLessThanToday = isDateLessThanToday(resizedEvent.start);
      const resourcePlanDay =
        resizedEvent._def.resourceIds?.length &&
        resizedEvent._def.resourceIds[0] === ItemScheduleType.PLANS;

      const resourcePlanWeek = isLessThanToday ? false : true;
      if (areDatesDifferent(`${resizedEvent.start}`, `${resizedEvent.end}`)) {
        const oldStart = info.oldEvent.start;
        const oldEnd = info.oldEvent.end;

        info.event.setDates(oldStart as Date, oldEnd);
      }

      if (!resourcePlanDay && isDateInFutureOrToday(resizedEvent.end)) {
        const oldStart = info.oldEvent.start;
        const oldEnd = info.oldEvent.end;

        info.event.setDates(oldStart as Date, oldEnd);
      }

      if (
        !info.event.extendedProps.taskId &&
        !info.event.extendedProps.scheduleId
      ) {
        const oldStart = info.oldEvent.start;
        const oldEnd = info.oldEvent.end;

        info.event.setDates(oldStart as Date, oldEnd);
      }

      if (info.event.extendedProps.type === EventCalendarType.SCHEDULE) {
        const oldStart = info.oldEvent.start;
        const oldEnd = info.oldEvent.end;

        info.event.setDates(oldStart as Date, oldEnd);
      }

      if (
        (!resourcePlanDay && searchParams.get('view') === ViewOptions.DAY) ||
        (!resourcePlanWeek && searchParams.get('view') === ViewOptions.WEEK)
      ) {
        if (info.event.extendedProps.type === EventCalendarType.TASK) {
          const hasOverlap = taskTimeScheduleList.some((item) => {
            if (item.uuid === resizedEvent.extendedProps.uuid) {
              return false;
            }
            return (
              resizedEvent.start < item.end &&
              resizedEvent.end > item.start &&
              item.resourceId === ItemScheduleType.ACTUAL &&
              item.taskId === resizedEvent.extendedProps.taskId
            );
          });

          if (hasOverlap) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
        } else {
          const hasOverlap = taskTimeScheduleList.some((item) => {
            if (item.uuid === resizedEvent.extendedProps.uuid) {
              return false;
            }
            return (
              resizedEvent.start < item.end &&
              resizedEvent.end > item.start &&
              item.resourceId === ItemScheduleType.ACTUAL &&
              item.scheduleId === resizedEvent.extendedProps.scheduleId
            );
          });

          if (hasOverlap) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
        }
      }

      setTaskTimeScheduleList((prevEvents) => {
        return prevEvents.map((event) => {
          if (event.uuid === resizedEvent.extendedProps.uuid) {
            const newData = {
              ...event,
              planStartDate: `${resizedEvent.start}`,
              planEndDate: `${resizedEvent.end}`,
              start: resizedEvent.start || new Date(),
              end: resizedEvent.end || new Date(),
            };
            return newData;
          } else {
            return event;
          }
        });
      });
      if (searchParams.get('view') === ViewOptions.DAY) {
        if (resourcePlanDay) {
          updatePlanTime({
            uuid: resizedEvent.extendedProps.uuid,
            data: {
              planStartDate: convertDateString(`${resizedEvent.start}`),
              planEndDate: convertDateString(`${resizedEvent.end}`),
            },
          });
        } else {
          updateActualTime({
            uuid: resizedEvent.extendedProps.uuid,
            data: {
              startedAt: convertDateString(`${resizedEvent.start}`),
              pausedAt: convertDateString(`${resizedEvent.end}`),
            },
          });
        }
      }
      if (searchParams.get('view') === ViewOptions.WEEK) {
        if (resourcePlanWeek) {
          updatePlanTime({
            uuid: resizedEvent.extendedProps.uuid,
            data: {
              planStartDate: convertDateString(`${resizedEvent.start}`),
              planEndDate: convertDateString(`${resizedEvent.end}`),
            },
          });
        } else {
          updateActualTime({
            uuid: resizedEvent.extendedProps.uuid,
            data: {
              startedAt: convertDateString(`${resizedEvent.start}`),
              pausedAt: convertDateString(`${resizedEvent.end}`),
            },
          });
        }
      }
      setTimeout(() => setIsInteracting(false), 200);
    };
    // Event drag & drop schedule
    const handleEventDrop = async (info: EventDropArg) => {
      const droppedEvent = info.event;
      const startDrop = new Date(droppedEvent.start || new Date());
      const endDrop = new Date(droppedEvent.end || new Date());
      const isLessThanToday = isDateLessThanToday(startDrop);
      const resourcePlanWeek = isLessThanToday ? false : true;

      const resourcePlanDay =
        droppedEvent._def.resourceIds?.length &&
        droppedEvent._def.resourceIds[0] === ItemScheduleType.PLANS;
      const draggedResourceId = info.oldResource?.id;
      const dropResourceId = info.newResource?.id;

      if (
        selectedEvents.length > 1 &&
        selectedEvents.includes(droppedEvent.extendedProps.uuid as string)
      ) {
        moveMultipleEvents(droppedEvent);
        return;
      }

      if (
        draggedResourceId &&
        dropResourceId &&
        draggedResourceId !== dropResourceId
      ) {
        const oldStart = info.oldEvent.start;
        const oldEnd = info.oldEvent.end;

        const oldResource = info.oldEvent.getResources()?.[0];

        info.event.setStart(oldStart as Date);
        info.event.setEnd(oldEnd as Date);

        if (oldResource) {
          info.event.setResources([oldResource.id]);
        }
      } else {
        if (info.event.extendedProps.type === EventCalendarType.SCHEDULE) {
          const oldStart = info.oldEvent.start;
          const oldEnd = info.oldEvent.end;
          info.event.setDates(oldStart as Date, oldEnd);
        }
        if (!startDrop && !endDrop) {
          const oldStart = info.oldEvent.start;
          const oldEnd = info.oldEvent.end;
          info.event.setDates(oldStart as Date, oldEnd);
        }
        if (areDatesDifferent(`${startDrop}`, `${endDrop}`)) {
          const oldStart = info.oldEvent.start;
          const oldEnd = info.oldEvent.end;
          info.event.setDates(oldStart as Date, oldEnd);
        }
        // GET ITEM DRAG & DROP
        const matchData = taskTimeScheduleList.find(
          (item) => item.uuid === droppedEvent.extendedProps.uuid,
        );

        /// WEEK
        if (searchParams.get('view') === ViewOptions.WEEK) {
          /// if item actual && col plan
          if (
            matchData &&
            matchData.resourceId === ItemScheduleType.ACTUAL &&
            resourcePlanWeek
          ) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
          if (
            matchData &&
            matchData.resourceId === ItemScheduleType.PLANS &&
            !resourcePlanWeek
          ) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }

          const isCheckWeek = resourcePlanWeek
            ? ItemScheduleType.PLANS
            : ItemScheduleType.ACTUAL;
          const hasOverlapWeek = taskTimeScheduleList.some((item) => {
            if (item.uuid === droppedEvent.extendedProps.uuid) {
              return false;
            }
            return (
              startDrop < item.end &&
              endDrop > item.start &&
              item.resourceId === isCheckWeek &&
              !resourcePlanWeek &&
              item.taskId === droppedEvent.extendedProps.taskId
            );
          });
          // Check overlap actual week

          if (hasOverlapWeek) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
          if (matchData && matchData.uuid !== droppedEvent.extendedProps.uuid) {
            info.view.calendar.refetchEvents();
          }

          const newDataTimeList = taskTimeScheduleList.map((event) => {
            if (event.uuid === droppedEvent.extendedProps.uuid) {
              const newData = {
                ...event,
                resourceId: isCheckWeek,
                start: droppedEvent.start || new Date(),
                end: droppedEvent.end || new Date(),
                planStartDate: String(droppedEvent.start) || '',
                planEndDate: String(droppedEvent.end) || '',
              };
              return newData;
            } else {
              return event;
            }
          });
          // Set data schedule
          setTaskTimeScheduleList(newDataTimeList);
          if (isTodaySchedule(startDrop)) {
            handleEditShowClockItem(
              parseInt(droppedEvent.extendedProps.taskId),
            );
          } else {
            const hasMatchingItem = newDataTimeList.some(
              (item) =>
                item.taskId === droppedEvent.extendedProps.taskId &&
                item.resourceId === ItemScheduleType.PLANS &&
                item.start &&
                isTodaySchedule(item.start),
            );
            if (!hasMatchingItem) {
              handleEditShowClockItem(
                parseInt(droppedEvent.extendedProps.taskId),
                false,
              );
            }
          }

          // Check item plan and col actual
          if (
            matchData &&
            matchData.resourceId === ItemScheduleType.PLANS &&
            !resourcePlanWeek
          ) {
            createActualDuration({
              taskId: droppedEvent.extendedProps.taskId,
              uuid: droppedEvent.extendedProps.uuid,
              startedAt: convertDateString(`${startDrop}`),
              pausedAt: convertDateString(`${endDrop}`),
            });
            deletePlanTask(droppedEvent.extendedProps.uuid);
          } else {
            if (
              matchData &&
              matchData.resourceId === ItemScheduleType.PLANS &&
              resourcePlanWeek
            ) {
              updatePlanTime({
                uuid: droppedEvent.extendedProps.uuid,
                data: {
                  planStartDate: convertDateString(`${droppedEvent.start}`),
                  planEndDate: convertDateString(
                    addTimeDifference(
                      `${droppedEvent.extendedProps.planStartDate}`,
                      `${droppedEvent.extendedProps.planEndDate}`,
                      droppedEvent.start as Date,
                      0,
                    ),
                  ),
                },
              });
            }
            if (
              matchData &&
              matchData.resourceId === ItemScheduleType.ACTUAL &&
              !resourcePlanWeek
            ) {
              updateActualTime({
                uuid: droppedEvent.extendedProps.uuid,
                data: {
                  startedAt: convertDateString(`${droppedEvent.start}`),
                  pausedAt: convertDateString(
                    addTimeDifference(
                      `${droppedEvent.extendedProps.planStartDate}`,
                      `${droppedEvent.extendedProps.planEndDate}`,
                      droppedEvent.start as Date,
                      0,
                    ),
                  ),
                },
              });
            }
          }
        } else {
          if (
            isDateInFutureOrToday(`${droppedEvent.end}`) &&
            !resourcePlanDay
          ) {
            // if item actual or plan  with col actual with date in feature
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
          if (
            matchData &&
            matchData.resourceId === ItemScheduleType.ACTUAL &&
            resourcePlanDay
          ) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
          if (
            matchData &&
            matchData.resourceId === ItemScheduleType.PLANS &&
            !resourcePlanDay
          ) {
            const oldStart = info.oldEvent.start;
            const oldEnd = info.oldEvent.end;

            info.event.setDates(oldStart as Date, oldEnd);
          }
          if (matchData && matchData.uuid !== droppedEvent.extendedProps.uuid) {
            info.view.calendar.refetchEvents();
          }
          const isCheckDay = resourcePlanDay
            ? ItemScheduleType.PLANS
            : ItemScheduleType.ACTUAL;
          if (!resourcePlanDay) {
            // Check overlap actual

            const hasOverlap = taskTimeScheduleList.some((item) => {
              if (item.uuid === droppedEvent.extendedProps.uuid) {
                return false;
              }

              return (
                startDrop < item.end &&
                endDrop > item.start &&
                item.resourceId === isCheckDay &&
                !resourcePlanDay &&
                item.taskId === droppedEvent.extendedProps.taskId
              );
            });

            if (hasOverlap) {
              const oldStart = info.oldEvent.start;
              const oldEnd = info.oldEvent.end;

              info.event.setDates(oldStart as Date, oldEnd);
            }
          }
          const newDataTimeList = taskTimeScheduleList.map((event) => {
            if (event.uuid === droppedEvent.extendedProps.uuid) {
              const newData = {
                ...event,
                resourceId: isCheckDay,
                start: droppedEvent.start || new Date(),
                end: droppedEvent.end || new Date(),
                planStartDate: String(droppedEvent.start) || '',
                planEndDate: String(droppedEvent.end) || '',
              };
              return newData;
            } else {
              return event;
            }
          });
          // Set data schedule
          setTaskTimeScheduleList(newDataTimeList);

          await new Promise((resolve) => setTimeout(resolve, 100));

          if (
            matchData &&
            matchData.resourceId === ItemScheduleType.PLANS &&
            !resourcePlanDay &&
            droppedEvent.extendedProps.taskId
          ) {
            createActualDuration({
              taskId: droppedEvent.extendedProps.taskId,
              uuid: droppedEvent.extendedProps.uuid,
              startedAt: convertDateString(`${startDrop}`),
              pausedAt: convertDateString(`${endDrop}`),
            });
            deletePlanTask(droppedEvent.extendedProps.uuid);
          } else {
            if (
              matchData &&
              matchData.resourceId === ItemScheduleType.PLANS &&
              resourcePlanDay
            ) {
              updatePlanTime({
                uuid: droppedEvent.extendedProps.uuid,
                data: {
                  planStartDate: convertDateString(`${droppedEvent.start}`),
                  planEndDate: convertDateString(
                    addTimeDifference(
                      `${droppedEvent.extendedProps.planStartDate}`,
                      `${droppedEvent.extendedProps.planEndDate}`,
                      droppedEvent.start as Date,
                      0,
                    ),
                  ),
                },
              });
            }
            if (
              matchData &&
              matchData.resourceId === ItemScheduleType.ACTUAL &&
              !resourcePlanDay
            ) {
              updateActualTime({
                uuid: droppedEvent.extendedProps.uuid,
                data: {
                  startedAt: convertDateString(`${droppedEvent.start}`),
                  pausedAt: convertDateString(
                    addTimeDifference(
                      `${droppedEvent.extendedProps.planStartDate}`,
                      `${droppedEvent.extendedProps.planEndDate}`,
                      droppedEvent.start as Date,
                      0,
                    ),
                  ),
                },
              });
            }
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      setTimeout(() => setIsInteracting(false), 200);
    };

    const moveMultipleEvents = (event: EventImpl) => {
      const draggedEvent = taskTimeScheduleList.find(
        (e) => e.uuid === event.extendedProps.uuid,
      );
      if (!event.start || !draggedEvent) return;
      const movedDelta =
        event.start.getTime() - new Date(draggedEvent.start).getTime();
      const changedEvents: TaskTimeSchedule[] = [];
      const updatedEvents = taskTimeScheduleList.map((e) => {
        if (selectedEvents.includes(e.uuid as string)) {
          const newStart = addMilliseconds(
            new Date(e.start),
            movedDelta,
          ).toISOString();
          const newEnd = addMilliseconds(
            new Date(e.end),
            movedDelta,
          ).toISOString();

          if (isTodaySchedule(new Date(newStart))) {
            handleEditShowClockItem(e.taskId as number);
          } else {
            const hasMatchingItem = taskTimeScheduleList
              .filter((fil) => fil.uuid !== e.uuid)
              .some(
                (item) =>
                  item.taskId === e.taskId &&
                  item.resourceId === ItemScheduleType.PLANS &&
                  item.start &&
                  isTodaySchedule(item.start),
              );
            if (!hasMatchingItem) {
              handleEditShowClockItem(e.taskId as number, false);
            }
          }
          const newEvent = {
            ...e,
            start: new Date(newStart),
            end: new Date(newEnd),
            planStartDate: String(newStart) || '',
            planEndDate: String(newEnd) || '',
          };
          changedEvents.push(newEvent);
          return newEvent;
        }
        return e;
      });
      const { allEvents, splittedEvents } =
        splitMultiDayEventsArray(updatedEvents);
      const updatedAllEvents = allEvents.map((event) => {
        if (isMidnight(event.start) && isMidnight(event.end)) {
          return {
            ...event,
            end: new Date(new Date(event.end.getTime() + 1000 * 60).getTime()),
          };
        }
        return event;
      });

      const updatedSplittedEvents = splittedEvents.map((event) => {
        if (isMidnight(event.start) && isMidnight(event.end)) {
          return {
            ...event,
            end: new Date(new Date(event.end.getTime() + 1000 * 60).getTime()),
          };
        }
        return event;
      });

      setTaskTimeScheduleList(updatedAllEvents);
      const filteredChangeEvent = changedEvents.filter(
        (item) => !updatedSplittedEvents.some((split) => split.id === item.id),
      );
      const updatedChangeEvent = [
        ...filteredChangeEvent,
        ...updatedSplittedEvents,
      ];

      updateMultiPlanTime({
        taskSchedules: updatedChangeEvent.map((item) => ({
          uuid: item.uuid as string,
          taskId: item.taskId as number,
          planStartDate: convertDateString(item.start),
          planEndDate: convertDateString(item.end),
        })),
      });
    };
    const handleEventDragStop = (info: EventDragStopArg) => {
      const draggedEvent = info.event;
      const draggedResourceId = draggedEvent.extendedProps.resourceId;
      if (
        draggedResourceId &&
        draggedEvent.getResources()[0]?.id !== draggedResourceId
      ) {
        draggedEvent.setProp('resourceId', draggedResourceId);
      }
    };
    // Event permission
    const handleEventAllow = (
      dropInfo: DateSpanApi,
      draggedEvent: EventApi | null,
    ): boolean => {
      if (!draggedEvent) return false;

      if (
        draggedEvent.extendedProps.type === EventCalendarType.SCHEDULE ||
        !draggedEvent.startEditable
      ) {
        return false;
      }
      const isAllDay = draggedEvent.allDay;
      if (isAllDay && dropInfo.allDay) {
        return true;
      }
      if (isAllDay && !dropInfo.allDay) {
        return false;
      }
      if (!isAllDay && dropInfo.allDay) {
        return false;
      }

      const draggedResourceId = draggedEvent.extendedProps.resourceId;
      const dropResourceId = dropInfo.resource?.id;

      if (
        draggedResourceId &&
        dropResourceId &&
        draggedResourceId !== dropResourceId
      ) {
        return false;
      }

      return true;
    };

    const handleShowTaskInModal = (data: {
      id: string;
      taskId: string | number;
      uuid: string;
      isImportant?: boolean | null;
      isRunning?: boolean;
      deadline?: string;
      largeColor?: string;
      resource: string;
      start: string;
      end: string;
      title: string;
      eventList: any[];
      statusId: number;
      clientX: number;
      clientY: number;
    }) => {
      setPopoverInfo({
        id: data.id,
        taskId: data.taskId,
        resource: data.resource,
        largeColor: data.largeColor ? data.largeColor : '',
        title: data.title,
        end: data.end,
        isImportant: data.isImportant,
        uuid: data.uuid,
        deadline: data.deadline,
        start: data.start,
        isRunning: data.isRunning,
        statusId: data.statusId,
        left: adjustPositionForViewportSchedule({
          top: Number(data.clientY),
          left: Number(data.clientX),
        }).left,
        top: adjustPositionForViewportSchedule({
          top: Number(data.clientY),
          left: Number(data.clientX),
        }).top,
      });
    };
    const handleShowEventInModal = (data: {
      id: string;
      start: string;
      end: string;
      title: string;
      address?: string;
      isAllDay: boolean;
      participants: EventParticipant[];
      clientX: number;
      clientY: number;
      type: OptionDropdownType;
    }) => {
      setEventInfo({
        id: data.id,
        start: data.start,
        end: data.end,
        left: adjustPositionForViewportSchedule({
          top: Number(data.clientY),
          left: Number(data.clientX),
        }).left,
        top: adjustPositionForViewportSchedule({
          top: Number(data.clientY),
          left: Number(data.clientX),
        }).top,
        title: data.title,
        address: data.address,
        isAllDay: data.isAllDay,
        participants: data.participants,
        type: data.type,
      });
    };

    // Event click card
    const _handleEventClick = (clickInfo?: any) => {
      const resourcePlan =
        clickInfo.event._def &&
        clickInfo.event._def.resourceIds?.length &&
        clickInfo.event._def.resourceIds[0] === ItemScheduleType.PLANS;

      if (
        isShiftPressed &&
        resourcePlan &&
        clickInfo.event.extendedProps.type === ItemStartType.TASK
      ) {
        const uuid = clickInfo.event.extendedProps.uuid;
        setSelectedEvents((prev) =>
          prev.includes(uuid)
            ? prev.filter((eventId) => eventId !== uuid)
            : [...prev, uuid],
        );
      } else {
        setIsStartPopupDetail(clickInfo.event.extendedProps.isStart);
        if (
          clickInfo.event.extendedProps.type === ItemStartType.TASK ||
          !resourcePlan
        ) {
          handleShowTaskInModal({
            title: clickInfo.event.title,
            id: clickInfo.event.id,
            taskId: clickInfo.event.extendedProps.taskId,
            isImportant: clickInfo.event.extendedProps.isImportant,
            isRunning: clickInfo.event.extendedProps.isCalculation,
            deadline: clickInfo.event.extendedProps.deadline,
            uuid: clickInfo.event.extendedProps.uuid,
            resource: resourcePlan
              ? ItemScheduleType.PLANS
              : ItemScheduleType.ACTUAL,
            largeColor: clickInfo.event.extendedProps.largeColor
              ? clickInfo.event.extendedProps.largeColor
              : '',
            start: clickInfo.event.extendedProps.planStartDate,
            end: clickInfo.event.extendedProps.planEndDate,
            eventList: taskTimeScheduleList,
            statusId: resourcePlan
              ? clickInfo.event.extendedProps.statusId ||
                clickInfo.event.extendedProps.status.id
              : 0,
            clientX: clickInfo.jsEvent.clientX,
            clientY: clickInfo.jsEvent.clientY,
          });
        } else {
          setIdBackToEvent(clickInfo.event.extendedProps.scheduleId);
          handleShowEventInModal({
            title: clickInfo.event.title,
            id: clickInfo.event.extendedProps.scheduleId,
            start: clickInfo.event.extendedProps.planStartDate,
            end: clickInfo.event.extendedProps.isAllDay
              ? clickInfo.event.extendedProps.endDate
              : clickInfo.event.extendedProps.planEndDate,
            clientX: clickInfo.jsEvent.clientX,
            clientY: clickInfo.jsEvent.clientY,
            isAllDay: clickInfo.event.extendedProps.isAllDay,
            address: clickInfo.event.extendedProps.address,
            participants: clickInfo.event.extendedProps.participants,
            type: {
              label: clickInfo.event.extendedProps.eventType,
              value: clickInfo.event.extendedProps.eventType,
            },
          });
        }
      }
    };

    // Event action
    const handleGetDataDetailEvent = async (id: string) => {
      setIsLoading(true);
      const { data: response } = await api.get(
        `${apiRouters.SCHEDULE_DETAIL(id)}?current_screen=${ScreenName.MY_TASK}`,
      );
      return response;
    };

    const { mutate: getDataDetailEvent } = useMutation(
      'getDetailEventCalendar',
      handleGetDataDetailEvent,
      {
        onSuccess: async (data) => {
          setOpenCreateEventModal(true);
          setDataEventEditLocal(data);
        },
        onError: (error: AxiosError) => {
          if (error.response?.status === ServerStatusCode.NOT_FOUND) {
            showToast({
              variant: 'error',
              description: ERROR_NOT_FOUND_EVENT,
            });
            handleRemoveEventParam();
          }
        },
        onSettled: () => {
          setIsLoading(false);
        },
      },
    );

    useEffect(() => {
      const root = document.documentElement.style;
      root.setProperty(
        '--current-time-indicator-position',
        isExtendCalendar ? '0px' : '-41px',
      );
      root.setProperty(
        '--current-time-indicator-width',
        isExtendCalendar ? '100%' : '80px',
      );
    }, [isExtendCalendar]);

    useEffect(() => {
      if (idEvent && actionType && typeDetail === ItemStartType.SCHEDULE) {
        getDataDetailEvent(idEvent.replace('event', ''));
      } else {
        setOpenCreateEventModal(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDataDetailEvent, idEvent, actionType]);

    const { creationDataEventCalendar } = useCreationDataEventCalendar({});

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
      params.set('type', ItemStartType.SCHEDULE);

      params.set('action', action);
      router.push(`?${params.toString()}`);
    };

    const handleRemoveEventParam = () => {
      const params = new URLSearchParams(searchParams);
      params.delete('type');
      params.delete('event');
      params.delete('action');
      router.replace(`?${params.toString()}`);
    };

    const handleConfirmEditEventCalendar = (
      data: EventEditFormData,
      sendToChat: boolean,
    ) => {
      const newWorkCategories = [];
      const newTagIds: number[] = [];
      let newType = '';
      let newStartDate = null;
      let newEndDate = null;

      if (data.tagIds) {
        data.tagIds
          .filter((item) => `${item.value}` !== '')
          .map((item) => newTagIds.push(item.value as number));
      }
      if (data.largeCategory && data.largeCategory?.value !== 'undefined') {
        newWorkCategories.push({
          categoryId:
            `${data.largeCategory.value}` == NO_OPTION_CATEGORY
              ? null
              : `${data.largeCategory.value}`,
          type: EventWorkCategory.LARGE,
        });
      }
      if (data.mediumCategory && data.mediumCategory?.value !== 'undefined') {
        newWorkCategories.push({
          categoryId:
            `${data.mediumCategory.value}` == NO_OPTION_CATEGORY
              ? null
              : `${data.mediumCategory.value}`,
          type: EventWorkCategory.MEDIUM,
        });
      }
      if (data.smallCategory && data.smallCategory?.value !== 'undefined') {
        newWorkCategories.push({
          categoryId:
            `${data.smallCategory.value}` == NO_OPTION_CATEGORY
              ? null
              : `${data.smallCategory.value}`,
          type: EventWorkCategory.SMALL,
        });
      }
      if (data.type) {
        newType = (data.type as OptionDropdownType).value as string;
      }
      if (data.startDate) {
        if (data.isAllDay) {
          newStartDate = addTimeToDate(
            data.startDate as Date,
            DEFAULT_START_TIME,
          );
        } else {
          if (data.startTime) {
            newStartDate = addTimeToDate(
              data.startDate as Date,
              data.startTime,
            );
          }
        }
      }
      if (data.endDate) {
        if (data.isAllDay) {
          newEndDate = addTimeToDate(data.endDate as Date, DEFAULT_END_TIME);
        } else {
          if (data.endTime) {
            newEndDate = addTimeToDate(data.endDate as Date, data.endTime);
          }
        }
      }
      setTaskTimeScheduleList((prevEvents) =>
        prevEvents.map((event) => {
          if (event.id === `${data.id}event`) {
            const adjustedEndDate =
              isSameDay(
                new Date(`${newStartDate}`),
                new Date(`${newEndDate}`),
              ) || isMidnight(new Date(`${newEndDate}`))
                ? new Date(`${newEndDate}`)
                : addDays(new Date(`${newEndDate}`), 1);
            return {
              ...event,
              start: new Date(`${newStartDate}`),
              end: adjustedEndDate,
              title: data.title || '',
              startDate: new Date(`${newStartDate}`),
              endDate: new Date(`${newEndDate}`),
            };
          } else {
            return event;
          }
        }),
      );
      setDataEventEdit({
        label: data.title || '',
        value: `${data.id}`,
        type: ItemStartType.SCHEDULE,
      });
      editEventCalendar({
        id: data.id,
        title: data.title || '',
        startDate: newStartDate,
        endDate: newEndDate,
        isAllDay: data.isAllDay || false,
        tagIds: newTagIds,
        participantIds: data.participantIds || [],
        address: data.address || '',
        memo: data.memo || '',
        type: newType,
        sendToChat,
        message: actionsEventMessage,
        categoryIds: newWorkCategories,
        organizationId: data.organization
          ? Number((data.organization as OptionDropdownType).value)
          : null,
      });
    };

    const handleEditEventCalendar = async (data: EventRequest) => {
      return await api.patch(
        apiRouters.SCHEDULE_DETAIL(`${`${data.id}`.replace('event', '')}`),
        data,
      );
    };

    const { mutate: editEventCalendar } = useMutation(
      'editEventCalendar',
      handleEditEventCalendar,
      {
        onSuccess: async ({ data }) => {
          setTaskTimeScheduleList((prevEvents) => {
            const largeColor = data.categories?.find(
              (item: any) => item.type === EventWorkCategory.LARGE,
            )?.color;
            const filteredEvents = prevEvents.filter(
              (event) =>
                event.scheduleId !== data.id &&
                event.resourceId === ItemScheduleType.PLANS,
            );
            const actualDataList = prevEvents
              .filter((event) => event.resourceId === ItemScheduleType.ACTUAL)
              .map((event) => {
                if (event.scheduleId === data.id) {
                  return {
                    ...event,
                    title: data.title,
                    largeColor,
                  };
                }
                return event;
              });

            const splitMultiDayEvent = (event: TaskTimeSchedule) => {
              const startDate = parseISO(String(event.startDate));
              const endDate = parseISO(String(event.endDate));
              if (event.isAllDay)
                return [
                  {
                    ...event,
                    start: new Date(String(event.startDate)),
                    end: new Date(
                      new Date(String(event.endDate)).setHours(24, 0, 0, 0),
                    ),
                    id: `${event.id}event`,
                    uuid: uuidv4(),
                  },
                ];

              if (isSameDay(startDate, endDate)) {
                return [
                  {
                    ...event,
                    start: startDate,
                    end: endDate,
                    id: `${event.id}event`,
                    uuid: uuidv4(),
                  },
                ];
              }

              const days = eachDayOfInterval({
                start: startDate,
                end: endDate,
              });

              return days.map((day, index) => {
                const start = index === 0 ? startDate : startOfDay(day);
                const end = index === days.length - 1 ? endDate : endOfDay(day);

                return {
                  ...event,
                  start,
                  end,
                  id: `${event.id}-split-${index}`,
                  uuid: uuidv4(),
                };
              });
            };

            const newEvents = splitMultiDayEvent({
              ...data,
              largeColor,
              isStart: data.isStart,
              scheduleId: data.id,
              resourceId: ItemScheduleType.PLANS,
              type: ItemStartType.SCHEDULE,
              planStartDate: `${data.startDate}`,
              planEndDate: `${data.endDate}`,
            });

            return [...filteredEvents, ...actualDataList, ...newEvents];
          });

          handleRemoveEventParam();
          setOpenConfirmEditEventModal(false);
          setBackToEditing(false);
          setConfirmEventDataToEdit(undefined);
          setActionsEventMessage('');
          showToast({
            description: SUCCESS_UPDATE_MESSAGE,
          });
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_UPDATE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
          setDataEventEditLocal(undefined);
        },
      },
    );

    const handleConfirmDeleteEventCalendar = (sendToChat: boolean) => {
      if (dataEventEdit) {
        deleteEventCalendar({ id: `${dataEventEdit.id}`, sendToChat });
        return;
      }
    };

    const handleDeleteEventCalendar = async (data: {
      id: string;
      sendToChat: boolean;
    }) => {
      const newId = data.id.replace('event', '');
      return await api.delete(
        `${apiRouters.SCHEDULE_DETAIL(newId)}?message=${actionsEventMessage}${data.sendToChat ? '&send_to_chat=true' : ''}`,
      );
    };
    const { mutate: deleteEventCalendar } = useMutation(
      'deleteEventCalendar',
      handleDeleteEventCalendar,
      {
        onSuccess: (data, task) => {
          handleRemoveEventParam();
          setOpenConfirmDeleteEventModal(false);
          setConfirmEventDataToEdit(undefined);
          setBackToEditing(false);
          setActionsEventMessage('');

          const updatedTaskList = taskTimeScheduleList.filter(
            (item) => item.id !== `${task.id.replace('event', '')}event`,
          );

          const deleteEventList = updatedTaskList.filter(
            (item) => `${item.scheduleId}` !== `${task.id}`,
          );

          setTaskTimeScheduleList(deleteEventList);
          setIdEventDelete(`${task.id}event`);
          showToast({
            description: SUCCESS_DELETE_MESSAGE,
          });
        },
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_DELETE_MESSAGE);
        },
        onSettled: () => {
          setIsLoading(false);
          setDataEventEditLocal(undefined);
        },
      },
    );

    useEffect(() => {
      const element = resizableElementRef.current;
      if (!element) return;

      const throttledUpdateWidth = throttle((newWidth: number) => {
        setWidthCalendar(newWidth);
      }, 100);

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          throttledUpdateWidth(entry.contentRect.width);
        }
      });

      resizeObserver.observe(element);

      return () => {
        resizeObserver.unobserve(element);
        throttledUpdateWidth.cancel();
      };
    }, []);

    const handleDateCheck = () => {
      const inputDate = new Date(
        displayHederDateStart.getFullYear(),
        displayHederDateStart.getMonth(),
        displayHederDateStart.getDate(),
      );
      const now = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const cells = document.querySelectorAll<HTMLElement>(
        '.fc-col-header-cell-cushion',
      );

      cells.forEach((cell) => {
        if (inputDate > now) {
          cell.style.cssText = 'color : #77858f !important';
        } else if (inputDate < now) {
          cell.style.cssText = '';
        } else {
          cell.style.cssText = '';
        }
      });
    };

    useEffect(() => {
      handleDateCheck();
    }, [displayHederDateStart]);

    const filteredEvents = useMemo(() => {
      if (isExtendCalendar) {
        return taskTimeScheduleList.filter((item) => {
          const itemStartDate = new Date(item.start);
          const itemEndDate = new Date(item.end);

          const startDateOnly = new Date(
            itemStartDate.getFullYear(),
            itemStartDate.getMonth(),
            itemStartDate.getDate(),
          );
          const currentDateOnly = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
          );

          if (item.resourceId === ItemScheduleType.PLANS) {
            if (
              item.type === ItemStartType.SCHEDULE &&
              item.isAllDay === true
            ) {
              return itemEndDate >= currentDateOnly;
            }
            return startDateOnly >= currentDateOnly;
          }
          if (item.resourceId === ItemScheduleType.ACTUAL) {
            return itemEndDate < currentDateOnly;
          }
          return true;
        });
      }
      return taskTimeScheduleList;
    }, [isExtendCalendar, taskTimeScheduleList]);

    const scrollToNowIndicator = () => {
      setTimeout(() => {
        const nowIndicator = document.querySelector(
          '.fc-timegrid-now-indicator-arrow',
        );

        if (nowIndicator) {
          nowIndicator.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          window.scrollBy({ top: 800, behavior: 'smooth' });
        }
      }, 500);
    };

    useEffect(() => {
      if (!isLoadingSchedule) {
        scrollToNowIndicator();
      }
    }, []);

    const [calculatedWidth, setCalculatedWidth] = useState(440);
    const [isCurrentWeek, setIsCurrentWeek] = useState(false);
    const handleDatesSet = (info: any) => {
      const currentDate = new Date(info.start);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { start, end } = info;
      if (today >= start && today <= end) {
        setIsCurrentWeek(true);
      } else {
        setIsCurrentWeek(false);
      }

      if (currentDate > today) {
        if (
          currentResources.length !== 1 ||
          currentResources[0].id !== ItemScheduleType.PLANS
        ) {
          setCurrentResources([
            {
              id: ItemScheduleType.PLANS,
              title: ItemScheduleTitleType.PLANS,
            },
          ]);
        }
      } else {
        const shouldUpdateResources =
          currentResources.length !== 2 ||
          currentResources[0].id !== ItemScheduleType.ACTUAL ||
          currentResources[1].id !== ItemScheduleType.PLANS;

        if (shouldUpdateResources) {
          setCurrentResources([
            {
              id: ItemScheduleType.ACTUAL,
              title: ItemScheduleTitleType.ACTUAL,
            },
            {
              id: ItemScheduleType.PLANS,
              title: ItemScheduleTitleType.PLANS,
            },
          ]);
        }
      }
    };

    useEffect(() => {
      const widthByDay: Record<number, number> = {
        1: 1040,
        2: 1040,
        3: 1040,
        4: 848,
        5: 656,
        6: 464,
        0: 272,
      };
      const todayNow = new Date();
      const currentDayNow = todayNow.getDay();
      setCalculatedWidth(widthByDay[currentDayNow] || 1040);
    }, []);
    const [isScroll, setIsScroll] = useState(true);
    const determineWeekState = (date: Date) => {
      const today = new Date();
      const currentWeekStart = new Date(
        today.setDate(today.getDate() - today.getDay()),
      );
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

      const nextWeekStart = new Date(currentWeekEnd);
      nextWeekStart.setDate(currentWeekEnd.getDate() + 1);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

      if (date >= currentWeekStart && date <= currentWeekEnd) {
        return 'currentWeek';
      } else if (date >= nextWeekStart && date <= nextWeekEnd) {
        return 'nextWeek';
      } else if (date < currentWeekStart) {
        return 'pastWeek';
      }
      return 'futureWeek';
    };

    const scrollToDate = useCallback(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (!calendarApi) return;

      const currentDate = calendarApi.getDate();
      const weekState = determineWeekState(new Date(currentDate));

      let selector = '';

      switch (weekState) {
        case 'currentWeek':
          selector = '.schedule-custom .fc-day-today';
          break;
        default:
          selector = '.schedule-custom .fc-day.fc-day-mon.fc-daygrid-day';
          break;
      }

      const tryScroll = (retries = 10) => {
        const target = document.querySelector(selector);
        if (target) {
          setIsScroll(false);
          target.scrollIntoView({
            behavior: 'auto',
            block: 'start',
            inline: 'start',
          });
        } else if (retries > 0) {
          setTimeout(() => tryScroll(retries - 1), 100);
        }
      };

      tryScroll();
    }, []);

    useEffect(() => {
      if (calendarRef.current && isScroll) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.on('datesSet', scrollToDate);
        return () => {
          calendarApi.off('datesSet', scrollToDate);
        };
      }
    }, [isScroll, scrollToDate]);

    // ZOOM IN / ZOOM OUT SCHEDULE
    useEffect(() => {
      const slots = document.querySelectorAll('.fc-timegrid-slot');
      slots.forEach((slot) => {
        const slotElement = slot as HTMLElement;
        slotElement.style.height = `${slotHeight}px`;
        slotElement.style.minHeight = `${slotHeight}px`;
      });

      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        if (calendarApi) {
          calendarApi.updateSize();
        }
      }
    }, [slotHeight, searchParams]);

    const [heightSkeleton, setHeighSkeleton] = useState<number>(4300);

    useEffect(() => {
      const calendarElement = document.querySelector('.fc-media-screen ');
      if (calendarElement && calendarElement instanceof HTMLElement) {
        const calendarHeight = calendarElement.offsetHeight;
        setHeighSkeleton(calendarHeight + 2000);
      }
    }, [slotHeight, isLoadingSchedule, isExtendCalendar, view]);

    const dataDate = getDateInfo(displayHederDateStart);

    const calculateSlotHeight = (value: number): number => {
      if (value < 38) {
        return 93 - (38 - value);
      } else if (value > 58 && value < 80) {
        return 0.732 * value - 8.17;
      } else if (value < 94) {
        return value;
      }
      return 24 + (value - 94);
    };
    const calculateSlotDuration = (value: number): string => {
      if (value < 38) {
        return '01:00:00';
      } else if (value >= 94) {
        return '00:05:00';
      }
      return '00:15:00';
    };
    // Get data zoom
    const { authenticatedUser } = useAuthenticatedUser({
      onSuccess: (data) => {
        if (data.setting?.dateFilterScheduleFrom) {
          if (data.setting?.isShowWeekSchedule) {
            handleViewChangeDefault(CalendarViewOptions.VIEW_BY_WEEK);

            handleChooseDay(new Date(data.setting?.dateFilterScheduleFrom));
          } else {
            handleViewChangeDefault(CalendarViewOptions.VIEW_BY_DAY);
            handleChooseDay(new Date(data.setting?.dateFilterScheduleFrom));
          }
        } else {
          if (data.setting?.isShowWeekSchedule) {
            handleViewChange(CalendarViewOptions.VIEW_BY_WEEK);
          } else {
            handleViewChange(CalendarViewOptions.VIEW_BY_DAY);
          }
        }
      },
    });
    useEffect(() => {
      if (authenticatedUser) {
        const value = authenticatedUser.setting?.scheduleZoom as number;
        setSliderValue(value);
        const calculatedHeight = calculateSlotHeight(value);
        const calculatedDuration = calculateSlotDuration(value);

        setSlotHeight(calculatedHeight);
        setIsOptionZoomSchedule(calculatedDuration);
      }
    }, [authenticatedUser]);

    // Handle save zoom
    const handleSaveZoomSchedule = async (data: {
      scheduleZoom?: number;
      isShowWeekSchedule?: boolean;
      dateFilterScheduleFrom?: string;
    }) => {
      const { data: response } = await api.post(apiRouters.USER_SETTING, {
        ...data,
      });
      return response;
    };

    const { mutate: saveZoomSchedule } = useMutation(
      'saeZoomSchedule',
      handleSaveZoomSchedule,
      {
        onSuccess: () => {},
        onError: (error: AxiosError<any>) => {
          showErrorToast(error, ERROR_SAVE_ZOOM);
        },
        onSettled: () => {},
      },
    );

    useEffect(() => {
      const updateSlotLineColors = () => {
        const slots = document.querySelectorAll(
          '.fc-timegrid-slot.fc-timegrid-slot-lane',
        );

        slots.forEach((slot) => {
          const time = slot.getAttribute('data-time');
          if (time) {
            const [_hour, minute] = time.split(':').map(Number);
            if (minute === 0) {
              slot.classList.add('hour-line');
            } else if (minute === 30) {
              slot.classList.add('half-hour-line');
            }
          }
        });
      };
      // Call the function after FullCalendar renders
      setTimeout(updateSlotLineColors, 100);
    }, [isExtendCalendar]);

    return (
      <>
        <div
          style={{
            width: isExtendCalendar
              ? isCurrentWeek
                ? `${calculatedWidth}px`
                : '1040px'
              : '440px',
            minWidth: isExtendCalendar
              ? isCurrentWeek
                ? `${calculatedWidth}px`
                : '1040px'
              : '440px',
          }}
          className={`${searchParams.get('view') == ViewOptions.DAY && 'w-[440px] '}  schedule-page  relative overflow-x-auto overflow-y-hidden `}
          ref={resizableElementRef}>
          <div
            className={`resizer absolute cursor-ew-resize right-[2px] z-[2] top-1/2 translate-x-1/2 -translate-y-1/2 h-full w-1 bg-transparent ${isExtendCalendar ? 'block' : 'hidden'}`}
            onMouseDown={handleMouseDown}
          />
          <div
            className={` overflow-x-hidden h-full overflow-y-auto flex flex-col gap-8 bg-[#EBF1F7] pt-1 pb-6 pr-4 `}>
            <div className="overflow-y-hidden flex flex-col gap-4 mt-[6px] h-full">
              <div className={`items-center gap-4 flex h-12 sticky z-20`}>
                {!isExtendCalendar ? (
                  <div
                    className={`flex relative ${isLoadingSchedule && '!opacity-45'}`}>
                    <div className="w-[260px] ml-6 z-20 flex gap-[18px] items-center">
                      <DynamicTooltip content="前日" placement="top">
                        <div>
                          <ImageRound
                            onClick={() => {
                              if (!isLoadingSchedule) {
                                debouncedFunction(handlePreviousDay);
                              }
                            }}
                            className=" !w-2 !h-3 cursor-pointer"
                            src="/icons/left-schedule.svg"
                            name="left"
                          />
                        </div>
                      </DynamicTooltip>

                      <div className="flex items-end text-xl gap-1 text-[#5B6770] font-medium">
                        <p>{dataDate.month}月</p>
                        <p>{dataDate.day}日</p>
                        <p className="text-[15px] relative top-[2px]">
                          ({dataDate.dayOfWeek})
                        </p>
                      </div>

                      <DynamicTooltip content="翌日" placement="top">
                        <div>
                          <ImageRound
                            onClick={() => {
                              if (!isLoadingSchedule) {
                                debouncedFunction(handleNextDay);
                              }
                            }}
                            className=" !w-2 !h-3 cursor-pointer"
                            src="/icons/right-schedule.svg"
                            name="right"
                          />
                        </div>
                      </DynamicTooltip>
                    </div>

                    <div className="absolute w-7 z-50 right-[50px] top-[10px] time-schedule">
                      <DatePicker
                        className="h-10 z-50 "
                        isShowInput={false}
                        selected={displayHederDateStart}
                        tooltipMsg="カレンダーから日付を選択"
                        iconClassName="!static !w-8"
                        disabled={isLoadingSchedule}
                        onChange={(e) => {
                          if (!isLoadingSchedule) {
                            handleChooseDay(e as Date);
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center ml-8 gap-3 ${isLoadingSchedule && '!opacity-45'}`}>
                      <DynamicTooltip content="前日" placement="top">
                        <div>
                          <ImageRound
                            src="/icons/chevron-left-calendar.svg"
                            name="Previous day"
                            className="!w-[6px] !h-3  hover:cursor-pointer"
                            onClick={() => {
                              if (!isLoadingSchedule) {
                                handlePreviousDay();
                              }
                            }}
                          />
                        </div>
                      </DynamicTooltip>
                      <DynamicTooltip content="翌日" placement="top">
                        <div>
                          <ImageRound
                            src="/icons/chevron-left-calendar.svg"
                            name="Next day"
                            className="!w-[6px] !h-3 rotate-180 hover:cursor-pointer"
                            onClick={() => {
                              if (!isLoadingSchedule) {
                                handleNextDay();
                              }
                            }}
                          />
                        </div>
                      </DynamicTooltip>
                    </div>
                    <Heading as="h4" className="text-sm font-medium">
                      {isExtendCalendar
                        ? `${formattedStartDate} - ${formattedEndDate}`
                        : formattedCurrentDate}
                    </Heading>
                    {isToday && !isExtendCalendar && (
                      <div className="bg-primary -ml-[10px] px-1 py-[2px] rounded-md text-xs text-white font-medium">
                        今日
                      </div>
                    )}
                  </>
                )}
              </div>
              <div
                className={`schedule-custom relative h-[calc(100vh_-_184px)]  w-full overflow-y-scroll  `}>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[
                    resourceTimeGridPlugin,
                    interactionPlugin,
                    resourcePlugin,
                    timeGridPlugin,
                    dayGridPlugin,
                    scrollGridPlugin,
                  ]}
                  views={{
                    timeGridWeek: {
                      dayMinWidth: 192,
                      dayMaxWidth: 192,
                    },
                  }}
                  scrollTimeReset={false}
                  height="auto"
                  editable={
                    session?.user.permissions &&
                    hasPermissionInArray(
                      session?.user.permissions,
                      PermissionsSystem.MY_TASK_UPDATE,
                    )
                  }
                  eventResizableFromStart={true}
                  firstDay={1}
                  droppable={true}
                  resources={currentResources}
                  datesSet={handleDatesSet}
                  events={modifyEvents(filteredEvents)}
                  headerToolbar={false}
                  nowIndicator={true}
                  initialView={
                    searchParams.get('view') == ViewOptions.WEEK
                      ? CalendarViewOptions.VIEW_BY_WEEK
                      : CalendarViewOptions.VIEW_BY_DAY
                  }
                  datesAboveResources={true}
                  slotLabelFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    omitZeroMinute: false,
                    hour12: false,
                  }}
                  slotDuration={isOptionZoomSchedule}
                  initialDate={new Date()}
                  eventDragStart={() => setIsInteracting(true)}
                  eventDrop={handleEventDrop}
                  eventContent={handleRenderEvent}
                  eventReceive={handleEventReceive}
                  eventResizeStart={() => setIsInteracting(true)}
                  eventResize={handleEventResize}
                  eventAllow={handleEventAllow}
                  eventDidMount={(info) => {
                    const resourceId = info.event.getResources()?.[0]?.id;
                    if (resourceId === ItemScheduleType.PLANS) {
                      info.el.style.left = '6px';
                    }
                    if (
                      info.event &&
                      info.event.extendedProps &&
                      info.event.extendedProps.type ===
                        EventCalendarType.SCHEDULE
                    ) {
                      info.event.setProp('editable', false);
                      info.event.setProp('startEditable', false);
                      info.event.setProp('durationEditable', false);
                      info.event.setProp('resizableFromStart', false);
                    }
                    const resizer = info.el.querySelector(
                      '.fc-event-resizer-end',
                    ) as HTMLElement;
                    if (!resizer) return;

                    resizer.style.display = 'none';

                    info.el.addEventListener('mousemove', (e) => {
                      const rect = info.el.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top;
                      const height = rect.height;

                      if (offsetY > height - 30) {
                        resizer.style.display = 'block';
                      } else {
                        resizer.style.display = 'none';
                      }
                    });

                    info.el.addEventListener('mouseleave', () => {
                      resizer.style.display = 'none';
                    });
                  }}
                  eventDragStop={handleEventDragStop}
                  // TODO: Update hover event
                  // eventClick={handleEventClick}
                  eventOverlap={true}
                  slotEventOverlap={true}
                  selectMirror={true}
                  locales={[jaLocale]}
                  locale="ja"
                  dayHeaderContent={(arg) => {
                    const date = new Date(arg.date);
                    let day = date.getDate().toString();
                    if (day.length === 1) {
                      day = '0' + day;
                    }
                    const weekday = date.toLocaleDateString('ja-JP', {
                      weekday: 'short',
                    });
                    return (
                      <span className="fc-day-header">{`${day}(${weekday})`}</span>
                    );
                  }}
                />
                {isLoadingSchedule && (
                  <div className="absolute top-0 left-0 z-10 w-full">
                    <ScheduleDaySkeleton
                      height={heightSkeleton}
                      numberOfResources={2}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          {!isLoadingSchedule && (
            <div
              className={`w-[180px] px-3 z-20 h-[38px] absolute  rounded-md ${isExtendCalendar ? 'right-32 bottom-[13px]' : 'right-[10px] bottom-[5px]'} bg-white flex items-center `}>
              <RangeSlider
                min={18}
                max={100}
                initialValue={sliderValue}
                resetTrigger={resetTrigger}
                onChange={(value) => {
                  setSliderValue(value);

                  const calculatedHeight = calculateSlotHeight(value);
                  const calculatedDuration = calculateSlotDuration(value);
                  setSlotHeight(calculatedHeight);
                  setIsOptionZoomSchedule(calculatedDuration);
                  if (sliderValue !== value) {
                    saveZoomSchedule({
                      scheduleZoom: value,
                    });
                  }
                }}
              />
            </div>
          )}
          <div
            className={`${isLoadingSchedule && 'opacity-50'} p-2 h-[30px] w-[30px] z-[20] flex items-center justify-center bg-white absolute right-6 top-5 rounded-full hover:cursor-pointer `}
            onClick={() => {
              if (isLoadingSchedule) return;
              if (!isExtendCalendar) {
                setIsScroll(true);
                handleViewChange(CalendarViewOptions.VIEW_BY_WEEK);
              } else {
                if (calendarRef.current) {
                  const calendarApi = calendarRef.current.getApi();
                  calendarApi.gotoDate(new Date());
                  setIsScroll(true);
                  handleViewChange(CalendarViewOptions.VIEW_BY_DAY);
                }
              }
              setIsExtendCalendar(!isExtendCalendar);
            }}>
            <DynamicTooltip
              content={
                isExtendCalendar
                  ? 'スケジュールを日表示'
                  : 'スケジュールを週表示'
              }
              placement="top">
              <ImageRound
                src="/icons/extend-calendar.svg"
                name="Extend calendar"
                className={`!w-2.5 !h-2.5 min-w-3 ${isExtendCalendar ? 'rotate-180' : ''}`}
              />
            </DynamicTooltip>
          </div>
        </div>
        {openCreateEventModal && (
          <ActionsEventModal
            open={openCreateEventModal}
            dataEvent={dataEventEdit}
            action={ActionsEvent.EDIT}
            onClose={() => {
              handleRemoveEventParam();
              setDataEventEditLocal(undefined);
              setOpenCreateEventModal(false);
              setBackToEditing(false);
            }}
            onEdit={(data) => {
              setConfirmEventDataToEdit(data);
              setOpenCreateEventModal(false);
              setOpenConfirmEditEventModal(true);
            }}
            onDelete={(data) => {
              setConfirmEventDataToEdit(data);
              setOpenCreateEventModal(false);
              setOpenConfirmDeleteEventModal(true);
            }}
            creationDataEventCalendar={creationDataEventCalendar}
            backToEditing={backToEditing}
          />
        )}
        {openConfirmEditEventModal && (
          <ConfirmActionsEventModal
            open={openConfirmEditEventModal}
            type={ActionsEvent.EDIT}
            setActionsEventMessage={setActionsEventMessage}
            onSend={() => {
              setIsLoading(true);
              handleConfirmEditEventCalendar(
                confirmEventDataToEdit as EventEditFormData,
                true,
              );
            }}
            onRejectSend={() => {
              setIsLoading(true);
              handleConfirmEditEventCalendar(
                confirmEventDataToEdit as EventEditFormData,
                false,
              );
            }}
            onClose={() => {
              handleRemoveEventParam();
              setDataEventEditLocal(undefined);
              setConfirmEventDataToEdit(undefined);
              setOpenConfirmEditEventModal(false);
              setBackToEditing(false);
              setActionsEventMessage('');
            }}
            onBackToEditModal={() => {
              setOpenCreateEventModal(true);
              setOpenConfirmEditEventModal(false);
              setDataEventEditLocal(confirmEventDataToEdit);
              setBackToEditing(true);
              setActionsEventMessage('');
            }}
          />
        )}
        {openConfirmDeleteEventModal && (
          <ConfirmActionsEventModal
            open={openConfirmDeleteEventModal}
            type={ActionsEvent.DELETE}
            setActionsEventMessage={setActionsEventMessage}
            onSend={() => {
              setIsLoading(true);
              handleConfirmDeleteEventCalendar(true);
            }}
            onRejectSend={() => {
              setIsLoading(true);
              handleConfirmDeleteEventCalendar(false);
            }}
            onClose={() => {
              handleRemoveEventParam();
              setDataEventEditLocal(undefined);
              setConfirmEventDataToEdit(undefined);
              setOpenConfirmDeleteEventModal(false);
              setBackToEditing(false);
              setActionsEventMessage('');
            }}
            onBackToEditModal={() => {
              router.push(
                `${pageRouters.CALENDAR_MANAGEMENT.href}?event=${`${idBackToEvent}`.replace('event', '')}&type=${ItemStartType.SCHEDULE}&action=${ActionsEvent.EDIT}`,
              );
            }}
          />
        )}
        {popoverInfo && (
          <DetailPlanItemModal
            popoverInfo={popoverInfo}
            isStart={isStartPopupDetail}
            setIsStartPopupDetail={setIsStartPopupDetail}
            popoverRef={popoverRef}
            copyPlanTime={(uuid: string) => copyPlanTime(uuid)}
            deletePlanTask={(uuid: string) => {
              // DELETE plan task
              const newDataTimeList = taskTimeScheduleList.filter(
                (item) => item.uuid !== uuid,
              );
              deletePlanTask(uuid);
              setTaskTimeScheduleList(newDataTimeList);
              const hasMatchingItem = newDataTimeList.some(
                (item) =>
                  item.taskId === popoverInfo.taskId &&
                  item.resourceId === ItemScheduleType.PLANS &&
                  item.start &&
                  isTodaySchedule(item.start),
              );
              if (!hasMatchingItem) {
                handleEditShowClockItem(
                  parseInt(popoverInfo.taskId as string),
                  false,
                );
              }
              setPopoverInfo(null);
              showToast({
                description: SUCCESS_DELETE_MESSAGE,
              });
            }}
            deleteActualTask={(uuid: string) => deleteActualTask(uuid)}
            onClose={() => setPopoverInfo(null)}
            handleUpdateItemStart={handleUpdateItemStart}
          />
        )}
        {EventInfo && (
          <DetailEventPlanModal
            isStart={false}
            popoverRef={popoverRef}
            dataEvent={EventInfo}
            onClose={() => setEventInfo(null)}
            onDelete={(data) => {
              setDataEventEditLocal(data);
              setConfirmEventDataToEdit(data);
              setOpenCreateEventModal(false);
              setOpenConfirmDeleteEventModal(true);
            }}
          />
        )}
      </>
    );
  },
);

export default TimeSchedule;
