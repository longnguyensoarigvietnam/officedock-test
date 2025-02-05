'use client';

import { useEffect, useRef, useState, Fragment, useContext } from 'react';
import { AxiosError } from 'axios';
import { debounce } from 'lodash';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import resourcePlugin from '@fullcalendar/resource';
import scrollgridPlugin from '@fullcalendar/scrollgrid';
import './styles/calendar.css';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import InputSearch from '@components/common/InputSearch';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import ActionsTaskModal from '@components/modals/ActionsTaskModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import DatePicker from '@components/common/DatePicker';
import CalendarSkeleton from '@components/skeleton/CalendarSkeleton';
import WarningCloseTaskModal from '@components/modals/WarningCloseTaskModal';
import EventInfoModal from '@components/modals/EventInfoModal';
import TaskInfoModal from '@components/modals/TaskInfoModal';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Button from '@components/common/Button';
import Spinner from '@components/common/Spinner';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { CalendarSidebar } from '@components/calendar/Sidebar';

import { useErrorToast } from '@hooks/useErrorToast';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useCreationDataTask from '@hooks/useCreationDataTask';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import {
  adjustPositionForViewport,
  getRandomColor,
  hasPermissionInArray,
} from '@utils';
import {
  addTimeToDate,
  formatQueryEndDateForCalendar,
  formatQueryStartDateForCalendar,
  getDateInfo,
  getJapaneseDayName,
  getTimeRangeForClickDate,
  isMidnight,
  isMoreThanSixtyMinutes,
  removeTimeAndCompareDates,
  subtractOneDay,
} from '@utils/date';
import {
  CalendarDashboardMember,
  CalendarPopoverInfo,
  EventCalendarDayRange,
  EventCalendarDetail,
  EventCalendarProps,
  EventEditFormData,
  EventFormData,
  EventParticipant,
  EventRequest,
  TaskCalendarProps,
} from '@interfaces/calendar';
import {
  peopleInChargeType,
  Task,
  TaskFormData,
  TaskRequest,
} from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import { PeopleInCharge } from '@interfaces/tag';
import { User } from '@interfaces/user';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { TaskContext } from '@providers/TaskProvider';

import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_NOT_FOUND_EVENT,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters } from '@constants/routers';
import {
  ActionsEvent,
  CalendarViewOptions,
  CurrentScreen,
  EventCalendarType,
  EventWorkCategory,
  PermissionsSystem,
  ScreenName,
  ServerStatusCode,
  ViewOptions,
} from '@constants/enums';
import {
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  NO_OPTION_CATEGORY,
} from '@constants';
import api from '@base/api';

const EventCalendar = () => {
  const calendarRef = useRef<FullCalendar | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [openCreateEventModal, setOpenCreateEventModal] =
    useState<boolean>(false);
  const [currentRange, setCurrentRange] = useState<EventCalendarDayRange>({
    start: '',
    end: '',
  });
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventCalendarDetail[]>([]);
  const [filterMyTask, setFilterMyTask] = useState(false);
  const [filterMyEvent, setFilterMyEvent] = useState(false);
  const [selectedScheduleUserIds, setSelectedScheduleUserIds] =
    useState<string>('');
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [openConfirmCreateEventModal, setOpenConfirmCreateEventModal] =
    useState(false);
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteTaskModal, setOpenConfirmDeleteTaskModal] =
    useState(false);
  const [confirmEventDataToCreate, setConfirmEventDataToCreate] =
    useState<EventFormData>();
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [backToEditing, setBackToEditing] = useState(false);
  const [dataEventEdit, setDataEventEdit] = useState<EventEditFormData>();
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);
  const [selectedTaskScheduleId, setSelectedTaskScheduleId] =
    useState<string>();
  const [actionEventClick, setActionEventClick] = useState<string>(
    ActionsEvent.CREATE,
  );
  const [searchName, setSearchName] = useState<string>('');
  const [removeMyselfOption, setRemoveMyselfOption] = useState(false);
  const [displayYear, setDisplayYear] = useState<number>();
  const [displayMonth, setDisplayMonth] = useState<number>();
  const [displayDay, setDisplayDay] = useState<number>();
  const [showSidebar, setShowSidebar] = useState(false);
  const { creationDataEventCalendar } = useCreationDataEventCalendar({});
  const { creationDataTaskData } = useCreationDataTask({});
  const { dashboardMemberList } = useDashboardMemberList();
  const [authenticatedUser, setAuthenticatedUser] = useState<User>();
  const { showToast } = useToast();
  const { setIsLoading } = useContext(LoadingContext);
  const { showEditTaskModal, setShowEditTaskModal } = useContext(TaskContext);
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();
  const actionType = searchParams.get('action');
  const eventIdURL = searchParams.get('event');
  const eventDetailId = eventIdURL?.replace('event', '');
  const taskDetailId = searchParams.get('task');
  const containerRef = useRef(null);
  const [popoverInfo, setPopoverInfo] = useState<CalendarPopoverInfo | null>(
    null,
  );
  const [openEventInfoModal, setOpenEventInfoModal] = useState<boolean>(false);
  const [openTaskInfoModal, setOpenTaskInfoModal] = useState<boolean>(false);

  const [dashboardMembers, setDashboardMembers] = useState<
    CalendarDashboardMember[]
  >([]);
  const [infoModalPosition, setInfoModalPosition] = useState<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });
  const [currentResources, setCurrentResources] = useState<
    {
      id: string;
      title: string;
    }[]
  >([]);
  const [calendarLoading, setIsCalendarLoading] = useState(false);
  const [isEventRendering, setIsEventRendering] = useState(false);
  const [defaultCreateStartDate, setDefaultCreateStartDate] = useState<
    Date | undefined
  >();
  const [popoverInfoLoading, setPopoverInfoLoading] = useState<boolean>(false);
  const showErrorToast = useErrorToast();
  const [openWarningCloseModal, setOpenWarningCloseModal] =
    useState<boolean>(false);
  const [resetFunctions, setResetFunctions] = useState<{
    resetDataCategoryOptions?: () => void;
    reset?: () => void;
  }>({});

  const debouncedFetchCalendarData = useRef(
    debounce(
      async (
        startDate,
        endDate,
        filterMyTask,
        filterMyEvent,
        selectedScheduleUserIds,
        date?: Date,
        clientX?: number,
        clientY?: number,
        isYearView?: boolean,
      ) => {
        const updatedUserIds: string[] = selectedScheduleUserIds
          ? selectedScheduleUserIds.split(',').filter(Boolean)
          : [];
        updatedUserIds.push(`${session?.user.id}`);

        const params: any = {
          userId: `${session?.user.id}`,
          startDate,
          endDate,
        };
        await getEventCalendarByUsers({
          userId: filterMyEvent
            ? updatedUserIds.join(',')
            : selectedScheduleUserIds,
          startDate,
          endDate,
          filterMyTask,
          isYearView,
          date,
          clientX,
          clientY,
        });
        if (filterMyTask) {
          if (date) params.date = date;
          if (clientX !== undefined) params.clientX = clientX;
          if (clientY !== undefined) params.clientY = clientY;
          if (isYearView !== undefined) params.isYearView = isYearView;

          await getMyTaskCalendar(params);
        } else {
          setPopoverInfoLoading(false);
        }
        setIsEventRendering(false);
      },
      1000,
    ),
  ).current;

  const handlePrev = () => {
    if (calendarRef.current) {
      setIsEventRendering(true);
      setEvents([]);
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.prev();

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      debouncedFetchCalendarData(
        startDateISOString,
        endDateISOString,
        filterMyTask,
        filterMyEvent,
        selectedScheduleUserIds,
      );
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      setIsEventRendering(true);
      setEvents([]);
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.next();

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      debouncedFetchCalendarData(
        startDateISOString,
        endDateISOString,
        filterMyTask,
        filterMyEvent,
        selectedScheduleUserIds,
      );
    }
  };

  const handleNavigateToTodayView = () => {
    if (calendarRef.current) {
      setIsEventRendering(true);
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.gotoDate(new Date());

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      debouncedFetchCalendarData(
        startDateISOString,
        endDateISOString,
        filterMyTask,
        filterMyEvent,
        selectedScheduleUserIds,
      );
    }
  };

  const handleNavigateToSpecificDay = (date: Date) => {
    if (calendarRef.current) {
      setIsEventRendering(true);
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.gotoDate(date);

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      debouncedFetchCalendarData(
        startDateISOString,
        endDateISOString,
        filterMyTask,
        filterMyEvent,
        selectedScheduleUserIds,
      );
    }
  };

  const handleShowEventsInYearView = (
    date: Date,
    clientX: number,
    clientY: number,
  ) => {
    if (calendarRef.current) {
      const startDateISOString = formatQueryStartDateForCalendar(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDateISOString = formatQueryEndDateForCalendar(nextDay);
      setPopoverInfoLoading(true);
      setPopoverInfo({
        date: date as Date,
        events: [],
        left: adjustPositionForViewport(
          {
            top: Number(clientY),
            left: Number(clientX),
          },
          0,
        ).left,
        top: adjustPositionForViewport(
          {
            top: Number(clientY),
            left: Number(clientX),
          },
          0,
        ).top,
      });
      setInfoModalPosition({
        left: adjustPositionForViewport(
          {
            top: Number(clientY),
            left: Number(clientX),
          },
          3,
        ).left,
        top: adjustPositionForViewport(
          {
            top: Number(clientY),
            left: Number(clientX),
          },
          3,
        ).top,
      });

      debouncedFetchCalendarData(
        startDateISOString,
        endDateISOString,
        filterMyTask,
        filterMyEvent,
        selectedScheduleUserIds,
        date,
        clientX,
        clientY,
        true,
      );
    }
  };

  const handleViewChange = async (
    calendarView: string,
    initialFilterMyTask?: boolean,
    initialFilterMyEvent?: boolean,
  ) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarView === CalendarViewOptions.VIEW_BY_WEEK) {
        params.set('view', ViewOptions.WEEK);
      } else if (calendarView === CalendarViewOptions.VIEW_BY_YEAR) {
        params.set('view', ViewOptions.YEAR);
      } else if (calendarView === CalendarViewOptions.VIEW_BY_DAY) {
        params.set('view', ViewOptions.DAY);
      } else {
        params.set('view', ViewOptions.MONTH);
      }
      router.push(`?${params.toString()}`);
      calendarApi.changeView(calendarView);
      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      calendarRef.current?.getApi().refetchEvents();
      const apiCalls: Promise<any>[] = [];

      if (calendarView !== CalendarViewOptions.VIEW_BY_YEAR) {
        if (initialFilterMyEvent !== undefined) {
          if (initialFilterMyEvent == true) {
            apiCalls.push(
              getEventCalendarByUsers({
                userId: String(session?.user.id),
                startDate: startDateISOString,
                endDate: endDateISOString,
              }),
            );
          }
        }

        if (initialFilterMyTask !== undefined) {
          if (initialFilterMyTask == true) {
            apiCalls.push(
              getMyTaskCalendar({
                userId: `${session?.user.id}`,
                startDate: startDateISOString,
                endDate: endDateISOString,
              }),
            );
          }
        }

        if (
          initialFilterMyEvent == undefined &&
          initialFilterMyTask == undefined
        ) {
          if (filterMyEvent) {
            const updatedUserIds: string[] = selectedScheduleUserIds
              ? selectedScheduleUserIds.split(',').filter(Boolean)
              : [];

            updatedUserIds.push(`${session?.user.id}`);
            apiCalls.push(
              getEventCalendarByUsers({
                userId: updatedUserIds.join(','),
                startDate: startDateISOString,
                endDate: endDateISOString,
              }),
            );
          } else {
            apiCalls.push(
              getEventCalendarByUsers({
                userId: selectedScheduleUserIds,
                startDate: startDateISOString,
                endDate: endDateISOString,
              }),
            );
          }
          if (filterMyTask) {
            apiCalls.push(
              getMyTaskCalendar({
                userId: `${session?.user.id}`,
                startDate: startDateISOString,
                endDate: endDateISOString,
              }),
            );
          }
        }
      }

      await Promise.all(apiCalls);

      setIsEventRendering(false);
    }
  };

  const handleGetAuthenticatedUser = async () => {
    setIsEventRendering(true);
    const apiUrl = apiRouters.AUTHENTICATED_USER;

    const { data } = await api.get<User>(apiUrl);
    return data;
  };

  const { mutate: getAuthenticatedUser } = useMutation(
    'getAuthenticatedUser',
    handleGetAuthenticatedUser,
    {
      onSuccess: (data) => {
        setAuthenticatedUser(data);
      },
    },
  );

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }
    if (calendarRef.current === null) {
      return;
    }
    const calendarApi = calendarRef.current.getApi();

    const resizeObserver = new ResizeObserver(() => calendarApi.updateSize());
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [calendarRef, containerRef]);

  useEffect(() => {
    if (dashboardMemberList?.length) {
      const membersWithAvatars = dashboardMemberList.map((member) => {
        return {
          id: member.id,
          fullName: member.fullName,
          avatarColor: getRandomColor(),
        };
      });
      setDashboardMembers(membersWithAvatars);
    }
  }, [dashboardMemberList]);

  const checkShowUserAvatar = (
    type?: EventCalendarType,
    participants?: EventParticipant[],
  ) => {
    const filteredUserIds = selectedScheduleUserIds
      .split(',')
      .map((num) => num.trim())
      .filter(Boolean)
      .filter((num) => num != String(session?.user.id));
    if (type == EventCalendarType.TASK) {
      return filterMyTask && filteredUserIds.length > 0;
    } else {
      return (
        filteredUserIds.length > 0 &&
        participants &&
        participants.length > 0 &&
        participants.find((participant: EventParticipant) =>
          `${selectedScheduleUserIds},${session?.user.id}`.includes(
            `${participant.id}`,
          ),
        )
      );
    }
  };

  const handleEventContent = (eventContent: any) => {
    if (eventContent.event.id.startsWith('loading')) {
      return <RowSkeleton className="w-full h-[31px] mb-1" />;
    } else {
      const calendarApi = eventContent.view.calendar;
      const currentView = calendarApi.view.type;
      let avatarColor = '';
      if (eventContent.event.extendedProps.participants.length > 0) {
        if (eventContent.event.extendedProps.type == EventCalendarType.TASK) {
          avatarColor =
            dashboardMembers.find((member) => member.id == session?.user.id)
              ?.avatarColor || '';
        } else {
          const updatedUserIds: string[] = selectedScheduleUserIds
            ? selectedScheduleUserIds.split(',').filter(Boolean)
            : [];
          if (
            filterMyEvent &&
            !updatedUserIds.find(
              (userId) => String(userId) == String(session?.user.id),
            )
          ) {
            updatedUserIds.push(String(session?.user.id));
          }
          if (
            eventContent.event.extendedProps.participants.find(
              (participant: EventParticipant) =>
                participant.id == session?.user.id,
            ) &&
            updatedUserIds.includes(`${session?.user.id}`)
          ) {
            avatarColor =
              dashboardMembers.find((member) => member.id == session?.user.id)
                ?.avatarColor || '';
          } else {
            const participantList =
              eventContent.event.extendedProps.participants
                .filter((participant: EventParticipant) =>
                  updatedUserIds.find((userId) => userId == participant.id),
                )
                .sort((prev: EventParticipant, next: EventParticipant) =>
                  prev.fullName.localeCompare(next.fullName),
                )
                .map((participant: EventParticipant) => {
                  return {
                    id: participant.id,
                    fullName: participant.fullName,
                    avatarColor: dashboardMembers.find(
                      (member) => member.id == participant.id,
                    )?.avatarColor,
                  };
                });
            if (participantList && participantList.length > 0) {
              avatarColor = participantList[0].avatarColor || '';
            } else {
              avatarColor = '';
            }
          }
        }
      }

      if (currentView === CalendarViewOptions.VIEW_BY_WEEK) {
        if (eventContent.event.allDay) {
          return (
            <div className="mb-1">
              <div
                className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? 'bg-[#0068b7] text-white' : 'text-black bg-white'} overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}>
                {checkShowUserAvatar(
                  eventContent.event.extendedProps.type,
                  eventContent.event.extendedProps.participants,
                ) ? (
                  <div className="flex items-center">
                    <div className="h-6">
                      {AvatarIconWithDynamicColor({
                        color: avatarColor || '',
                        size: 27,
                      })}
                    </div>
                    <p className="truncate max-w-[100%] mt-0.5 pt-0.5 h-[25px]">
                      {eventContent.event.title !== 'null'
                        ? eventContent.event.title
                        : ''}
                    </p>
                  </div>
                ) : (
                  <p className="truncate max-w-[100%] mt-0.5 pt-0.5 h-[25px]">
                    {eventContent.event.title !== 'null'
                      ? eventContent.event.title
                      : ''}
                  </p>
                )}
              </div>
            </div>
          );
        }
        return (
          <div
            className={`relative ${
              checkShowUserAvatar(
                eventContent.event.extendedProps.type,
                eventContent.event.extendedProps.participants,
              ) && 'pl-8'
            } `}>
            <div className="overflow-hidden">
              <div
                className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? '' : 'text-black'} text-[14px] font-medium px-1 pt-1`}>
                <p className="truncate max-w-[calc(100%)] min-h-5">
                  {eventContent.event.title != 'null'
                    ? eventContent.event.title
                    : ''}
                </p>
              </div>
              <div
                className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? '' : 'text-black'} text-[12px] font-normal px-1`}>
                {isMoreThanSixtyMinutes(eventContent.timeText) && (
                  <p className="truncate max-w-[calc(100%)] min-h-5">
                    {eventContent.timeText}
                  </p>
                )}
              </div>
            </div>
            {checkShowUserAvatar(
              eventContent.event.extendedProps.type,
              eventContent.event.extendedProps.participants,
            ) && (
              <div className="absolute top-[-10px] left-[-8px] ">
                <div className="relative">
                  {AvatarIconWithDynamicColor({
                    color: avatarColor || '',
                    size: 36,
                  })}
                  <p className="rounded-full w-4 h-4 bg-error text-[10px] text-center text-white leading-4 absolute bottom-[0px] right-[0px]">
                    {eventContent.event.extendedProps.participants &&
                      eventContent.event.extendedProps.participants.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      } else if (currentView === CalendarViewOptions.VIEW_BY_DAY) {
        if (eventContent.event.allDay) {
          return (
            <div className="mb-1">
              <div
                className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? 'bg-[#0068b7]' : 'text-black bg-white'} overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}>
                <p className="truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px]">
                  {eventContent.event.title !== 'null'
                    ? eventContent.event.title
                    : ''}
                </p>
              </div>{' '}
            </div>
          );
        }
        return (
          <div className="overflow-hidden">
            <div
              className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? '' : 'text-black'} font-medium px-1 pt-1 text-[14px]`}>
              <p className="truncate max-w-[calc(100%)] min-h-5">
                {eventContent.event.title != 'null'
                  ? eventContent.event.title
                  : ''}
              </p>
            </div>{' '}
            <div
              className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? '' : 'text-black'} font-normal px-1 text-[12px]`}>
              {isMoreThanSixtyMinutes(eventContent.timeText) &&
                eventContent.timeText}
            </div>{' '}
          </div>
        );
      } else if (currentView === CalendarViewOptions.VIEW_BY_MONTH) {
        if (eventContent.event.allDay) {
          return (
            <div className="fc-daygrid-event mb-1">
              <div
                className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? 'bg-[#0068b7] text-white' : 'text-black bg-white'} overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}>
                {checkShowUserAvatar(
                  eventContent.event.extendedProps.type,
                  eventContent.event.extendedProps.participants,
                ) ? (
                  <div className="flex items-center">
                    <div className="h-6">
                      {AvatarIconWithDynamicColor({
                        color: avatarColor || '',
                        size: 27,
                      })}
                    </div>
                    <p className="truncate max-w-[100%] mt-0.5 pt-0.5 h-[25px]">
                      {eventContent.event.title !== 'null'
                        ? eventContent.event.title
                        : ''}
                    </p>
                  </div>
                ) : (
                  <p className="truncate max-w-[100%] mt-0.5 pt-0.5 h-[25px]">
                    {eventContent.event.title !== 'null'
                      ? eventContent.event.title
                      : ''}
                  </p>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="rounded-sm hover:cursor-pointer mb-1 overflow-hidden">
            <div className="flex items-center gap-1">
              <div
                className={`${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? '' : 'text-black py-0.5'} flex items-center gap-1 font-normal text-[12px]`}>
                <div
                  className={`notification-dot ${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? 'bg-[#0068b7]' : 'bg-[#9fa1a2]'} !w-2 !h-2 ml-1 rounded-full`}
                />
                <p>{eventContent.timeText}</p>
              </div>{' '}
              <p
                className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] ${eventContent.event.extendedProps.type == EventCalendarType.SCHEDULE ? 'hover:!bg-transparent' : 'text-black'} font-semibold px-1 text-[12px]`}>
                {eventContent.event.title != 'null'
                  ? eventContent.event.title
                  : ''}
              </p>
            </div>
          </div>
        );
      }
    }
  };

  const handleMoreLinkClick = (clickInfo: any) => {
    const clickInfoEvents = clickInfo.allSegs.map((seg: any) => {
      return seg.event.id;
    });
    if (events) {
      const filterEvents: any[] = [];
      events
        .filter((event) => clickInfoEvents.includes(event.id))
        .forEach((event) => {
          if (event.end) {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const clickDate = new Date(clickInfo.date);

            const isDifferentDate =
              eventStart.toDateString() !== eventEnd.toDateString();
            const isEndNotMidnight =
              eventEnd.getHours() !== 0 ||
              eventEnd.getMinutes() !== 0 ||
              eventEnd.getSeconds() !== 0;
            const adjustedEnd =
              isDifferentDate && isEndNotMidnight
                ? subtractOneDay(event.end)
                : event.end;

            if (
              removeTimeAndCompareDates(
                eventStart.toLocaleString(),
                new Date(adjustedEnd).toLocaleString(),
                clickDate.toLocaleString(),
              )
            ) {
              if (
                searchParams.get('view') == ViewOptions.WEEK ||
                searchParams.get('view') == ViewOptions.DAY
              ) {
                if (event.allDay) {
                  filterEvents.push({
                    id: `${event.id}`,
                    taskId:
                      event.type == EventCalendarType.TASK
                        ? `${event.taskId}`
                        : '',
                    title: event.title,
                    start: eventStart.toLocaleString(),
                    end: new Date(adjustedEnd).toLocaleString(),
                    type: event.type,
                    participants: event.participants || [],
                  });
                }
              } else {
                filterEvents.push({
                  id: `${event.id}`,
                  taskId:
                    event.type == EventCalendarType.TASK
                      ? `${event.taskId}`
                      : '',
                  title: event.title,
                  start: eventStart.toLocaleString(),
                  end: new Date(adjustedEnd).toLocaleString(),
                  type: event.type,
                  participants: event.participants || [],
                });
              }
            }
          }
        });
      setPopoverInfo({
        date: clickInfo.date,
        events: filterEvents,
        left: adjustPositionForViewport(
          {
            top: clickInfo.jsEvent.clientY,
            left: clickInfo.jsEvent.clientX,
          },
          filterEvents.length,
        ).left,
        top: adjustPositionForViewport(
          {
            top: clickInfo.jsEvent.clientY,
            left: clickInfo.jsEvent.clientX,
          },
          filterEvents.length,
        ).top,
      });
      setInfoModalPosition({
        left: adjustPositionForViewport(
          {
            top: clickInfo.jsEvent.clientY,
            left: clickInfo.jsEvent.clientX,
          },
          3,
        ).left,
        top: adjustPositionForViewport(
          {
            top: clickInfo.jsEvent.clientY,
            left: clickInfo.jsEvent.clientX,
          },
          3,
        ).top,
      });
    }
    clickInfo.jsEvent.preventDefault();
  };

  const handlePopoverClose = () => {
    setPopoverInfo(null);
  };

  useEffect(() => {
    getAuthenticatedUser && getAuthenticatedUser();
  }, [getAuthenticatedUser]);

  useEffect(() => {
    let initialFilterMyTask = false;
    let initialFilterMyEvent = false;
    if (authenticatedUser) {
      initialFilterMyTask = authenticatedUser.setting?.isCheckSelfTask
        ? true
        : false;
      initialFilterMyEvent = authenticatedUser.setting?.isCheckSelfSchedule
        ? true
        : false;
      setCurrentResources((prevCurrentResources) => {
        const existedResource = prevCurrentResources.find(
          (resource) => resource.id == String(authenticatedUser.id),
        );
        if ((initialFilterMyTask || initialFilterMyEvent) && !existedResource) {
          return [
            ...prevCurrentResources,
            {
              id: String(authenticatedUser.id),
              title: String(authenticatedUser.profile.fullName),
            },
          ];
        }
        return [...prevCurrentResources];
      });
      setFilterMyEvent(initialFilterMyEvent);
      setFilterMyTask(initialFilterMyTask);
    }
    if (searchParams.get('view') == ViewOptions.WEEK) {
      handleViewChange(
        CalendarViewOptions.VIEW_BY_WEEK,
        initialFilterMyTask,
        initialFilterMyEvent,
      );
    } else if (searchParams.get('view') == ViewOptions.DAY) {
      handleViewChange(
        CalendarViewOptions.VIEW_BY_DAY,
        initialFilterMyTask,
        initialFilterMyEvent,
      );
    } else if (searchParams.get('view') == ViewOptions.YEAR) {
      handleViewChange(
        CalendarViewOptions.VIEW_BY_YEAR,
        initialFilterMyTask,
        initialFilterMyEvent,
      );
    } else {
      handleViewChange(
        CalendarViewOptions.VIEW_BY_MONTH,
        initialFilterMyTask,
        initialFilterMyEvent,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUser]);

  const handleDatesSet = (arg: any) => {
    const startDate = new Date(arg.startStr);

    const endDate = new Date(arg.endStr);
    const startDateISOString = formatQueryStartDateForCalendar(startDate);
    const endDateISOString = formatQueryEndDateForCalendar(endDate);
    setCurrentRange({
      start: startDateISOString,
      end: endDateISOString,
    });
  };

  const handleShowEventsInModal = (
    eventList: any[],
    date: Date,
    clientX: number,
    clientY: number,
  ) => {
    const filterEvents: any[] = [];
    eventList.forEach((event) => {
      if (event.end) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const clickDate = new Date(date as Date);

        const isDifferentDate =
          eventStart.toDateString() !== eventEnd.toDateString();
        const isEndNotMidnight =
          eventEnd.getHours() !== 0 ||
          eventEnd.getMinutes() !== 0 ||
          eventEnd.getSeconds() !== 0;
        const adjustedEnd =
          isDifferentDate && isEndNotMidnight
            ? subtractOneDay(event.end)
            : event.end;

        if (
          removeTimeAndCompareDates(
            eventStart.toLocaleString(),
            new Date(adjustedEnd).toLocaleString(),
            clickDate.toLocaleString(),
          )
        ) {
          filterEvents.push({
            id: `${event.id}`,
            taskId:
              event.type == EventCalendarType.TASK ? `${event.taskId}` : '',
            title: event.title,
            start: eventStart.toLocaleString(),
            end: new Date(adjustedEnd).toLocaleString(),
            type: event.type,
            participants: event.participants || [],
          });
        }
      }
    });
    setPopoverInfo({
      date: date as Date,
      events: filterEvents,
      left: adjustPositionForViewport(
        {
          top: Number(clientY),
          left: Number(clientX),
        },
        filterEvents.length,
      ).left,
      top: adjustPositionForViewport(
        {
          top: Number(clientY),
          left: Number(clientX),
        },
        filterEvents.length,
      ).top,
    });
    setInfoModalPosition({
      left: adjustPositionForViewport(
        {
          top: Number(clientY),
          left: Number(clientX),
        },
        3,
      ).left,
      top: adjustPositionForViewport(
        {
          top: Number(clientY),
          left: Number(clientX),
        },
        3,
      ).top,
    });
  };

  const handleGetEventCalendarByUsers = async ({
    userId,
    startDate,
    endDate,
  }: {
    userId: string;
    startDate?: string;
    endDate?: string;
    filterMyTask?: boolean;
    isYearView?: boolean;
    date?: Date;
    clientX?: number;
    clientY?: number;
  }) => {
    const apiUrl = `${apiRouters.SCHEDULES}?${userId ? `&user_ids=${userId}` : ''}${startDate ? `&start_date=${startDate}` : `&start_date=${currentRange.start}`}${endDate ? `&end_date=${endDate}` : `&end_date=${currentRange.end}`}`;
    const { data } = await api.get(apiUrl);
    return data;
  };

  const { mutateAsync: getEventCalendarByUsers } = useMutation(
    'getEventCalendarByUsers',
    handleGetEventCalendarByUsers,
    {
      onSuccess: (data, variables) => {
        if (data) {
          const eventList: EventCalendarDetail[] = data.map(
            (event: EventCalendarProps) => {
              const checkShowMyEventResource =
                event.participants?.find(
                  (participant) => participant.id == session?.user.id,
                ) &&
                (variables.userId.includes(String(session?.user.id)) ||
                  filterMyEvent);
              return {
                title: event.title,
                start: `${event.startDate}`,
                end: `${event.endDate}`,
                allDay: event.isAllDay || false,
                id: `${event.id}`,
                type: EventCalendarType.SCHEDULE,
                participants: event.participants || [],
                resourceIds: [
                  ...(event.participants
                    ?.filter(
                      (participant) => participant.id !== session?.user.id,
                    )
                    ?.map((participant) => participant.id) ?? []),
                  ...(checkShowMyEventResource
                    ? [Number(session?.user.id)]
                    : []),
                ],
              };
            },
          );
          const newEvents = eventList.map((event) => {
            const start = new Date(event.start);

            if (event.end) {
              const end = new Date(event.end);
              if (
                start.toDateString() !== end.toDateString() &&
                !isMidnight(end)
              ) {
                end.setDate(end.getDate() + 1);
                event.end = end.toISOString();
                event.allDay = true;
              }
            }
            return event;
          });
          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const myTasks = updatedEvents.filter(
              (event) => event.type == EventCalendarType.TASK,
            );
            if (!variables.filterMyTask && variables.isYearView) {
              handleShowEventsInModal(
                [...myTasks, ...newEvents],
                variables.date as Date,
                Number(variables.clientX),
                Number(variables.clientY),
              );
            }
            return [...myTasks, ...newEvents];
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const { mutateAsync: getMyEventCalendar } = useMutation(
    'getMyEventCalendar',
    handleGetEventCalendarByUsers,
    {
      onSuccess: (data, variables) => {
        if (data) {
          const eventList: EventCalendarDetail[] = data.map(
            (event: EventCalendarProps) => {
              const checkShowMyEventResource =
                event.participants?.find(
                  (participant) => participant.id == session?.user.id,
                ) &&
                (variables.userId.includes(String(session?.user.id)) ||
                  !filterMyEvent);
              return {
                title: event.title,
                start: `${event.startDate}`,
                end: `${event.endDate}`,
                allDay: event.isAllDay || false,
                id: `${event.id}`,
                type: EventCalendarType.SCHEDULE,
                isMyEvent: true,
                participants: event.participants || [],
                resourceIds: [
                  ...(event.participants
                    ?.filter(
                      (participant: EventParticipant) =>
                        participant.id !== session?.user.id,
                    )
                    ?.map((participant: EventParticipant) => participant.id) ??
                    []),
                  ...(checkShowMyEventResource
                    ? [Number(session?.user.id)]
                    : []),
                ],
              };
            },
          );
          const newEvents = eventList.map((event) => {
            const start = new Date(event.start);

            if (event.end) {
              const end = new Date(event.end);
              if (
                start.toDateString() !== end.toDateString() &&
                !isMidnight(end)
              ) {
                end.setDate(end.getDate() + 1);
                event.end = end.toISOString();
                event.allDay = true;
              }
            }
            return event;
          });
          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const myTasks = updatedEvents.filter(
              (event) => event.type == EventCalendarType.TASK,
            );
            return [...myTasks, ...newEvents];
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
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
    isYearView?: boolean;
    date?: Date;
    clientX?: number;
    clientY?: number;
  }) => {
    const apiUrl = `${apiRouters.TASK_CALENDAR}?${userId ? `&user_id=${userId}` : ''}${startDate ? `&start_date=${startDate}` : `&start_date=${currentRange.start}`}${endDate ? `&end_date=${endDate}:59.9999999` : `&end_date=${currentRange.end}`}&current_screen=${ScreenName.CALENDAR}`;
    const { data } = await api.get<TaskCalendarProps[]>(apiUrl);
    return data;
  };

  const { mutateAsync: getMyTaskCalendar } = useMutation(
    'getMyTaskCalendar',
    handleGetTaskCalendarByUsers,
    {
      onSuccess: (data, variables) => {
        const { date, isYearView, clientX, clientY } = variables;
        if (data) {
          const taskList = data
            .filter((task) => task.taskSchedules && task.taskSchedules.length)
            .flatMap((item) =>
              item.taskSchedules.map((taskSchedule) => {
                return {
                  id: `${taskSchedule.id}`,
                  taskId: `${item.id}`,
                  title: item.title ? item.title : '',
                  start: taskSchedule.planStartDate || '',
                  end: taskSchedule.planEndDate || '',
                  participants: item.participants || [],
                  type: EventCalendarType.TASK,
                  resourceId: `${session?.user.id}`,
                };
              }),
            );

          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const myEvents = updatedEvents.filter(
              (event) => event.type !== EventCalendarType.TASK,
            );
            const newEventList = [...myEvents, ...taskList];
            if (isYearView) {
              if (newEventList) {
                handleShowEventsInModal(
                  newEventList,
                  date as Date,
                  Number(clientX),
                  Number(clientY),
                );
              }
            }

            return newEventList;
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
        setPopoverInfoLoading(false);
      },
    },
  );

  const handleFilterScheduleByUserIds = (userId: number) => {
    let updatedUserIds: string[] = selectedScheduleUserIds
      ? selectedScheduleUserIds.split(',').filter(Boolean)
      : [];
    setCurrentResources((prevCurrentResources) => {
      const userStringId = String(userId);
      const isCurrentUser = userStringId === String(session?.user.id);
      const userExists = prevCurrentResources.some(
        (resource) => resource.id === userStringId,
      );
      const userFullName =
        dashboardMemberList?.find(
          (member) => String(member.id) === userStringId,
        )?.fullName || '';

      const addUserResource = () => [
        ...prevCurrentResources,
        { id: userStringId, title: userFullName },
      ];

      const removeUserResource = () =>
        prevCurrentResources.filter((resource) => resource.id !== userStringId);

      if (!isCurrentUser) {
        return userExists ? removeUserResource() : addUserResource();
      }

      if (!filterMyEvent && !filterMyTask) {
        return userExists ? removeUserResource() : addUserResource();
      }

      return [...prevCurrentResources];
    });

    const userIdStr = String(userId);
    if (userIdStr == `${session?.user.id}`) {
      if (!updatedUserIds.includes(userIdStr)) {
        updatedUserIds.push(userIdStr);
      } else {
        updatedUserIds = updatedUserIds.filter((id) => id !== userIdStr);
      }
      setSelectedScheduleUserIds(updatedUserIds.join(','));
      if (!filterMyEvent) {
        getEventCalendarByUsers({
          userId:
            `${updatedUserIds.join(',')}`.length > 0
              ? `${updatedUserIds.join(',')}`
              : ``,
        });
      }
    } else {
      if (updatedUserIds.includes(userIdStr)) {
        updatedUserIds = updatedUserIds.filter((id) => id !== userIdStr);
      } else {
        updatedUserIds.push(userIdStr);
      }
      setSelectedScheduleUserIds(updatedUserIds.join(','));
      if (filterMyEvent) {
        updatedUserIds.push(`${session?.user.id}`);
      }
      getEventCalendarByUsers({
        userId:
          `${updatedUserIds.join(',')}`.length > 0
            ? `${updatedUserIds.join(',')}`
            : ``,
      });
    }
  };

  const handleGetAllMemberSchedules = () => {
    const allMemberIds: number[] = [];

    dashboardMemberList
      ?.filter((member) =>
        member.fullName.toLowerCase().includes(searchName.toLowerCase()),
      )
      ?.forEach((member) => {
        allMemberIds.push(member.id);
      });
    const updatedSelectedScheduleUserIds = selectedScheduleUserIds
      ? selectedScheduleUserIds.split(',').filter(Boolean)
      : [];
    let updatedMemberIds: number[] = [];
    if (removeMyselfOption) {
      updatedMemberIds = [...updatedSelectedScheduleUserIds, ...allMemberIds]
        .filter((id) => id != Number(session?.user.id))
        .map(Number);
    } else {
      updatedMemberIds = [
        ...updatedSelectedScheduleUserIds,
        ...allMemberIds,
      ].map(Number);
    }

    setSelectedScheduleUserIds(updatedMemberIds.join(','));

    if (filterMyEvent && !updatedMemberIds.includes(Number(session?.user.id))) {
      getEventCalendarByUsers({
        userId:
          `${[...updatedMemberIds, Number(session?.user.id)].join(',')}`
            .length > 0
            ? `${[...updatedMemberIds, Number(session?.user.id)].join(',')}`
            : ``,
      });
    } else {
      getEventCalendarByUsers({
        userId:
          `${updatedMemberIds.join(',')}`.length > 0
            ? `${updatedMemberIds.join(',')}`
            : ``,
      });
    }

    if (
      (filterMyEvent || filterMyTask) &&
      !updatedMemberIds.includes(Number(session?.user.id))
    ) {
      setCurrentResources(() => {
        const updatedResources: { id: string; title: string }[] = [];

        [...updatedMemberIds, Number(session?.user.id)].forEach((userId) => {
          updatedResources.push({
            id: String(userId),
            title:
              dashboardMemberList?.find(
                (member) => String(member.id) == String(userId),
              )?.fullName || '',
          });
        });

        return updatedResources;
      });
    } else {
      setCurrentResources(() => {
        const updatedResources: { id: string; title: string }[] = [];

        updatedMemberIds.forEach((userId) => {
          updatedResources.push({
            id: String(userId),
            title:
              dashboardMemberList?.find(
                (member) => String(member.id) == String(userId),
              )?.fullName || '',
          });
        });

        return updatedResources;
      });
    }
  };

  const handleRemoveAllMemberSchedules = () => {
    const allMemberIds: number[] = [];

    dashboardMemberList
      ?.filter((member) =>
        member.fullName.toLowerCase().includes(searchName.toLowerCase()),
      )
      ?.forEach((member) => {
        allMemberIds.push(member.id);
      });
    const updatedSelectedScheduleUserIds = selectedScheduleUserIds
      ? selectedScheduleUserIds.split(',').filter(Boolean)
      : [];
    const updatedMemberIds = updatedSelectedScheduleUserIds
      .filter((userId) => !allMemberIds.includes(Number(userId)))
      .map(Number);

    setSelectedScheduleUserIds(updatedMemberIds.join(','));

    if (filterMyEvent && !updatedMemberIds.includes(Number(session?.user.id))) {
      getEventCalendarByUsers({
        userId:
          `${[...updatedMemberIds, Number(session?.user.id)].join(',')}`
            .length > 0
            ? `${[...updatedMemberIds, Number(session?.user.id)].join(',')}`
            : ``,
      });
    } else {
      getEventCalendarByUsers({
        userId:
          `${updatedMemberIds.join(',')}`.length > 0
            ? `${updatedMemberIds.join(',')}`
            : ``,
      });
    }

    if (
      (filterMyEvent || filterMyTask) &&
      !updatedMemberIds.includes(Number(session?.user.id))
    ) {
      setCurrentResources(() => {
        const updatedResources: { id: string; title: string }[] = [];

        [...updatedMemberIds, Number(session?.user.id)].forEach((userId) => {
          updatedResources.push({
            id: String(userId),
            title:
              dashboardMemberList?.find(
                (member) => String(member.id) == String(userId),
              )?.fullName || '',
          });
        });

        return updatedResources;
      });
    } else {
      setCurrentResources(() => {
        const updatedResources: { id: string; title: string }[] = [];

        updatedMemberIds.forEach((userId) => {
          updatedResources.push({
            id: String(userId),
            title:
              dashboardMemberList?.find(
                (member) => String(member.id) == String(userId),
              )?.fullName || '',
          });
        });

        return updatedResources;
      });
    }
  };

  const handleToggleFilterOptions = (state: boolean, type: string) => {
    if (type === EventCalendarType.TASK) {
      if (state) {
        getMyTaskCalendar({
          userId: `${session?.user.id}`,
        });
        handleConfirmUpdateCalendarSettings({
          isCheckSelfSchedule: filterMyEvent,
          isCheckSelfTask: true,
        });
        setCurrentResources((prevCurrentResources) => {
          const updatedUserIds: string[] = selectedScheduleUserIds
            ? selectedScheduleUserIds.split(',').filter(Boolean)
            : [];
          if (
            !filterMyEvent &&
            !filterMyTask &&
            !updatedUserIds.find(
              (userId) => String(userId) == String(session?.user.id),
            )
          ) {
            return [
              ...prevCurrentResources,
              {
                id: String(session?.user.id),
                title:
                  dashboardMemberList?.find(
                    (member) => String(member.id) == String(session?.user.id),
                  )?.fullName || '',
              },
            ];
          }
          return [...prevCurrentResources];
        });
      } else {
        setEvents((prevEvents) => {
          const updatedEvents = [...prevEvents];
          const myEvents = updatedEvents.filter(
            (event) => event.type !== EventCalendarType.TASK,
          );
          return myEvents;
        });
        handleConfirmUpdateCalendarSettings({
          isCheckSelfSchedule: filterMyEvent,
          isCheckSelfTask: false,
        });
        setCurrentResources((prevCurrentResources) => {
          const updatedUserIds: string[] = selectedScheduleUserIds
            ? selectedScheduleUserIds.split(',').filter(Boolean)
            : [];
          if (
            !filterMyEvent &&
            filterMyTask &&
            !updatedUserIds.find(
              (userId) => String(userId) == String(session?.user.id),
            )
          ) {
            return prevCurrentResources.filter(
              (resource) => resource.id !== String(session?.user.id),
            );
          }
          return [...prevCurrentResources];
        });
      }
      setFilterMyTask(state);
    } else if (type === EventCalendarType.SCHEDULE) {
      const updatedUserIds: string[] = selectedScheduleUserIds
        ? selectedScheduleUserIds.split(',').filter(Boolean)
        : [];
      if (!state) {
        setCurrentResources((prevCurrentResources) => {
          const updatedUserIds: string[] = selectedScheduleUserIds
            ? selectedScheduleUserIds.split(',').filter(Boolean)
            : [];
          if (
            filterMyEvent &&
            !filterMyTask &&
            !updatedUserIds.find(
              (userId) => String(userId) == String(session?.user.id),
            )
          ) {
            return prevCurrentResources.filter(
              (resource) => resource.id !== String(session?.user.id),
            );
          }
          return [...prevCurrentResources];
        });
        handleConfirmUpdateCalendarSettings({
          isCheckSelfSchedule: false,
          isCheckSelfTask: filterMyTask,
        });
      } else {
        setCurrentResources((prevCurrentResources) => {
          const updatedUserIds: string[] = selectedScheduleUserIds
            ? selectedScheduleUserIds.split(',').filter(Boolean)
            : [];
          if (
            !filterMyEvent &&
            !filterMyTask &&
            !updatedUserIds.find(
              (userId) => String(userId) == String(session?.user.id),
            )
          ) {
            return [
              ...prevCurrentResources,
              {
                id: String(session?.user.id),
                title:
                  dashboardMemberList?.find(
                    (member) => String(member.id) == String(session?.user.id),
                  )?.fullName || '',
              },
            ];
          }
          return [...prevCurrentResources];
        });
        handleConfirmUpdateCalendarSettings({
          isCheckSelfSchedule: true,
          isCheckSelfTask: filterMyTask,
        });
      }
      if (!updatedUserIds.includes(String(session?.user.id))) {
        if (state) {
          updatedUserIds.push(String(session?.user.id));
        }
        getMyEventCalendar({
          userId: updatedUserIds.join(','),
        });
      }
      setFilterMyEvent(state);
    }
  };

  const handleConfirmUpdateCalendarSettings = (data: {
    isCheckSelfTask: boolean;
    isCheckSelfSchedule: boolean;
  }) => {
    updateCalendarSettings(data);
  };

  const handleUpdateCalendarSettings = async (data: {
    isCheckSelfTask: boolean;
    isCheckSelfSchedule: boolean;
  }) => {
    return await api.post(apiRouters.USER_SETTING, data);
  };

  const { mutate: updateCalendarSettings } = useMutation(
    'postUpdateCalendarSettings',
    handleUpdateCalendarSettings,
  );

  const handleGetDataDetailEvent = async (id: string) => {
    const { data: response } = await api.get(apiRouters.SCHEDULE_DETAIL(id));
    return response;
  };

  const { mutate: getDataDetailEvent } = useMutation(
    'getDetailEventCalendar',
    handleGetDataDetailEvent,
    {
      onSuccess: async (data) => {
        setOpenCreateEventModal(true);
        setDataEventEdit(data);
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
      onSettled: () => {},
    },
  );

  const handleConfirmGetDataDetailEvent = (id: string) => {
    getDataDetailEvent(id);
  };

  const { mutate: getDataEventInfo } = useMutation(
    'getDataEventInfo',
    handleGetDataDetailEvent,
    {
      onSuccess: async (data) => {
        setOpenEventInfoModal(true);
        setDataEventEdit(data);
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
      onSettled: () => {},
    },
  );

  const handleConfirmGetDataEventInfo = (id: string) => {
    getDataEventInfo(id);
  };

  const handleConfirmGetDataTaskInfo = (taskInfo: {
    id: string;
    taskScheduleId?: string;
  }) => {
    getDataTaskInfo({
      id: taskInfo.id,
      taskScheduleId: taskInfo.taskScheduleId,
    });
  };

  const handleConfirmGetDataDetailTask = (id: string) => {
    getDataDetailTask({ id });
  };
  const handleGetDataDetailTask = async (taskInfo: {
    id: string;
    taskScheduleId?: string;
  }) => {
    const { data: response } = await api.get(
      `${apiRouters.TASK_DETAIL(`${taskInfo.id}`)}?current_screen=${CurrentScreen.CALENDAR}`,
    );
    return response;
  };

  const { mutate: getDataTaskInfo } = useMutation(
    'getDataTaskInfo',
    handleGetDataDetailTask,
    {
      onSuccess: async (data, variables) => {
        setSelectedTaskScheduleId(variables.taskScheduleId);
        setDataTaskEdit(data);
        if (actionType) {
          setActionEventClick(`${actionType}`);
        }
        setOpenTaskInfoModal(true);
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const { mutate: getDataDetailTask } = useMutation(
    'getDetailTask',
    handleGetDataDetailTask,
    {
      onSuccess: async (data) => {
        const initialParticipantList: PeopleInCharge[] = [];
        data.peopleInCharge.forEach((member: peopleInChargeType) => {
          initialParticipantList.push({ peopleInChargeId: member.id });
        });
        setDataTaskEdit(data);
        if (actionType) {
          setActionEventClick(`${actionType}`);
        }
        setShowEditTaskModal(true);
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  const handleEventClick = (clickInfo: EventClickArg) => {
    setPopoverInfo(null);
    if (clickInfo.event.extendedProps.type === EventCalendarType.SCHEDULE) {
      handleSetEventParam({
        id: `${clickInfo.event.id}`,
        action: ActionsEvent.EDIT,
      });
      handleConfirmGetDataDetailEvent(`${clickInfo.event.id}`);
    } else if (clickInfo.event.extendedProps.type === EventCalendarType.TASK) {
      handleSetTaskParam({
        id: `${clickInfo.event.extendedProps.taskId}`,
        action: ActionsEvent.EDIT,
      });
      handleConfirmGetDataDetailTask(`${clickInfo.event.extendedProps.taskId}`);
    }
    setActionEventClick(ActionsEvent.EDIT);
  };

  const handleEventClickInPopup = (
    eventType: string,
    eventId: string,
    taskScheduleId: string | undefined,
  ) => {
    if (eventType === EventCalendarType.SCHEDULE) {
      handleConfirmGetDataEventInfo(`${eventId}`);
    } else if (eventType === EventCalendarType.TASK) {
      handleConfirmGetDataTaskInfo({
        id: `${eventId}`,
        taskScheduleId: String(taskScheduleId),
      });
    }
  };

  useEffect(() => {
    if (eventDetailId && dataEventEdit === undefined && actionType) {
      setActionEventClick(actionType);

      getDataDetailEvent(eventDetailId.replace('event', ''));
    }
    if (actionType === ActionsEvent.CREATE) {
      setOpenCreateEventModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailEvent, eventDetailId, actionType]);

  useEffect(() => {
    if (taskDetailId && dataTaskEdit === null && actionType) {
      getDataDetailTask({ id: taskDetailId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailTask, taskDetailId, actionType]);

  const handleDayCellMount = (info: { date: Date; el: HTMLElement }) => {
    const { date, el } = info;

    const today = new Date();

    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    if (isToday) {
      const dayNumberEl = el.querySelector('.fc-daygrid-day-number');
      if (dayNumberEl) {
        dayNumberEl.classList.add('current-day');
      }
    }
  };

  const { control } = useForm({
    mode: 'onSubmit',
  });

  const calendarViewOptions = [
    {
      value: CalendarViewOptions.VIEW_BY_YEAR,
      label: '年',
    },
    {
      value: CalendarViewOptions.VIEW_BY_MONTH,
      label: '月',
    },
    {
      value: CalendarViewOptions.VIEW_BY_WEEK,
      label: '週',
    },
    {
      value: CalendarViewOptions.VIEW_BY_DAY,
      label: '日',
    },
  ];

  const handleDateClick = (clickInfo?: any) => {
    setDefaultCreateStartDate(clickInfo.date);
    if (searchParams.get('view') == ViewOptions.YEAR) {
      handleShowEventsInYearView(
        clickInfo.date,
        clickInfo.jsEvent.clientX,
        clickInfo.jsEvent.clientY,
      );
      return;
    }
    if (searchParams.get('view') == ViewOptions.MONTH) {
      handleShowEventsInModal(
        events,
        clickInfo.date,
        clickInfo.jsEvent.clientX,
        clickInfo.jsEvent.clientY,
      );
    } else {
      if (
        session?.user.permissions &&
        hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.CALENDAR_ADD,
        )
      ) {
        setActionEventClick(ActionsEvent.CREATE);
        setDataEventEdit(undefined);
        handleSetEventParam({
          id: null,
          action: ActionsEvent.CREATE,
        });
        setOpenCreateEventModal(true);
      }
    }
  };

  const handleCreateNewEventFromPopup = () => {
    setActionEventClick(ActionsEvent.CREATE);
    setDataEventEdit(undefined);
    handleSetEventParam({
      id: null,
      action: ActionsEvent.CREATE,
    });
    setOpenCreateEventModal(true);
  };

  const handleConfirmCreateEventCalendar = (
    data: EventFormData,
    sendToChat: boolean,
  ) => {
    const newWorkCategories = [];
    const newTagIds: number[] = [];
    let newType = '';
    let newStartDate = null;
    let newEndDate = null;
    if (data.tagIds) {
      data.tagIds
        .filter((item) => item.value !== '')
        .map((item) => newTagIds.push(item.value as number));
    }
    if (data.type) {
      newType = data.type.value as string;
    }
    if (data.largeCategory?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.largeCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.largeCategory.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.mediumCategory?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.mediumCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.mediumCategory.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.smallCategory?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.smallCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.smallCategory.value}`,
        type: EventWorkCategory.SMALL,
      });
    }
    if (data.startDate) {
      if (data.isAllDay) {
        newStartDate = addTimeToDate(
          data.startDate as Date,
          DEFAULT_START_TIME,
        );
      } else {
        if (data.startTime) {
          newStartDate = addTimeToDate(data.startDate as Date, data.startTime);
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
    createEventCalendar({
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
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
    });
  };

  const handleCreateEventCalendar = async (data: EventRequest) => {
    return await api.post(apiRouters.SCHEDULES, data);
  };
  const { mutate: createEventCalendar } = useMutation(
    'postCreateEventCalendar',
    handleCreateEventCalendar,
    {
      onSuccess: async ({ data }) => {
        handleRemoveEventParam();
        setOpenConfirmCreateEventModal(false);
        setBackToEditing(false);
        setConfirmEventDataToCreate(undefined);
        const isMyEvent = data.participants.find(
          (participant: EventParticipant) => participant.id == session?.user.id,
        )
          ? true
          : false;
        const updatedUserIds: string[] = selectedScheduleUserIds
          ? selectedScheduleUserIds.split(',').filter(Boolean)
          : [];
        const isOtherMembersEvent = data.participants.find(
          (participant: EventParticipant) =>
            updatedUserIds.includes(String(participant.id)),
        )
          ? true
          : false;
        if (
          (isMyEvent && filterMyEvent) ||
          (isMyEvent && updatedUserIds.includes(String(session?.user.id))) ||
          isOtherMembersEvent
        ) {
          const checkShowMyEventResource =
            data.participants?.find(
              (participant: EventParticipant) =>
                participant.id == session?.user.id,
            ) &&
            (selectedScheduleUserIds.includes(String(session?.user.id)) ||
              filterMyEvent);
          setEvents((prevEvents) => {
            const dataEndDate =
              data.startDate &&
              data.endDate &&
              new Date(data.startDate).toDateString() !==
                new Date(data.endDate).toDateString() &&
              !isMidnight(new Date(data.endDate))
                ? new Date(data.endDate).setDate(
                    new Date(data.endDate).getDate() + 1,
                  )
                : data.endDate;
            const start = new Date(data.startDate);
            if (data.endDate) {
              const end = new Date(data.endDate);
              if (start.getDate() !== end.getDate()) {
                data.isAllDay = true;
              }
            }
            const newEventData = {
              id: `${data.id}`,
              title: data.title,
              start: data.startDate,
              end: dataEndDate,
              allDay: data.isAllDay,
              type: EventCalendarType.SCHEDULE,
              isMyEvent: isMyEvent,
              participants: data.participants,
              resourceIds: [
                ...(data.participants
                  ?.filter(
                    (participant: EventParticipant) =>
                      participant.id !== session?.user.id,
                  )
                  ?.map((participant: EventParticipant) => participant.id) ??
                  []),
                ...(checkShowMyEventResource ? [Number(session?.user.id)] : []),
              ],
            };

            const updatedEvents = [...prevEvents, newEventData];
            return updatedEvents;
          });
        }
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

  // Action call api edit task
  const handleConfirmEditTask = (data: TaskFormData) => {
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];
    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));

    const planList = data.plans
      ? data.plans
          .filter((item) => item.planStartDate !== null)
          .map((item) => {
            return {
              scheduleId: item.scheduleId || null,
              planStartDate:
                item.planStartDate && item.planStartTime
                  ? addTimeToDate(
                      item.planStartDate as Date,
                      item.planStartTime,
                    )
                  : null,
              planEndDate:
                item.planEndDate && item.planEndTime
                  ? addTimeToDate(item.planEndDate as Date, item.planEndTime)
                  : null,
            };
          })
      : null;
    const todoListData =
      data.todoList && data.todoList.filter((item) => item.content !== '');
    const newWorkCategories = [];
    if (data.categories.LARGE?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }
    editTask({
      id: data.id,
      title: data.title,
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : null,
      description: data.description,
      tagIds: tagIds,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : [],
      sendToChat: true,
      peopleInChargeIds: peopleInChargeIds,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
    });
  };
  const handleEditTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.TASK_DETAIL(`${data.id}`), data);
  };
  const { mutate: editTask } = useMutation('postEditTask', handleEditTask, {
    onSuccess: async ({ data }) => {
      const isMyTask = data.peopleInCharge.find(
        (participant: peopleInChargeType) => participant.id == session?.user.id,
      )
        ? true
        : false;
      if (isMyTask) {
        const exceptUpdatedTaskList = events.filter(
          (event) => String(event.taskId) != String(data.id),
        );
        const taskList = data.taskSchedules.map(
          (taskSchedule: {
            id?: number | null;
            uuid?: string;
            planStartDate: string | null;
            planEndDate?: string | null;
          }) => {
            return {
              id: `${taskSchedule.id}`,
              taskId: `${data.id}`,
              title: data.title ? data.title : '',
              start: taskSchedule.planStartDate || '',
              end: taskSchedule.planEndDate || '',
              participants: data.participants || [],
              type: EventCalendarType.TASK,
              resourceId: `${session?.user.id}`,
            };
          },
        );
        setEvents([...exceptUpdatedTaskList, ...taskList]);
      } else {
        setEvents((prevEvents) => {
          const updatedEvents = [...prevEvents];
          const filteredEventIndex = updatedEvents.findIndex(
            (event) =>
              String(event.taskId) === String(data.id) &&
              event.type === EventCalendarType.TASK,
          );
          if (filteredEventIndex !== -1) {
            updatedEvents.splice(filteredEventIndex, 1);
          }
          return updatedEvents;
        });
      }
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });
      handleRemoveTaskParam();
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
      setDataTaskEdit(null);
    },
  });

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
          newStartDate = addTimeToDate(data.startDate as Date, data.startTime);
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
    return await api.patch(apiRouters.SCHEDULE_DETAIL(`${data.id}`), data);
  };

  const { mutate: editEventCalendar } = useMutation(
    'editEventCalendar',
    handleEditEventCalendar,
    {
      onSuccess: async ({ data }) => {
        handleRemoveEventParam();
        setOpenConfirmEditEventModal(false);
        setBackToEditing(false);
        setConfirmEventDataToEdit(undefined);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
        const isMyEvent = data.participants.find(
          (participant: EventParticipant) => participant.id == session?.user.id,
        )
          ? true
          : false;
        const isSelectedUserEvent = data.participants.find(
          (participant: EventParticipant) =>
            selectedScheduleUserIds.includes(`${participant.id}`),
        )
          ? true
          : false;
        if ((isMyEvent && filterMyEvent) || isSelectedUserEvent) {
          const checkShowMyEventResource =
            data.participants?.find(
              (participant: EventParticipant) =>
                participant.id == session?.user.id,
            ) &&
            (selectedScheduleUserIds.includes(String(session?.user.id)) ||
              filterMyEvent);
          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const foundEventIndex = updatedEvents.findIndex(
              (event) =>
                String(event.id) == String(data.id) &&
                event.type == EventCalendarType.SCHEDULE,
            );
            const dataEndDate =
              data.startDate &&
              data.endDate &&
              new Date(data.startDate).toDateString() !==
                new Date(data.endDate).toDateString() &&
              !isMidnight(new Date(data.endDate))
                ? new Date(data.endDate).setDate(
                    new Date(data.endDate).getDate() + 1,
                  )
                : data.endDate;
            const start = new Date(data.startDate);
            if (data.endDate) {
              const end = new Date(data.endDate);
              if (start.getDate() !== end.getDate()) {
                data.isAllDay = true;
              }
            }
            updatedEvents[foundEventIndex] = {
              ...updatedEvents[foundEventIndex],
              title: data.title,
              start: data.startDate,
              end: dataEndDate,
              allDay: data.isAllDay,
              isMyEvent: true,
              participants: data.participants,
              resourceIds: [
                ...(data.participants
                  ?.filter(
                    (participant: EventParticipant) =>
                      participant.id !== session?.user.id,
                  )
                  ?.map((participant: EventParticipant) => participant.id) ??
                  []),
                ...(checkShowMyEventResource ? [Number(session?.user.id)] : []),
              ],
            };
            return updatedEvents;
          });
        } else {
          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const filteredEvents = updatedEvents.filter(
              (event) => String(event.id) !== String(data.id),
            );
            return filteredEvents;
          });
        }
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
        setDataEventEdit(undefined);
      },
    },
  );

  const handleConfirmDeleteEventCalendar = (sendToChat: boolean) => {
    if (eventDetailId) {
      deleteEventCalendar({ id: eventDetailId, sendToChat });
      return;
    }
  };

  const handleDeleteEventCalendar = async (data: {
    id: string;
    sendToChat: boolean;
  }) => {
    return await api.delete(
      `${apiRouters.SCHEDULE_DETAIL(data.id)}?message=${encodeURIComponent(actionsEventMessage)}${data.sendToChat ? '&send_to_chat=true' : ''}`,
    );
  };

  const { mutate: deleteEventCalendar } = useMutation(
    'deleteEventCalendar',
    handleDeleteEventCalendar,
    {
      onSuccess: () => {
        handleRemoveEventParam();
        setOpenConfirmDeleteEventModal(false);
        setConfirmEventDataToEdit(undefined);
        setBackToEditing(false);
        setOpenEventInfoModal(false);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
        setEvents((prevEvents) => {
          const updatedEvents = [...prevEvents];
          const filteredEvents = updatedEvents.filter(
            (event) => String(event.id) !== String(eventDetailId),
          );
          return filteredEvents;
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmDeleteTask = () => {
    if (taskDetailId) {
      setIsLoading(true);
      deleteTask(taskDetailId);
      return;
    }
  };

  const handleDeleteTask = async (id: string) => {
    const { data: response } = await api.delete(
      apiRouters.TASK_DETAIL(`${id}`),
    );
    return response;
  };

  const { mutate: deleteTask } = useMutation('deleteTask', handleDeleteTask, {
    onSuccess: async () => {
      handleRemoveTaskParam();
      setOpenConfirmDeleteTaskModal(false);
      showToast({
        description: SUCCESS_DELETE_MESSAGE,
      });
      setEvents((prevEvents) => {
        const updatedEvents = [...prevEvents];
        const filteredEvents = updatedEvents.filter(
          (event) => String(event.taskId) !== String(taskDetailId),
        );
        return filteredEvents;
      });
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_DELETE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const modifyEvents = (events: EventCalendarDetail[]) => {
    if (isEventRendering) {
      if (
        calendarRef.current &&
        (filterMyEvent || filterMyTask) &&
        searchParams.get('view') == ViewOptions.MONTH
      ) {
        const calendarApi = calendarRef.current.getApi();
        const start = calendarApi.view.activeStart;
        const end = calendarApi.view.activeEnd;

        const skeletonEvents = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
          skeletonEvents.push({
            title: 'Loading...',
            start: currentDate.toISOString().split('T')[0],
            id: `loading-${currentDate.toISOString()}-1`,
          });
          skeletonEvents.push({
            title: 'Loading...',
            start: currentDate.toISOString().split('T')[0],
            id: `loading-${currentDate.toISOString()}-2`,
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return skeletonEvents;
      }
    } else {
      if (searchParams.get('view') == ViewOptions.YEAR) {
        return [];
      }
      return events.map((event) => {
        const start = new Date(event.start);
        if (event.end) {
          const end = new Date(event.end);
          if (start.getDate() !== end.getDate()) {
            event.allDay = true;
          }
        }
        let eventClass = '';
        if (event.type === EventCalendarType.TASK) {
          eventClass = 'event-type-task';
        } else {
          eventClass = 'event-type-schedule';
        }
        return {
          ...event,
          classNames: [eventClass],
        };
      });
    }
  };

  const handleSetEventParam = ({
    id,
    action,
  }: {
    id: string | null;
    action?: string | null;
  }) => {
    if (id) {
      params.set('event', id);
    }
    if (action) {
      params.set('action', action);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveEventParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('event');
    params.delete('action');
    router.replace(`?${params.toString()}`);
  };

  const handleSetTaskParam = ({
    id,
    action,
  }: {
    id: string | null;
    action?: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    if (action) {
      params.set('action', action);
    }
    router.push(`?${params.toString()}`);
  };

  const handleRemoveTaskParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    router.replace(`?${params.toString()}`);
    setShowEditTaskModal(false);
  };

  const getDefaultCalendarView = () => {
    let defaultView = calendarViewOptions[1];
    switch (searchParams.get('view')) {
      case ViewOptions.YEAR:
        defaultView = calendarViewOptions[0];
        break;
      case ViewOptions.MONTH:
        defaultView = calendarViewOptions[1];
        break;
      case ViewOptions.WEEK:
        defaultView = calendarViewOptions[2];
        break;
      case ViewOptions.DAY:
        defaultView = calendarViewOptions[3];
        break;
      default:
        break;
    }
    return defaultView;
  };

  const handleClosePopover = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node)
    ) {
      setPopoverInfo(null);
      setDefaultCreateStartDate(undefined);
    }
  };
  useEffect(() => {
    document.addEventListener('click', handleClosePopover, true);
    return () => {
      document.removeEventListener('click', handleClosePopover, true);
    };
  }, []);

  return (
    <Fragment>
      <div className="flex mb-3 pl-8 overflow-y-hidden" ref={containerRef}>
        <div className={`${showSidebar ? 'w-[76%] mr-3' : 'w-full'} p-4`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center ml-[-1rem] gap-4">
              <ImageRound
                name="Chevron left"
                src={'/icons/chevron-left-calendar.svg'}
                onClick={handlePrev}
                className="!w-[8px] !h-[10px] hover:cursor-pointer"
              />
              <div className="flex items-end font-normal gap-2">
                {searchParams.get('view') != ViewOptions.DAY && (
                  <p
                    className={`${
                      searchParams.get('view') == ViewOptions.YEAR
                        ? 'text-[25px]'
                        : 'text-[18px]'
                    }  mb-[5px] text-[#5B6770] font-medium`}>
                    {displayYear}年
                  </p>
                )}
                {searchParams.get('view') !== ViewOptions.YEAR && (
                  <p className="text-[30px] text-[#5B6770] font-medium">
                    {displayMonth}月
                  </p>
                )}
                {searchParams.get('view') == ViewOptions.DAY && (
                  <>
                    <p className="text-[30px] text-[#5B6770] font-medium">
                      {displayDay}日
                    </p>
                    <p className="text-[18px] mb-[5px] text-[#5B6770] font-medium">
                      (
                      {getJapaneseDayName(
                        calendarRef.current
                          ? String(calendarRef.current.getApi().getDate())
                          : String(new Date()),
                      )}
                      )
                    </p>
                  </>
                )}
              </div>

              <ImageRound
                name="Chevron right"
                src={'/icons/chevron-left-calendar.svg'}
                onClick={handleNext}
                className="!w-[8px] !h-[10px] rotate-180 hover:cursor-pointer"
              />
              <div className="mt-5 z-20">
                <DatePicker
                  className="z-50"
                  isShowInput={false}
                  selected={
                    calendarRef.current
                      ? calendarRef.current.getApi().getDate()
                      : new Date()
                  }
                  tooltipMsg="カレンダーから日付を選択"
                  iconClassName="!static !w-10 !h-5"
                  onChange={(e) => {
                    handleNavigateToSpecificDay(e as Date);
                  }}
                />
              </div>

              <Button
                type="button"
                className="!self-center !text-[#0068B6] !bg-white !w-[48px] !h-[34px] !rounded-[6px] !text-[14px] !font-medium !p-[8px] !border-none"
                onClick={handleNavigateToTodayView}>
                今日
              </Button>
            </div>
            <div
              className={`flex gap-5 items-center ${!showSidebar && 'mr-14'}`}>
              <InputSearch
                placeholder="予定、キーワードを検索"
                inputClassName="!w-[300px] !py-2 !rounded-[20px] text-sm !bg-white border-none placeholder-[#77858F99]"
              />
              <div className="!w-[54px]">
                <Controller
                  control={control}
                  name={'calendarView'}
                  defaultValue={getDefaultCalendarView()}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      options={calendarViewOptions}
                      selectedOption={calendarViewOptions.find(
                        (element) => element.value === value?.value,
                      )}
                      className="h-[34px] !w-full !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                      classNameTextData="!text-xs "
                      classNameOption="!text-xs !border-[#77858F] !ring-[#77858F] !ring-opacity-100"
                      labelOptionClass=" font-medium !pl-0.5 !border-b-[0px]!border-[#77858F]"
                      onChange={(e) => {
                        onChange(e);
                        handleViewChange(e.value as string);
                        setIsCalendarLoading(true);
                        setTimeout(() => setIsCalendarLoading(false), 600);
                      }}
                    />
                  )}
                />
              </div>
            </div>
            {!showSidebar && (
              <div
                className="bg-white w-[60px] h-[46px] rounded-l-[30px] flex items-center shadow-md hover:cursor-pointer fixed top-[90px] right-0"
                onClick={() => setShowSidebar((prev) => !prev)}>
                <ImageRound
                  className="w-8 h-8 ml-2"
                  src="/icons/multi-users.svg"
                  border="full"
                  name="Avatar user"
                />
                <ImageRound
                  className="w-4 h-4 -rotate-90 ml-1"
                  src={'/icons/arrow-down.svg'}
                  name="Arrow down"
                />
              </div>
            )}
          </div>

          <div
            className={`w-full relative calendar-custom ${searchParams.get('view') || ''} ${showSidebar ? '' : 'pr-8'}`}
            style={{ overflowX: 'auto', width: '100%' }}>
            {calendarLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#ebf1f4] z-10"></div>
            )}
            {isEventRendering && (
              <>
                {(searchParams.get('view') == ViewOptions.WEEK ||
                  searchParams.get('view') == ViewOptions.DAY) && (
                  <div className="absolute top-0 left-0 z-[15] w-full overflow-hidden">
                    <CalendarSkeleton
                      numberOfResources={
                        searchParams.get('view') == ViewOptions.WEEK ? 7 : 2
                      }
                    />
                  </div>
                )}
              </>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                multiMonthPlugin,
                resourceTimeGridPlugin,
                resourcePlugin,
                scrollgridPlugin,
              ]}
              initialView={
                searchParams.get('view') == ViewOptions.DAY
                  ? CalendarViewOptions.VIEW_BY_DAY
                  : CalendarViewOptions.VIEW_BY_MONTH
              }
              resources={currentResources}
              resourceOrder={(a: any, b: any) => {
                if (a.id === String(session?.user.id)) return -1;
                if (b.id === String(session?.user.id)) return 1;
                return a.title.localeCompare(b.title);
              }}
              resourceLabelContent={(resource) => {
                const avatarColor = String(
                  dashboardMembers.find(
                    (member) => member.id == resource.resource.id,
                  )?.avatarColor,
                );
                return (
                  <div className="flex items-center justify-start gap-1">
                    {AvatarIconWithDynamicColor({
                      color: avatarColor || '',
                      size: 36,
                    })}
                    <p className="truncate max-w-[100px] text-[15px] font-medium text-black">
                      {resource.resource.title}
                    </p>
                  </div>
                );
              }}
              datesAboveResources={true}
              headerToolbar={false}
              datesSet={handleDatesSet}
              locale={'ja-JP'}
              height={'80vh'}
              dayMinWidth={
                searchParams.get('view') === ViewOptions.DAY ? 250 : undefined
              }
              stickyFooterScrollbar={true}
              events={modifyEvents(events)}
              dayMaxEvents={2}
              nowIndicator={true}
              moreLinkContent={(args) => {
                return (
                  <div
                    className="custom-more-link border-none"
                    style={{
                      fontWeight: '700',
                    }}>
                    {'他 ' + args.num + ' 件'}
                  </div>
                );
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false,
                hour12: false,
              }}
              dayHeaderContent={(arg) => {
                const date = new Date(arg.date);
                let day = date.getDate().toString();
                if (day.length === 1) {
                  day = '0' + day;
                }
                const weekday = date.toLocaleDateString('ja-JP', {
                  weekday: 'short',
                });
                const viewType = arg.view.type;

                if (viewType === 'timeGridWeek') {
                  return (
                    <div className="fc-day-header text-[#5B6770] font-medium">
                    <span className='text-[18px] mr-1'>{day}日</span>
                    <span className='text-[12px]'>({weekday})</span>
                    </div>
                  );
                } else {
                  return (
                    <span className="fc-day-header">{weekday}</span>
                  );
                }
              }}
              multiMonthMaxColumns={4}
              eventContent={handleEventContent}
              multiMonthMinWidth={200}
              showNonCurrentDates={true}
              fixedWeekCount={false}
              dayCellDidMount={handleDayCellMount}
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: false,
                hour12: false,
              }}
              slotDuration="00:30:00"
              slotLabelInterval="00:30:00"
              slotLabelContent={({ text }) => (
                <div className="text-[12px] text-[#77858F]">{text}</div>
              )}
              firstDay={1}
              scrollTimeReset={false}
              allDayText="終日"
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              moreLinkClick={handleMoreLinkClick}
              dayPopoverFormat={{
                month: 'long',
                day: 'numeric',
              }}
              views={{
                dayGridMonth: {
                  dayCellContent: ({ date }) => {
                    let isSelectedDate = false;
                    if (defaultCreateStartDate) {
                      const currentDateStr = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`;
                      const selectedDateStr = `${new Date(defaultCreateStartDate).getFullYear()}/${new Date(defaultCreateStartDate).getMonth() + 1}/${new Date(defaultCreateStartDate).getDate()}`;
                      const renderedDateStr = `${new Date(date).getFullYear()}/${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`;
                      isSelectedDate =
                        selectedDateStr == renderedDateStr &&
                        currentDateStr != selectedDateStr;
                    }

                    return (
                      <div
                        className={`text-[14px] ${isSelectedDate && 'bg-[#E2E9EE] ml-[-5px] !w-[29px] !h-[29px] mt-[-4px] mr-[-5px] rounded-full flex items-center justify-center'}`}>
                        {date.getDate()}
                      </div>
                    );
                  },
                  titleFormat: (date) => {
                    setDisplayYear(date.date.year);
                    setDisplayMonth(date.date.month + 1);
                    return `${date.date.year}年 ${date.date.month + 1}月`;
                  },
                },
                timeGridWeek: {
                  titleFormat: (date) => {
                    setDisplayYear(date.date.year);
                    setDisplayMonth(date.date.month + 1);
                    return `${date.date.year}年 ${date.date.month + 1}月`;
                  },
                },
                multiMonthYear: {
                  dayCellContent: ({ date }) => {
                    let isSelectedDate = false;
                    if (defaultCreateStartDate) {
                      const currentDateStr = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`;
                      const selectedDateStr = `${new Date(defaultCreateStartDate).getFullYear()}/${new Date(defaultCreateStartDate).getMonth() + 1}/${new Date(defaultCreateStartDate).getDate()}`;
                      const renderedDateStr = `${new Date(date).getFullYear()}/${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`;
                      isSelectedDate =
                        selectedDateStr == renderedDateStr &&
                        currentDateStr != selectedDateStr;
                    }

                    return (
                      <div
                        className={`text-[14px] ${isSelectedDate && 'bg-[#E2E9EE] ml-[-5px] !w-[29px] !h-[29px] mt-[-8px] mr-[-5px] rounded-full flex items-center justify-center'}`}>
                        {date.getDate()}
                      </div>
                    );
                  },
                  titleFormat: (date) => {
                    setDisplayYear(date.date.year);
                    return `${date.date.year}年`;
                  },
                },
                resourceTimeGridDay: {
                  titleFormat: (date) => {
                    setDisplayYear(date.date.year);
                    setDisplayMonth(date.date.month + 1);
                    setDisplayDay(date.date.day);
                    return `${date.date.year}年 ${date.date.month + 1}月 ${date.date.day}日`;
                  },
                },
              }}
            />
          </div>
        </div>
        {popoverInfo && (
          <div className="z-30 flex items-center justify-center">
            <div
              className={`p-4 bg-white border custom-popover w-[330px] border-gray-200 shadow-lg font-primary max-h-[500px] overflow-y-auto !rounded-2xl py-4`}
              ref={popoverRef}
              style={{
                position: 'absolute',
                top: `${popoverInfo.top}px`,
                left: `${popoverInfo.left}px`,
              }}>
              <div
                className="hover:bg-[#EBF1F4] absolute p-1.5 right-2 top-2 hover:rounded-full hover:cursor-pointer"
                onClick={() => {
                  handlePopoverClose();
                  setDefaultCreateStartDate(undefined);
                }}>
                <ImageRound
                  name="Close"
                  src={'/icons/close.svg'}
                  className="w-[18px] h-[18px] hover:cursor-pointer"
                />
              </div>
              <h3 className="text-center mb-4">
                {popoverInfo.date
                  ? (() => {
                      const { day, dayOfWeek, month } = getDateInfo(
                        new Date(popoverInfo.date),
                      );
                      return (
                        <>
                          <span className="text-md font-semibold mr-1">
                            {month}月{day}日
                          </span>
                          <span className="text-sm font-medium">
                            ({dayOfWeek})
                          </span>
                        </>
                      );
                    })()
                  : ''}
              </h3>
              <ul className="list-disc">
                {popoverInfo.events.map((event) => {
                  let timeRange = '';
                  if (event.start && event.end) {
                    timeRange = getTimeRangeForClickDate(
                      new Date(event.start),
                      new Date(event.end),
                    );
                  }

                  let avatarColor = '';
                  if (event.participants && event.participants.length > 0) {
                    if (event.type == EventCalendarType.TASK) {
                      avatarColor =
                        dashboardMembers.find(
                          (member) => member.id == session?.user.id,
                        )?.avatarColor || '';
                    } else {
                      const updatedUserIds: string[] = selectedScheduleUserIds
                        ? selectedScheduleUserIds.split(',').filter(Boolean)
                        : [];
                      if (
                        filterMyEvent &&
                        !updatedUserIds.find(
                          (userId) =>
                            String(userId) == String(session?.user.id),
                        )
                      ) {
                        updatedUserIds.push(String(session?.user.id));
                      }
                      if (
                        event.participants.find(
                          (participant: EventParticipant) =>
                            participant.id == session?.user.id,
                        ) &&
                        updatedUserIds.includes(`${session?.user.id}`)
                      ) {
                        avatarColor =
                          dashboardMembers.find(
                            (member) => member.id == session?.user.id,
                          )?.avatarColor || '';
                      } else {
                        const participantList = event.participants
                          .filter((participant: EventParticipant) =>
                            updatedUserIds.find(
                              (userId) => userId == participant.id,
                            ),
                          )
                          .sort(
                            (prev: EventParticipant, next: EventParticipant) =>
                              prev.fullName.localeCompare(next.fullName),
                          )
                          .map((participant: EventParticipant) => {
                            return {
                              id: participant.id,
                              fullName: participant.fullName,
                              avatarColor: dashboardMembers.find(
                                (member) => member.id == participant.id,
                              )?.avatarColor,
                            };
                          });
                        if (participantList && participantList.length > 0) {
                          avatarColor = participantList[0].avatarColor || '';
                        } else {
                          avatarColor = '';
                        }
                      }
                    }
                  }
                  return (
                    <li
                      key={event.id}
                      className={`text-xs list-none mb-1 ${event.type == EventCalendarType.SCHEDULE ? 'bg-[#0068b7] text-white' : 'bg-[#ebf1f4] text-[#444546]'} !rounded-[8px] pl-1.5 pt-1`}
                      onClick={() => {
                        handlePopoverClose();
                        handleEventClickInPopup(
                          `${event.type}`,
                          event.type == EventCalendarType.TASK
                            ? String(event.taskId)
                            : event.id,
                          event.type == EventCalendarType.TASK ? event.id : '',
                        );
                      }}>
                      <div className="flex items-center gap-2">
                        {checkShowUserAvatar(
                          event.type,
                          event.participants,
                        ) && (
                          <div className="relative mt-[-7px] mr-1">
                            <div>
                              {AvatarIconWithDynamicColor({
                                color: avatarColor,
                                size: 33,
                              })}
                            </div>
                            <p className="rounded-full w-4 h-4 bg-error text-[10px] text-center text-white leading-4 absolute bottom-[0px] right-[-5px]">
                              {event.participants && event.participants.length}
                            </p>
                          </div>
                        )}
                        <div className="mb-2">
                          <div className="font-semibold max-w-[200px] min-h-4 truncate">
                            {event.title || ''}
                          </div>
                          <div className="text-[11px]">{timeRange || ''}</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {popoverInfoLoading && (
                <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
              )}
              {!popoverInfoLoading &&
                session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_ADD,
                ) && (
                  <div
                    className={`mx-auto mt-3 w-fit hover:cursor-pointer hover:rounded-full p-[6px] hover:bg-gray-200 border-[1px] border-transparent`}
                    onClick={() => {
                      handlePopoverClose();
                      handleCreateNewEventFromPopup();
                    }}>
                    <ImageRound
                      src={`/icons/add.svg`}
                      name="Add"
                      className="!w-4 !h-4 text-"
                    />
                  </div>
                )}
            </div>
          </div>
        )}
        <div
          className={`transition-all duration-1000 ${showSidebar ? 'w-[24%] relative py-6 px-4 h-[1000px] shadow-lg shadow-slate-900/20 shadow-l-2 bg-[#F6F9FA]' : 'opacity-0 w-0 overflow-hidden'}`}>
          <CalendarSidebar
            dashboardMembers={dashboardMembers}
            filterMyEvent={filterMyEvent}
            filterMyTask={filterMyTask}
            getEventCalendarByUsers={getEventCalendarByUsers}
            handleFilterScheduleByUserIds={handleFilterScheduleByUserIds}
            handleGetAllMemberSchedules={handleGetAllMemberSchedules}
            handleRemoveAllMemberSchedules={handleRemoveAllMemberSchedules}
            handleToggleFilterOptions={handleToggleFilterOptions}
            removeMyselfOption={removeMyselfOption}
            searchName={searchName}
            selectedScheduleUserIds={selectedScheduleUserIds}
            setCurrentResources={setCurrentResources}
            setRemoveMyselfOption={setRemoveMyselfOption}
            setSearchName={setSearchName}
            setSelectedScheduleUserIds={setSelectedScheduleUserIds}
            setShowSidebar={setShowSidebar}
          />
        </div>
      </div>
      {openCreateEventModal && (
        <ActionsEventModal
          open={openCreateEventModal}
          dataEvent={dataEventEdit}
          defaultStartDate={defaultCreateStartDate}
          calendarView={searchParams.get('view')}
          action={actionEventClick}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEdit(undefined);
            setOpenCreateEventModal(false);
            setBackToEditing(false);
            setDefaultCreateStartDate(undefined);
          }}
          onSubmit={(data) => {
            setConfirmEventDataToCreate(data);
            setOpenCreateEventModal(false);
            setOpenConfirmCreateEventModal(true);
            setDefaultCreateStartDate(undefined);
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
      {openConfirmCreateEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmCreateEventModal}
          type={ActionsEvent.CREATE}
          onSend={() => {
            setIsLoading(true);
            handleConfirmCreateEventCalendar(
              confirmEventDataToCreate as EventFormData,
              true,
            );
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmCreateEventCalendar(
              confirmEventDataToCreate as EventFormData,
              false,
            );
          }}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEdit(undefined);
            setConfirmEventDataToCreate(undefined);
            setOpenConfirmCreateEventModal(false);
            setBackToEditing(false);
          }}
          onBackToEditModal={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmCreateEventModal(false);
            setDataEventEdit(confirmEventDataToCreate);
            setBackToEditing(true);
          }}
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
            setDataEventEdit(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmEditEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmEditEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
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
            setDataEventEdit(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmDeleteEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmDeleteEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
            if (!searchParams.get('action')) {
              handleSetEventParam({
                id: `${dataEventEdit?.id}`,
                action: ActionsEvent.EDIT,
              });
              setActionEventClick(ActionsEvent.EDIT);
            }
          }}
        />
      )}
      {showEditTaskModal && (
        <ActionsTaskModal
          open={showEditTaskModal}
          dataTask={dataTaskEdit}
          action={actionEventClick}
          dashboardMemberList={dashboardMemberList}
          creationDataTaskData={creationDataTaskData}
          onClose={() => {
            handleRemoveTaskParam();
            setDataTaskEdit(null);
          }}
          onEdit={handleConfirmEditTask}
          onDelete={() => {
            setShowEditTaskModal(false);
            setOpenConfirmDeleteTaskModal(true);
          }}
          onWarning={({
            reset,
            resetDataCategoryOptions,
          }: {
            reset: () => void;
            resetDataCategoryOptions: () => void;
          }) => {
            setResetFunctions({
              resetDataCategoryOptions,
              reset,
            });
            setOpenWarningCloseModal(true);
          }}
        />
      )}
      {openWarningCloseModal && (
        <WarningCloseTaskModal
          open={openWarningCloseModal}
          onClose={() => {
            setOpenWarningCloseModal(false);
          }}
          onConfirm={() => {
            setShowEditTaskModal(false);
            setOpenWarningCloseModal(false);
            handleRemoveTaskParam();
            setDataTaskEdit(null);
            setIsLoading(false);
            resetFunctions.resetDataCategoryOptions?.();
            resetFunctions.reset?.();
          }}
        />
      )}
      {openConfirmDeleteTaskModal && (
        <ConfirmDeleteModal
          open={openConfirmDeleteTaskModal}
          type="タスク"
          onConfirm={handleConfirmDeleteTask}
          onClose={() => {
            handleRemoveTaskParam();
            setDataEventEdit(undefined);
            setOpenConfirmDeleteTaskModal(false);
          }}
        />
      )}
      {openEventInfoModal && (
        <EventInfoModal
          dataEvent={dataEventEdit}
          top={infoModalPosition?.top}
          left={infoModalPosition?.left}
          dashboardMembers={dashboardMembers}
          checkShowUserAvatar={checkShowUserAvatar}
          onClose={() => {
            handleRemoveTaskParam();
            setDataEventEdit(undefined);
            setOpenEventInfoModal(false);
            setDefaultCreateStartDate(undefined);
            setInfoModalPosition({
              left: 0,
              top: 0,
            });
          }}
          onEdit={(data) => {
            handleSetEventParam({
              id: `${data.id}`,
              action: ActionsEvent.EDIT,
            });
            setActionEventClick(ActionsEvent.EDIT);
            setOpenCreateEventModal(true);
            setOpenEventInfoModal(false);
            setOpenConfirmEditEventModal(false);
          }}
          onDelete={(data) => {
            handleSetEventParam({
              id: `${data.id}`,
            });
            let newParticipantIds: number[] = [];
            if (data.participants) {
              newParticipantIds = data.participants.map((item) =>
                Number(item.id),
              );
            }
            let newTagIds: OptionDropdownType[] = [];
            if (data.tags) {
              newTagIds = data.tags.map((item) => ({
                label: item.name,
                value: item.id,
              }));
            }

            setConfirmEventDataToEdit({
              ...data,
              type: { label: `${data.type}`, value: `${data.type}` },
              largeCategory: {
                value: `${data.categories && data.categories.find((cat) => cat.type == EventWorkCategory.LARGE)?.name}`,
                label: `${
                  data.categories &&
                  (data.categories.find(
                    (cat) => cat.type == EventWorkCategory.LARGE,
                  )?.name as string)
                }`,
              },
              mediumCategory: {
                value: `${data.categories && data.categories.find((cat) => cat.type == EventWorkCategory.MEDIUM)?.name}`,
                label: `${
                  data.categories &&
                  (data.categories.find(
                    (cat) => cat.type == EventWorkCategory.MEDIUM,
                  )?.name as string)
                }`,
              },
              smallCategory: {
                value: `${data.categories && data.categories.find((cat) => cat.type == EventWorkCategory.SMALL)?.name}`,
                label: `${
                  data.categories &&
                  (data.categories.find(
                    (cat) => cat.type == EventWorkCategory.SMALL,
                  )?.name as string)
                }`,
              },
              participantIds: newParticipantIds,
              tagIds: newTagIds,
              endDate: new Date(`${data.endDate}`),
              endTime: new Date(`${data.endDate}`)
                .toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                })
                .replace(':', ' :'),
              startDate: new Date(`${data.startDate}`),
              startTime: new Date(`${data.startDate}`)
                .toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                })
                .replace(':', ' :'),
            });
            setOpenCreateEventModal(false);
            setOpenConfirmDeleteEventModal(true);
            setOpenEventInfoModal(false);
          }}
        />
      )}
      {openTaskInfoModal && (
        <TaskInfoModal
          dataTask={dataTaskEdit}
          selectedTaskScheduleId={selectedTaskScheduleId}
          top={infoModalPosition?.top}
          left={infoModalPosition?.left}
          onClose={() => {
            handleRemoveTaskParam();
            setOpenTaskInfoModal(false);
            setDataTaskEdit(null);
            setDefaultCreateStartDate(undefined);
            setInfoModalPosition({
              left: 0,
              top: 0,
            });
          }}
          onEdit={(data) => {
            handleSetTaskParam({
              id: `${data.id}`,
              action: ActionsEvent.EDIT,
            });
            setActionEventClick(ActionsEvent.EDIT);
            setShowEditTaskModal(true);
            setOpenTaskInfoModal(false);
          }}
          onDelete={(data) => {
            handleSetTaskParam({
              id: `${data.id}`,
            });
            setOpenTaskInfoModal(false);
            setOpenConfirmDeleteTaskModal(true);
          }}
        />
      )}
    </Fragment>
  );
};

export default EventCalendar;
