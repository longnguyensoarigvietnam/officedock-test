'use client';

import { useEffect, useRef, useState, Fragment, useContext } from 'react';
import { AxiosError } from 'axios';
import { debounce } from 'lodash';
import { isSameDay } from 'date-fns';
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
import { getHolidaysOf } from 'japanese-holidays';
import './styles/calendar.css';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import InputSearch from '@components/common/InputSearch';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';
import DatePicker from '@components/common/DatePicker';
import CalendarSkeleton from '@components/skeleton/CalendarSkeleton';
import EventInfoModal from '@components/modals/EventInfoModal';
import Button from '@components/common/Button';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { CalendarSidebar } from '@components/calendar/Sidebar';
import { EventListModal } from '@components/modals/EventListModal';
import RangeSlider from '@components/common/RangeSlider';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import useDebounceText from '@hooks/useDebounceText';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';
import { useErrorToast } from '@hooks/useErrorToast';
import useDashboardMemberList from '@hooks/useDashBoardMemberList';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import { adjustPositionForViewport, hasPermissionInArray } from '@utils';
import {
  addTimeToDate,
  convertToTimeString,
  formatHoursAndMinutesForDateTime,
  formatQueryEndDateForCalendar,
  formatQueryStartDateForCalendar,
  formatShowDeadlineAllDayEvent,
  getJapaneseDayName,
  isCurrentTimeWithinEvent,
  isMidnight,
  isMoreThanThirtyMinutes,
  removeTimeAndCompareDates,
  subtractOneDay,
} from '@utils/date';
import {
  CalendarPopoverInfo,
  EventCalendarDetail,
  EventCalendarProps,
  EventEditFormData,
  EventFormData,
  EventParticipant,
  EventRequest,
} from '@interfaces/calendar';
import { OptionDropdownType } from '@interfaces/common';
import { Organizations } from '@interfaces/organization';

import { useToast } from '@providers/ToastProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

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
  EventCalendarType,
  EventParticipantType,
  EventWorkCategory,
  PermissionsSystem,
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
  // Refs
  const calendarRef = useRef<FullCalendar | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef(null);

  // Session
  const { data: session } = useSession();

  // Open modals
  const [openCreateEventModal, setOpenCreateEventModal] =
    useState<boolean>(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [openConfirmCreateEventModal, setOpenConfirmCreateEventModal] =
    useState(false);
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openEventInfoModal, setOpenEventInfoModal] = useState<boolean>(false);

  // Event list
  const [events, setEvents] = useState<EventCalendarDetail[]>([]);

  // Event actions (edit, delete, click, filter)
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [confirmEventDataToCreate, setConfirmEventDataToCreate] =
    useState<EventFormData>();
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [backToEditing, setBackToEditing] = useState(false);
  const [dataEventEdit, setDataEventEdit] = useState<EventEditFormData>();
  const [actionEventClick, setActionEventClick] = useState<string>(
    ActionsEvent.CREATE,
  );
  const [selectedScheduleUserIds, setSelectedScheduleUserIds] =
    useState<string>(`${Number(session?.user.id)}`);
  const [selectedScheduleOrgIds, setSelectedScheduleOrgIds] =
    useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [removeMyselfOption, setRemoveMyselfOption] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<{
    eventId: number | string;
    repeatScheduleId: number | string;
  } | null>(null);

  // Display title
  const [displayYear, setDisplayYear] = useState<number>();
  const [displayMonth, setDisplayMonth] = useState<number>();
  const [displayDay, setDisplayDay] = useState<number>();

  const [showSidebar, setShowSidebar] = useState(false);
  const { creationDataEventCalendar } = useCreationDataEventCalendar({});
  const { dashboardMemberList } = useDashboardMemberList();

  // Toasts
  const { showToast } = useToast();
  const showErrorToast = useErrorToast();

  // Context
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  // Loading
  const { setIsLoading } = useContext(LoadingContext);
  const [calendarLoading, setIsCalendarLoading] = useState(false);
  const [isEventRendering, setIsEventRendering] = useState(false);
  const [popoverInfoLoading, setPopoverInfoLoading] = useState<boolean>(false);

  // Params
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();
  const actionType = searchParams.get('action');
  const eventIdURL = searchParams.get('event');
  const views = searchParams.get('view');
  const eventDetailId = eventIdURL?.replace('event', '');

  // Popup
  const [popoverInfo, setPopoverInfo] = useState<CalendarPopoverInfo | null>(
    null,
  );
  const [infoModalPosition, setInfoModalPosition] = useState<{
    top: number;
    left: number;
  }>({
    top: 0,
    left: 0,
  });

  // Resources
  const [currentResources, setCurrentResources] = useState<
    {
      id: string;
      title: string;
    }[]
  >([]);

  // Date range
  const [defaultCreateStartDate, setDefaultCreateStartDate] = useState<
    Date | undefined
  >();

  // Zoom
  const screenHeight = window.innerHeight;

  const baseHeight = Math.round(43 * (screenHeight / 717));
  const baseSlider = Math.round(43 * (screenHeight / 717));
  const [resetTrigger, _setResetTrigger] = useState(0);
  const [isOptionZoomSchedule, setIsOptionZoomSchedule] = useState('00:15:00');

  const [sliderValue, setSliderValue] = useState(baseSlider);
  const [slotHeight, setSlotHeight] = useState(baseHeight);

  // Get authenticated user
  const { authenticatedUser } = useAuthenticatedUser({
    onSuccess: (data) => {
      setCurrentResources((prevCurrentResources) => {
        const existedResource = prevCurrentResources.find(
          (resource) => resource.id == String(data.id),
        );
        if (!existedResource) {
          return [
            ...prevCurrentResources,
            {
              id: String(data.id),
              title: String(data.profile.fullName),
            },
          ];
        }
        return [...prevCurrentResources];
      });
      const currentView = searchParams.get('view');
      switch (currentView) {
        case ViewOptions.WEEK:
          handleViewChange(CalendarViewOptions.VIEW_BY_WEEK);
          break;
        case ViewOptions.DAY:
          handleViewChange(CalendarViewOptions.VIEW_BY_DAY);
          break;
        case ViewOptions.YEAR:
          handleViewChange(CalendarViewOptions.VIEW_BY_YEAR);
          break;
        default:
          handleViewChange(CalendarViewOptions.VIEW_BY_MONTH);
      }
    },
  });

  // Check whether current screen is day or week view
  const isDayOrWeekView = () => {
    return (
      watch('calendarView') &&
      (watch('calendarView').value == CalendarViewOptions.VIEW_BY_DAY ||
        watch('calendarView').value == CalendarViewOptions.VIEW_BY_WEEK)
    );
  };

  // Fetch calendar data using debounce
  const debouncedFetchCalendarData = useRef(
    debounce(
      async ({
        startDate,
        endDate,
        keySearch,
        selectedScheduleUserIds,
        date,
        clientX,
        clientY,
        isYearView,
      }: {
        startDate: string;
        endDate: string;
        keySearch: string;
        selectedScheduleUserIds: any;
        date?: Date;
        clientX?: number;
        clientY?: number;
        isYearView?: boolean;
      }) => {
        const updatedUserIds: string[] = selectedScheduleUserIds
          ? selectedScheduleUserIds.split(',').filter(Boolean)
          : [];

        await getEventCalendarByUsers({
          userId: updatedUserIds.join(','),
          startDate,
          endDate,
          isYearView,
          date,
          clientX,
          clientY,
          keySearch,
        });

        setPopoverInfoLoading(false);
        setIsEventRendering(false);
      },
      1000,
    ),
  ).current;

  // Handle prev
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

      debouncedFetchCalendarData({
        startDate: startDateISOString,
        endDate: endDateISOString,
        selectedScheduleUserIds: selectedScheduleUserIds,
        keySearch: keySearch,
      });
      if (isDayOrWeekView()) scrollToCurrentTime();
    }
  };

  // Handle next
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

      debouncedFetchCalendarData({
        startDate: startDateISOString,
        endDate: endDateISOString,
        selectedScheduleUserIds: selectedScheduleUserIds,
        keySearch: keySearch,
      });
      if (isDayOrWeekView()) scrollToCurrentTime();
    }
  };

  // Handle navigate to today view
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

      debouncedFetchCalendarData({
        startDate: startDateISOString,
        endDate: endDateISOString,
        selectedScheduleUserIds: selectedScheduleUserIds,
        keySearch: keySearch,
      });
      if (isDayOrWeekView()) scrollToCurrentTime();
    }
  };

  // Handle navigate to specific day
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

      debouncedFetchCalendarData({
        startDate: startDateISOString,
        endDate: endDateISOString,
        selectedScheduleUserIds: selectedScheduleUserIds,
        keySearch: keySearch,
      });
      if (isDayOrWeekView()) scrollToCurrentTime();
    }
  };

  // Show events in year view
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

      debouncedFetchCalendarData({
        startDate: startDateISOString,
        endDate: endDateISOString,
        selectedScheduleUserIds: selectedScheduleUserIds,
        keySearch: keySearch,
        date: date,
        clientX: clientX,
        clientY: clientY,
        isYearView: true,
      });
    }
  };

  // Handle view change
  const handleViewChange = async (calendarView: string) => {
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

      if (calendarView !== CalendarViewOptions.VIEW_BY_YEAR) {
        const updatedUserIds: string[] = selectedScheduleUserIds
          ? selectedScheduleUserIds.split(',').filter(Boolean)
          : [];

        await getEventCalendarByUsers({
          userId: updatedUserIds.join(','),
          startDate: startDateISOString,
          endDate: endDateISOString,
          keySearch: keySearch,
        });
      }

      setIsEventRendering(false);
      if (isDayOrWeekView()) scrollToCurrentTime();
    }
  };

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

  // Scroll to current time
  const scrollToCurrentTime = () => {
    setTimeout(() => {
      const nowIndicator = document.querySelector(
        '.fc-timegrid-now-indicator-arrow',
      );
      const scroller = nowIndicator?.closest('.fc-scroller');

      if (nowIndicator && scroller) {
        const targetTop = (nowIndicator as HTMLElement).offsetTop;
        const scrollerEl = scroller as HTMLElement;

        const centerOffset = targetTop - scrollerEl.clientHeight / 2;

        scrollerEl.scrollTo({
          top: centerOffset,
          behavior: 'smooth',
        });
      }
    }, 500);
  };

  // Check to show user's avatar
  const checkShowUserAvatar = (
    type?: EventCalendarType,
    participants?: EventParticipant[],
  ) => {
    const filteredUserIds = selectedScheduleUserIds
      .split(',')
      .map((num) => num.trim())
      .filter(Boolean);
    return (
      !(
        participants?.length == 1 &&
        participants.find(
          (participant: EventParticipant) => participant.id == session?.user.id,
        )
      ) &&
      type == EventCalendarType.SCHEDULE &&
      filteredUserIds.length > 0
    );
  };

  // Show user's avatar
  const showUserAvatars = (
    participantList: EventParticipant[],
    avatarSize: number,
    borderClassName: string,
    isWeekView?: boolean,
    isWeekViewAllDaySection?: boolean,
  ) => {
    if (participantList && participantList.length > 0) {
      if (participantList.length == 1) {
        const memberInfo = dashboardMembersWithAvatars.find(
          (member) => member.id == participantList[0].id,
        );
        return (
          <DynamicTooltip
            content={`${participantList[0].fullName}`}
            placement="top">
            <div
              className={`border-[1px] border-white rounded-full ${borderClassName}`}>
              <CustomUserAvatar
                avatarUrl={memberInfo?.avatar || ''}
                avatarColor={memberInfo?.avatarColor || ''}
                size={avatarSize}
                isCalendarScreen={true}
              />
            </div>
          </DynamicTooltip>
        );
      } else if (participantList.length === 2) {
        return (
          <div className="mr-1 flex items-center">
            {participantList.map((participant, index) => {
              const memberInfo = dashboardMembersWithAvatars.find(
                (member) => member.id === participant.id,
              );

              return (
                <DynamicTooltip
                  content={`${participant.fullName}`}
                  placement="top"
                  key={participant.id}>
                  <div
                    className={`border-[1px] border-white rounded-full ${borderClassName} ${index != 0 && 'ml-[-7px]'}`}>
                    <CustomUserAvatar
                      avatarUrl={memberInfo?.avatar || ''}
                      avatarColor={memberInfo?.avatarColor || ''}
                      size={avatarSize}
                      isCalendarScreen={true}
                    />
                  </div>
                </DynamicTooltip>
              );
            })}
          </div>
        );
      } else if (participantList.length > 2) {
        return (
          <div className={`mr-1 flex items-center ${!isWeekView && 'gap-1'}`}>
            {participantList
              .slice(0, isWeekView ? 5 : 1)
              .map((participant, index) => {
                const memberInfo = dashboardMembersWithAvatars.find(
                  (member) => member.id === participant.id,
                );

                return (
                  <DynamicTooltip
                    content={`${participant.fullName}`}
                    placement="top"
                    key={participant.id}>
                    <div
                      className={`border-[1px] border-white rounded-full ${borderClassName} ${index != 0 && 'ml-[-7px]'}`}>
                      <CustomUserAvatar
                        avatarUrl={memberInfo?.avatar || ''}
                        avatarColor={memberInfo?.avatarColor || ''}
                        size={avatarSize}
                        isCalendarScreen={true}
                      />
                    </div>
                  </DynamicTooltip>
                );
              })}
            {isWeekView
              ? participantList &&
                participantList.length > 5 && (
                  <DynamicTooltip
                    content={`他に${participantList.length - 5}人の表示があります`}
                    placement="top">
                    <div
                      className={`text-[#77858F] text-[11px] font-medium ml-[-12px] ${isWeekView && 'border-[1px] !ml-[-12px] border-white text-white rounded-full shrink-0 !w-[33px] !h-[33px] bg-[#77858F] flex items-center justify-center'}`}>
                      +{participantList.length - 5}
                    </div>
                  </DynamicTooltip>
                )
              : participantList &&
                participantList.length > 1 && (
                  <DynamicTooltip
                    content={`他に${participantList.length - 1}人の表示があります`}
                    placement="top">
                    <div
                      className={`text-[#77858F] text-[11px] font-medium ${isWeekViewAllDaySection && 'border-[1px] !ml-[-12px] !text-[9px] text-white shrink-0 border-white rounded-full !w-[19px] !h-[19px] bg-[#77858F] flex items-center justify-center'} `}>
                      +{participantList.length - 1}
                    </div>
                  </DynamicTooltip>
                )}
          </div>
        );
      }
    }
  };

  const handleEventContent = (eventContent: any) => {
    if (eventContent.event.id.startsWith('loading')) {
      return <RowSkeleton className="w-full h-[31px] mb-1" />;
    } else {
      const calendarApi = eventContent.view.calendar;
      const currentView = calendarApi.view.type;

      if (currentView === CalendarViewOptions.VIEW_BY_WEEK) {
        if (eventContent.event.allDay) {
          if (
            eventContent.event.extendedProps.type == EventCalendarType.HOLIDAY
          ) {
            return (
              <div className="rounded-sm hover:cursor-pointer mb-1 overflow-hidden">
                <p
                  className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-error font-semibold px-1 text-[12px]`}>
                  {eventContent.event.title != 'null'
                    ? eventContent.event.title
                    : ''}
                </p>
              </div>
            );
          }

          return (
            <div className="mb-1 hover:cursor-pointer">
              <div
                className={` text-black bg-white overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}
                style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                {checkShowUserAvatar(
                  eventContent.event.extendedProps.type,
                  eventContent.event.extendedProps.participants,
                ) ? (
                  <div className="flex items-center gap-1">
                    {showUserAvatars(
                      eventContent.event.extendedProps.participants,
                      21,
                      '!w-[21px] !h-[21px]',
                      false,
                      true,
                    )}
                    <p className="truncate max-w-[100%] font-semibold mt-0.5 pt-0.5 h-[25px]">
                      {eventContent.event.title !== 'null'
                        ? eventContent.event.title
                        : ''}
                    </p>
                  </div>
                ) : (
                  <p className="truncate max-w-[100%] mt-0.5 font-semibold pt-0.5 h-[25px]">
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
            className={`overflow-hidden p-1.5 ${isCurrentTimeWithinEvent({ start: eventContent.event.start, end: eventContent.event.end }) && 'event-has-now-indicator'}`}>
            {checkShowUserAvatar(
              eventContent.event.extendedProps.type,
              eventContent.event.extendedProps.participants,
            ) &&
              showUserAvatars(
                eventContent.event.extendedProps.participants,
                32,
                '!w-[32px] !h-[32px]',
                true,
                false,
              )}
            <div className={` text-black text-[14px] font-medium px-1`}>
              <p className="font-semibold min-h-5">
                {eventContent.event.title != 'null'
                  ? eventContent.event.title
                  : ''}
              </p>
            </div>
            <div className={` text-black text-[12px] font-normal px-1`}>
              {new Date(eventContent.event.start).getDate() !=
              new Date(eventContent.event.end).getDate() ? (
                <>
                  <p className="whitespace-nowrap">
                    {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.start))}`}{' '}
                    ~{' '}
                    {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.end))}`}
                  </p>
                  <p className={` text-black text-[12px] font-normal px-1`}>
                    {eventContent.event.extendedProps.address}
                  </p>
                </>
              ) : (
                <>
                  {isMoreThanThirtyMinutes(eventContent.timeText) && (
                    <>
                      <p>{eventContent.timeText}</p>
                      <p className={` text-black text-[12px] font-normal px-1`}>
                        {eventContent.event.extendedProps.address}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      } else if (currentView === CalendarViewOptions.VIEW_BY_DAY) {
        if (eventContent.event.allDay) {
          if (
            eventContent.event.extendedProps.type == EventCalendarType.HOLIDAY
          ) {
            return (
              <div className="rounded-sm hover:cursor-pointer mb-1 overflow-hidden">
                <p
                  className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-error font-semibold px-1 text-[12px]`}>
                  {eventContent.event.title != 'null'
                    ? eventContent.event.title
                    : ''}
                </p>
              </div>
            );
          }

          const end = new Date(eventContent.event?.end);
          const start = new Date(eventContent.event?.start);
          if (start.toDateString() !== end.toDateString()) {
            end.setDate(end.getDate() - 1);
          }
          return (
            <div className="mb-1 hover:cursor-pointer">
              <div
                className={`text-black bg-white flex gap-2 items-center overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}
                style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                <p className="truncate max-w-[calc(100%)] font-semibold mt-0.5 pt-0.5 h-[25px]">
                  {eventContent.event.title !== 'null'
                    ? eventContent.event.title
                    : ''}
                </p>
                <div className="flex gap-2">
                  <p>終日</p>
                  <p>{`${formatShowDeadlineAllDayEvent(start)} ~ ${formatShowDeadlineAllDayEvent(end)}`}</p>
                </div>
              </div>{' '}
            </div>
          );
        }

        return (
          <div
            className={`overflow-hidden ${isCurrentTimeWithinEvent({ start: eventContent.event.start, end: eventContent.event.end }) && 'event-has-now-indicator'}`}>
            <div className={` text-black font-medium px-1 pt-1 text-[14px]`}>
              <p className="truncate max-w-[calc(100%)] font-semibold min-h-5">
                {eventContent.event.title != 'null'
                  ? eventContent.event.title
                  : ''}
              </p>
            </div>{' '}
            <div className={` text-black text-[12px] font-normal px-1`}>
              {new Date(eventContent.event.start).getDate() !=
              new Date(eventContent.event.end).getDate() ? (
                <>
                  <p className="whitespace-nowrap">
                    {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.start))}`}{' '}
                    ~{' '}
                    {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.end))}`}
                  </p>
                  <p>{eventContent.event.extendedProps.address}</p>
                </>
              ) : (
                <>
                  {isMoreThanThirtyMinutes(eventContent.timeText) && (
                    <div className="text-black text-[12px] font-normal px-1">
                      <p>{eventContent.timeText}</p>
                      <p>{eventContent.event.extendedProps.address}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      } else if (currentView === CalendarViewOptions.VIEW_BY_MONTH) {
        if (
          eventContent.event.allDay ||
          new Date(eventContent.event.start).getDate() !=
            new Date(eventContent.event.end).getDate()
        ) {
          if (
            eventContent.event.extendedProps.type == EventCalendarType.HOLIDAY
          ) {
            return (
              <div className="rounded-sm hover:cursor-pointer mb-1 overflow-hidden">
                <p
                  className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-error font-semibold px-1 text-[12px]`}>
                  {eventContent.event.title != 'null'
                    ? eventContent.event.title
                    : ''}
                </p>
              </div>
            );
          }

          return (
            <div
              className={`fc-daygrid-event mb-1 ${eventContent.event.allDay && 'hover:cursor-pointer'}`}>
              <div
                className={`text-black bg-white overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}
                style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                {checkShowUserAvatar(
                  eventContent.event.extendedProps.type,
                  eventContent.event.extendedProps.participants,
                ) ? (
                  <div className="flex items-center gap-1">
                    {showUserAvatars(
                      eventContent.event.extendedProps.participants,
                      21,
                      '!w-[21px] !h-[21px]',
                      false,
                      false,
                    )}
                    <p className="truncate max-w-[100%] font-semibold mt-0.5 pt-0.5 h-[25px]">
                      {eventContent.event.title !== 'null'
                        ? eventContent.event.title
                        : ''}
                    </p>
                  </div>
                ) : (
                  <p className="truncate max-w-[100%] font-semibold mt-0.5 pt-0.5 h-[25px]">
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
                className={`text-black py-0.5 flex items-center gap-1 font-normal text-[12px]`}>
                <div
                  className={`notification-dot bg-[#9fa1a2] !w-2 !h-2 ml-1 rounded-full`}
                />
                <p>{eventContent.timeText}</p>
              </div>{' '}
              <p
                className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-black font-semibold px-1 text-[12px]`}>
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

  // Handle click to more link button
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
            const shouldAdjustEnd =
              !isSameDay(eventStart, eventEnd) &&
              !isMidnight(eventEnd) &&
              event.allDay;

            const adjustedEnd = shouldAdjustEnd
              ? subtractOneDay(String(event.end))
              : eventEnd;
            const adjustedEndISOString = shouldAdjustEnd
              ? subtractOneDay(String(event.end)).toISOString()
              : event.end;

            if (removeTimeAndCompareDates(eventStart, adjustedEnd, clickDate)) {
              if (
                searchParams.get('view') == ViewOptions.WEEK ||
                searchParams.get('view') == ViewOptions.DAY
              ) {
                if (event.allDay) {
                  filterEvents.push({
                    id: `${event.id}`,
                    title: event.title,
                    start: event.start,
                    end: adjustedEndISOString,
                    type: event.type,
                    participants: event.participants || [],
                    address: event.address || '',
                  });
                }
              } else {
                filterEvents.push({
                  id: `${event.id}`,
                  title: event.title,
                  start: event.start,
                  end: adjustedEndISOString,
                  type: event.type,
                  participants: event.participants || [],
                  address: event.address || '',
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

  // Handle close popup
  const handlePopoverClose = () => {
    setPopoverInfo(null);
  };

  // Show events in modal
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
        const shouldAdjustEnd =
          !isSameDay(eventStart, eventEnd) &&
          !isMidnight(eventEnd) &&
          event.allDay;

        const adjustedEnd = shouldAdjustEnd
          ? subtractOneDay(event.end)
          : eventEnd;
        const adjustedEndISOString = shouldAdjustEnd
          ? subtractOneDay(event.end).toISOString()
          : event.end;
        if (removeTimeAndCompareDates(eventStart, adjustedEnd, clickDate)) {
          filterEvents.push({
            eventId: `${event.eventId}`,
            repeatScheduleId: `${event.id}`,
            title: event.title,
            start: event.start,
            end: adjustedEndISOString,
            type: event.type,
            participants: event.participants || [],
            address: event.address || '',
            allDay: event.allDay,
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
        5,
      ).left,
      top: adjustPositionForViewport(
        {
          top: Number(clientY),
          left: Number(clientX),
        },
        6,
      ).top,
    });
  };

  // Get holiday events
  const getHolidayEvents = (startDate: string, endDate: string) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const currentYear = calendarApi.view.currentStart.getFullYear();
      const holidayList = getHolidaysOf(Number(currentYear));
      const holidayEvents = holidayList
        .filter((holiday) => {
          const holidayDate = `${currentYear}-${String(holiday.month).padStart(2, '0')}-${String(
            holiday.date,
          ).padStart(2, '0')}T00:00:00`;

          return removeTimeAndCompareDates(
            new Date(startDate),
            new Date(endDate),
            new Date(holidayDate),
          );
        })
        .map((holiday) => {
          return {
            title: holiday.name,
            start: `${currentYear}-${String(holiday.month).padStart(2, '0')}-${String(
              holiday.date,
            ).padStart(2, '0')}T00:00:00`,
            end: `${currentYear}-${String(holiday.month).padStart(2, '0')}-${String(
              holiday.date,
            ).padStart(2, '0')}T23:59:59`,
            allDay: true,
            id: `holiday-${holiday.month}-${holiday.date}`,
            type: EventCalendarType.HOLIDAY,
            participants: dashboardMembersWithAvatars.map((member) => {
              return {
                id: member.id,
                fullName: member.fullName,
                avatar: member?.avatar || '',
                avatarColor: member?.avatarColor || '',
              };
            }),
            address: '',
            resourceIds: dashboardMembersWithAvatars.map((member) =>
              String(member.id),
            ),
          };
        });

      return holidayEvents || [];
    }
    return [];
  };

  // Get events by users
  const handleGetEventCalendarByUsers = async ({
    userId,
    startDate,
    endDate,
  }: {
    userId: string;
    startDate: string;
    endDate: string;
    isYearView?: boolean;
    date?: Date;
    clientX?: number;
    clientY?: number;
    keySearch: string;
  }) => {
    const apiUrl = `${apiRouters.SCHEDULES}?${userId ? `&user_ids=${userId}` : ''}${startDate && `&start_date=${startDate}`}${endDate && `&end_date=${endDate}`}${keySearch ? `&search=${keySearch}` : ''}`;
    const { data } = await api.get(apiUrl);
    return data;
  };

  const { mutateAsync: getEventCalendarByUsers } = useMutation(
    'getEventCalendarByUsers',
    handleGetEventCalendarByUsers,
    {
      onSuccess: (data, variables) => {
        if (data) {
          const eventList: EventCalendarDetail[] = data.flatMap(
            (event: EventCalendarProps) =>
              event.repeatSchedules &&
              event.repeatSchedules.map((schedule) => {
                const checkShowMyEventResource =
                  event.participants?.find(
                    (participant) => participant.id == session?.user.id,
                  ) && variables.userId.includes(String(session?.user.id));
                return {
                  title: event.title,
                  start: `${schedule.planStartDate}`,
                  end: `${schedule.planEndDate}`,
                  allDay: event.isAllDay || false,
                  id: `${schedule.id}`,
                  eventId: event.id,
                  type: EventCalendarType.SCHEDULE,
                  participants: event.participants || [],
                  address: event.address || '',
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
              }),
          );
          const newEvents = eventList.map((event) => {
            const start = new Date(event.start);

            if (event.end) {
              const end = new Date(event.end);
              if (
                (start.toDateString() !== end.toDateString() && event.allDay) ||
                isMidnight(new Date(event.end))
              ) {
                end.setDate(end.getDate() + 1);
                event.end = end;
              }
            }
            return event;
          });

          // Holiday list
          const holidayList = getHolidayEvents(
            variables.startDate as string,
            variables.endDate as string,
          );

          setEvents(() => {
            if (variables.isYearView) {
              handleShowEventsInModal(
                [...newEvents],
                variables.date as Date,
                Number(variables.clientX),
                Number(variables.clientY),
              );
            }
            return [...newEvents, ...holidayList];
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  // Filter events by users
  const handleFilterScheduleByUserIds = (
    member: EventParticipant,
    dataOptionsParticipants: EventParticipant[],
  ) => {
    let updatedUserIds: number[] = selectedScheduleUserIds
      ? selectedScheduleUserIds
          .split(',')
          .filter(Boolean)
          .map((id) => Number(id))
      : [];
    let updatedOrgIds: number[] = selectedScheduleOrgIds
      ? selectedScheduleOrgIds
          .split(',')
          .filter(Boolean)
          .map((id) => Number(id))
      : [];
    const isUser = member.type === EventParticipantType.USER;
    const isOrganization = member.type === EventParticipantType.ORGANIZATION;
    const memberId = Number(member.id);

    if (isUser) {
      const isAlreadySelected = selectedScheduleUserIds.includes(
        String(memberId),
      );

      if (isAlreadySelected) {
        // Remove the user
        updatedUserIds = updatedUserIds.filter((id) => id !== memberId);

        // Remove any org that includes the removed user
        const belongedOrganizations = dataOptionsParticipants
          .filter(
            (participant) =>
              participant.type == EventParticipantType.ORGANIZATION &&
              participant.userIds?.includes(Number(member.id)),
          )
          .map((org) => org.id as number);
        updatedOrgIds = updatedOrgIds.filter(
          (org) => !belongedOrganizations.includes(org),
        );
      } else {
        updatedUserIds.push(memberId);
      }
    } else if (isOrganization) {
      const isAlreadySelected = selectedScheduleOrgIds.includes(
        String(memberId),
      );
      const organizationMembers = member.userIds || [];

      if (isAlreadySelected) {
        // Remove the deselected organization
        updatedOrgIds = updatedOrgIds.filter((id) => id !== memberId);

        // Collect member IDs that should be removed (if not in any other selected org)
        const removeMemberIds = organizationMembers.filter((memberId) => {
          return !updatedOrgIds.some((orgId) => {
            const org = dataOptionsParticipants.find(
              (item) =>
                Number(item.id) === orgId &&
                item.type === EventParticipantType.ORGANIZATION,
            );
            return org?.userIds?.includes(memberId);
          });
        });

        // Remove the filtered member IDs from selected users
        updatedUserIds = updatedUserIds.filter(
          (id) => !removeMemberIds.includes(id),
        );
      } else {
        updatedOrgIds.push(memberId);
        if (
          removeMyselfOption &&
          organizationMembers.includes(Number(session?.user.id))
        ) {
          updatedUserIds = Array.from(
            new Set([
              ...updatedUserIds,
              ...organizationMembers.filter(
                (memberId) => memberId != Number(session?.user.id),
              ),
            ]),
          );
        } else {
          updatedUserIds = Array.from(
            new Set([...updatedUserIds, ...organizationMembers]),
          );
        }
      }
    }

    setSelectedScheduleUserIds(updatedUserIds.join(','));
    setSelectedScheduleOrgIds(updatedOrgIds.join(','));
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );
      getEventCalendarByUsers({
        userId:
          `${updatedUserIds.join(',')}`.length > 0
            ? `${updatedUserIds.join(',')}`
            : ``,
        startDate: startDateISOString,
        endDate: endDateISOString,
        keySearch: keySearch,
      });
    }
    setCurrentResources(() => {
      return updatedUserIds.map((userId) => {
        return {
          id: String(userId),
          title:
            dashboardMemberList?.find(
              (member) => String(member.id) == String(userId),
            )?.fullName || '',
        };
      });
    });
  };

  // Handle get all member events
  const handleGetAllMemberSchedules = (
    dataOptionsParticipants: EventParticipant[],
  ) => {
    const updatedParticipantList = dataOptionsParticipants?.filter((member) =>
      member.fullName.toLowerCase().includes(searchName.toLowerCase()),
    );
    const currentSelectedUserIds = selectedScheduleUserIds
      ? selectedScheduleUserIds.split(',').filter(Boolean)
      : [];
    const currentSelectedOrgIds = selectedScheduleOrgIds
      ? selectedScheduleOrgIds.split(',').filter(Boolean)
      : [];
    let updatedParticipantIds: number[] = [];
    if (removeMyselfOption) {
      updatedParticipantIds = [
        ...currentSelectedUserIds,
        ...updatedParticipantList
          .filter(
            (participant) => participant.type === EventParticipantType.USER,
          )
          .map((participant) => Number(participant.id)),
      ]
        .filter((id) => id != Number(session?.user.id))
        .map(Number);
    } else {
      updatedParticipantIds = [
        ...currentSelectedUserIds,
        ...updatedParticipantList
          .filter(
            (participant) => participant.type === EventParticipantType.USER,
          )
          .map((participant) => Number(participant.id)),
      ].map(Number);
    }

    setSelectedScheduleUserIds(updatedParticipantIds.join(','));
    setSelectedScheduleOrgIds(
      [
        ...(currentSelectedOrgIds || []),
        ...updatedParticipantList
          .filter(
            (participant) =>
              participant.type === EventParticipantType.ORGANIZATION,
          )
          .map((participant) => Number(participant.id)),
      ].join(','),
    );

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      getEventCalendarByUsers({
        userId:
          `${updatedParticipantIds.join(',')}`.length > 0
            ? `${updatedParticipantIds.join(',')}`
            : ``,
        startDate: startDateISOString,
        endDate: endDateISOString,
        keySearch: keySearch,
      });
    }
    setCurrentResources(() => {
      const updatedResources: { id: string; title: string }[] = [];

      [...updatedParticipantIds].forEach((userId) => {
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
  };

  // Handle remove all member events
  const handleRemoveAllMemberSchedules = (
    dataOptionsParticipants: EventParticipant[],
  ) => {
    const matchingParticipantList = dataOptionsParticipants?.filter((member) =>
      member.fullName.toLowerCase().includes(searchName.toLowerCase()),
    );
    const currentSelectedUserIds = selectedScheduleUserIds
      ? selectedScheduleUserIds.split(',').filter(Boolean)
      : [];
    const currentSelectedOrgIds = selectedScheduleOrgIds
      ? selectedScheduleOrgIds.split(',').filter(Boolean)
      : [];

    const filteredParticipantIds = currentSelectedUserIds.filter(
      (participantId) =>
        !matchingParticipantList.find(
          (matchingParticipant) =>
            matchingParticipant.id == participantId &&
            matchingParticipant.type === EventParticipantType.USER,
        ),
    );
    const filteredOrganizationIds = currentSelectedOrgIds.filter(
      (participantId) =>
        !matchingParticipantList.find(
          (matchingParticipant) =>
            matchingParticipant.id == participantId &&
            matchingParticipant.type === EventParticipantType.ORGANIZATION,
        ),
    );
    setSelectedScheduleUserIds(filteredParticipantIds.join(','));
    setSelectedScheduleOrgIds(filteredOrganizationIds.join(','));

    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      getEventCalendarByUsers({
        userId: filteredParticipantIds.join(','),
        startDate: startDateISOString,
        endDate: endDateISOString,
        keySearch: keySearch,
      });
    }

    setCurrentResources(() => {
      const updatedResources: { id: string; title: string }[] = [];

      filteredParticipantIds.forEach((userId) => {
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
  };

  // Get event detail
  const handleGetDataDetailEvent = async (data: {
    eventId: string;
    repeatScheduleId: string;
  }) => {
    const { data: response } = await api.get(
      `${apiRouters.SCHEDULE_DETAIL(data.eventId)}${data.repeatScheduleId ? `?repeat_schedule_id=${data.repeatScheduleId}` : ''}`,
    );
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

  const handleConfirmGetDataDetailEvent = (
    eventId: string,
    repeatScheduleId: string,
  ) => {
    getDataDetailEvent({ eventId, repeatScheduleId });
  };

  const { mutate: getDataEventInfo } = useMutation(
    'getDataEventInfo',
    handleGetDataDetailEvent,
    {
      onSuccess: async (data) => {
        setOpenEventInfoModal(true);
        setDataEventEdit({
          ...data,
          startDate: data.repeatSchedules.planStartDate,
          endDate: data.repeatSchedules.planEndDate,
        });
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

  const handleConfirmGetDataEventInfo = (
    eventId: string,
    repeatScheduleId: string,
  ) => {
    getDataEventInfo({ eventId, repeatScheduleId });
  };

  // Handle click in event
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event?.extendedProps?.eventId || '';
    const repeatScheduleId = clickInfo.event?.id || '';

    setSelectedEventId({
      eventId,
      repeatScheduleId,
    });

    if (
      searchParams.get('view') == ViewOptions.DAY ||
      searchParams.get('view') == ViewOptions.WEEK ||
      searchParams.get('view') == ViewOptions.MONTH
    ) {
      if (clickInfo.event.extendedProps.type === EventCalendarType.SCHEDULE) {
        handleConfirmGetDataEventInfo(eventId, repeatScheduleId);
      }
      setInfoModalPosition({
        left: adjustPositionForViewport(
          {
            top: Number(clickInfo.jsEvent.clientY),
            left: Number(clickInfo.jsEvent.clientX),
          },
          5,
        ).left,
        top: adjustPositionForViewport(
          {
            top: Number(clickInfo.jsEvent.clientY),
            left: Number(clickInfo.jsEvent.clientX),
          },
          6,
        ).top,
      });
    } else {
      setPopoverInfo(null);
      if (clickInfo.event.extendedProps.type === EventCalendarType.SCHEDULE) {
        handleSetEventParam({
          id: `${clickInfo.event.id}`,
          action: ActionsEvent.EDIT,
        });
        handleConfirmGetDataDetailEvent(eventId, repeatScheduleId);
      }
      setActionEventClick(ActionsEvent.EDIT);
    }
  };

  // Handle click in popup
  const handleEventClickInPopup = (
    eventId: string,
    repeatScheduleId: string,
  ) => {
    setSelectedEventId({
      eventId,
      repeatScheduleId,
    });
    handleConfirmGetDataEventInfo(eventId, repeatScheduleId);
  };

  useEffect(() => {
    if (eventDetailId && dataEventEdit === undefined && actionType) {
      setActionEventClick(actionType);

      getDataDetailEvent({
        eventId: eventDetailId.replace('event', ''),
        repeatScheduleId: '',
      });
    }
    if (actionType === ActionsEvent.CREATE) {
      setOpenCreateEventModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDataDetailEvent, eventDetailId, actionType]);

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

  const { control, watch } = useForm({
    mode: 'onSubmit',
  });

  const calendarViewOptions = [
    {
      value: CalendarViewOptions.VIEW_BY_DAY,
      label: '日',
    },
    {
      value: CalendarViewOptions.VIEW_BY_WEEK,
      label: '週',
    },
    {
      value: CalendarViewOptions.VIEW_BY_MONTH,
      label: '月',
    },
    {
      value: CalendarViewOptions.VIEW_BY_YEAR,
      label: '年',
    },
  ];

  // Get calendar initial view
  const getCalendarInitialView = () => {
    const currentView = searchParams.get('view');
    if (currentView) {
      switch (currentView) {
        case ViewOptions.WEEK:
          return CalendarViewOptions.VIEW_BY_WEEK;
        case ViewOptions.DAY:
          return CalendarViewOptions.VIEW_BY_DAY;
        case ViewOptions.YEAR:
          return CalendarViewOptions.VIEW_BY_YEAR;
        default:
          return CalendarViewOptions.VIEW_BY_MONTH;
      }
    }
  };

  // Handle date click
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

  // Create new event from popup
  const handleCreateNewEventFromPopup = () => {
    setActionEventClick(ActionsEvent.CREATE);
    setDataEventEdit(undefined);
    handleSetEventParam({
      id: null,
      action: ActionsEvent.CREATE,
    });
    setOpenCreateEventModal(true);
  };

  // Create event
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
      selectOrganizations: data.selectOrganizations || [],
      address: data.address || '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
      repeatType:
        data.repeatType && data.repeatType.value
          ? String(data.repeatType.value)
          : null,
      repeatInterval:
        data.repeatInterval && data.repeatInterval.value
          ? Number(data.repeatInterval.value)
          : null,
      weekDay:
        data.weekDay && data.weekDay.label != ''
          ? Number(data.weekDay.value)
          : null,
      monthDay:
        data.monthDay && data.monthDay.value != ''
          ? Number(data.monthDay.value)
          : null,
      month:
        data.month && data.month.value != '' ? Number(data.month.value) : null,
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
          isMyEvent ||
          (isMyEvent && updatedUserIds.includes(String(session?.user.id))) ||
          isOtherMembersEvent
        ) {
          const checkShowMyEventResource =
            data.participants?.find(
              (participant: EventParticipant) =>
                participant.id == session?.user.id,
            ) && selectedScheduleUserIds.includes(String(session?.user.id));
          setEvents((prevEvents) => {
            const newEventData =
              data.repeatSchedules &&
              data.repeatSchedules.map(
                (schedule: {
                  id: number;
                  planEndDate: Date | null;
                  planStartDate: Date | null;
                  schedule: number;
                  uuid: string;
                }) => {
                  const dataEndDate =
                    schedule.planStartDate &&
                    schedule.planEndDate &&
                    ((new Date(schedule.planStartDate).toDateString() !==
                      new Date(schedule.planEndDate).toDateString() &&
                      data.isAllDay) ||
                      isMidnight(new Date(schedule.planEndDate)))
                      ? new Date(schedule.planEndDate).setDate(
                          new Date(schedule.planEndDate).getDate() + 1,
                        )
                      : schedule.planEndDate;
                  return {
                    id: `${schedule.id}`,
                    eventId: data.id,
                    title: data.title,
                    start: schedule.planStartDate,
                    end: dataEndDate,
                    allDay: data.isAllDay,
                    type: EventCalendarType.SCHEDULE,
                    isMyEvent: isMyEvent,
                    address: data.address,
                    participants: data.participants,
                    resourceIds: [
                      ...(data.participants
                        ?.filter(
                          (participant: EventParticipant) =>
                            participant.id !== session?.user.id,
                        )
                        ?.map(
                          (participant: EventParticipant) => participant.id,
                        ) ?? []),
                      ...(checkShowMyEventResource
                        ? [Number(session?.user.id)]
                        : []),
                    ],
                  };
                },
              );

            const updatedEvents = [...prevEvents, ...newEventData];
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

  // Edit event
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
    if (data.isAllDay) {
      newStartDate = addTimeToDate(
        (data.startDate as Date) || new Date(),
        DEFAULT_START_TIME,
      );
      newEndDate = addTimeToDate(
        (data.endDate as Date) || new Date(),
        DEFAULT_END_TIME,
      );
    } else {
      if (data.startTime) {
        newStartDate = addTimeToDate(
          (data.startDate as Date) || new Date(),
          data.startTime,
        );
      }
      if (data.endTime) {
        newEndDate = addTimeToDate(
          (data.endDate as Date) || new Date(),
          data.endTime,
        );
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
      selectOrganizations: data.selectOrganizations || [],
      address: data.address || '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      message: actionsEventMessage,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number((data.organization as OptionDropdownType).value)
        : null,
      repeatType:
        data.repeatType && data.repeatType.value
          ? String(data.repeatType.value)
          : null,
      repeatInterval:
        data.repeatInterval && data.repeatInterval.value
          ? Number(data.repeatInterval.value)
          : null,
      weekDay:
        data.weekDay && data.weekDay.label != ''
          ? Number(data.weekDay.value)
          : null,
      monthDay:
        data.monthDay && data.monthDay.value != ''
          ? Number(data.monthDay.value)
          : null,
      month:
        data.month && data.month.value != '' ? Number(data.month.value) : null,
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
        if (isMyEvent || isSelectedUserEvent) {
          const checkShowMyEventResource =
            data.participants?.find(
              (participant: EventParticipant) =>
                participant.id == session?.user.id,
            ) && selectedScheduleUserIds.includes(String(session?.user.id));
          setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            const exceptUpdatedEventList = updatedEvents.filter(
              (event) => String(event.eventId) != String(data.id),
            );
            const newEventData =
              data.repeatSchedules &&
              data.repeatSchedules.map(
                (schedule: {
                  id: number;
                  planEndDate: Date | null;
                  planStartDate: Date | null;
                  schedule: number;
                  uuid: string;
                }) => {
                  const dataEndDate =
                    schedule.planStartDate &&
                    schedule.planEndDate &&
                    ((new Date(schedule.planStartDate).toDateString() !==
                      new Date(schedule.planEndDate).toDateString() &&
                      data.isAllDay) ||
                      isMidnight(new Date(schedule.planEndDate)))
                      ? new Date(schedule.planEndDate).setDate(
                          new Date(schedule.planEndDate).getDate() + 1,
                        )
                      : schedule.planEndDate;
                  return {
                    id: `${schedule.id}`,
                    eventId: data.id,
                    title: data.title,
                    start: schedule.planStartDate,
                    end: dataEndDate,
                    allDay: data.isAllDay,
                    type: EventCalendarType.SCHEDULE,
                    isMyEvent: true,
                    address: data.address,
                    participants: data.participants,
                    resourceIds: [
                      ...(data.participants
                        ?.filter(
                          (participant: EventParticipant) =>
                            participant.id !== session?.user.id,
                        )
                        ?.map(
                          (participant: EventParticipant) => participant.id,
                        ) ?? []),
                      ...(checkShowMyEventResource
                        ? [Number(session?.user.id)]
                        : []),
                    ],
                  };
                },
              );
            return [...exceptUpdatedEventList, ...newEventData];
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

  // Delete event
  const handleConfirmDeleteEventCalendar = (sendToChat: boolean) => {
    if (selectedEventId?.eventId && selectedEventId.repeatScheduleId) {
      deleteEventCalendar({
        eventId: selectedEventId?.eventId,
        repeatScheduleId: selectedEventId.repeatScheduleId,
        sendToChat,
      });
      return;
    }
  };

  const handleDeleteEventCalendar = async (data: {
    eventId: number | string;
    repeatScheduleId: number | string;
    sendToChat: boolean;
  }) => {
    return await api.delete(
      `${apiRouters.DELETE_REPEAT_SCHEDULE(`${data.eventId}`)}?message=${encodeURIComponent(actionsEventMessage)}${data.sendToChat ? '&send_to_chat=true' : ''}${data.repeatScheduleId ? `&repeat_schedule_id=${data.repeatScheduleId}` : ''}`,
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
            (event) =>
              String(event.id) !== String(selectedEventId?.repeatScheduleId),
          );
          return filteredEvents;
        });
        setSelectedEventId(null);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
        setSelectedEventId(null);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );
  // Modify events before rendering them
  const modifyEvents = (events: EventCalendarDetail[]) => {
    if (isEventRendering) {
      if (
        calendarRef.current &&
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
        const eventClass = 'event-type-schedule';
        return {
          ...event,
          classNames: [eventClass],
        };
      });
    }
  };

  // Set params
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

  // Remove params
  const handleRemoveEventParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('event');
    params.delete('type');
    params.delete('action');
    params.delete('repeat-schedule');
    router.replace(`?${params.toString()}`);
  };

  // Get default calendar view
  const getDefaultCalendarView = () => {
    let defaultView = calendarViewOptions[2];
    switch (searchParams.get('view')) {
      case ViewOptions.YEAR:
        defaultView = calendarViewOptions[3];
        break;
      case ViewOptions.MONTH:
        defaultView = calendarViewOptions[2];
        break;
      case ViewOptions.WEEK:
        defaultView = calendarViewOptions[1];
        break;
      case ViewOptions.DAY:
        defaultView = calendarViewOptions[0];
        break;
      default:
        break;
    }
    return defaultView;
  };

  // Handle close popup
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

  const showCurrentViewButtonContent = () => {
    switch (searchParams.get('view')) {
      case ViewOptions.DAY:
        return '今日';
      case ViewOptions.MONTH:
        return '今月';
      case ViewOptions.WEEK:
        return '今週';
      case ViewOptions.YEAR:
        return '今年';
      default:
        return '';
    }
  };

  const getAllDayEventCountText = (events: EventCalendarDetail[]) => {
    if (!events || events.length === 0) return 'zero-all-day-events';

    const allDayCount = events.filter((event) => event.allDay).length;

    if (allDayCount === 1) return 'one-all-day-event';
    if (allDayCount >= 2) return 'many-all-day-events';

    return 'zero-all-day-events';
  };

  // Zoom calendar
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
        const newDataTimeList = events.map((event) => {
          return { ...event };
        });
        // Set data schedule
        setEvents(newDataTimeList);
      }
    }
  }, [slotHeight, searchParams]);

  const [keySearch, setKeySearch] = useState<string>('');
  const debouncedSearch = useDebounceText(keySearch, 800);

  useEffect(() => {
    if (calendarRef.current) {
      setIsEventRendering(true);
      setEvents([]);
      const calendarApi = calendarRef.current.getApi() as any;
      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      debouncedFetchCalendarData({
        startDate: startDateISOString,
        endDate: endDateISOString,
        selectedScheduleUserIds: selectedScheduleUserIds,
        keySearch: keySearch,
      });
    }
  }, [debouncedSearch]);

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
  }, [views]);

  return (
    <Fragment>
      <div className="flex mb-3 overflow-y-hidden pt-5" ref={containerRef}>
        <div className={`${showSidebar ? 'w-[76%] mr-3' : 'w-full'}`}>
          <div className="flex items-center justify-between mb-3 pl-10">
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
              <DynamicTooltip
                content={`${showCurrentViewButtonContent()}に移動`}
                placement="top">
                <div>
                  <Button
                    type="button"
                    className="!self-center !text-[#0068B6] !bg-white !w-[48px] !h-[34px] !rounded-[6px] !text-[14px] !font-medium !p-[8px] !border-none"
                    onClick={handleNavigateToTodayView}>
                    {showCurrentViewButtonContent()}
                  </Button>
                </div>
              </DynamicTooltip>
            </div>
            <div
              className={`flex gap-5 items-center ${!showSidebar && 'mr-14'}`}>
              <InputSearch
                placeholder="予定、キーワードを検索"
                value={keySearch}
                inputClassName="!w-[300px] !py-2 !rounded-[20px] text-sm !bg-white border-none placeholder-[#77858F99]"
                onChange={(e) => {
                  setKeySearch(e.target.value);
                }}
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
                      classNameTextData="!text-xs"
                      classActive="!text-sm"
                      classNameOption="!text-sm"
                      labelOptionClass="!text-sm font-medium"
                      onChange={(e) => {
                        onChange(e);
                        handleViewChange(e.value as string);
                        setIsCalendarLoading(true);
                        setTimeout(() => setIsCalendarLoading(false), 1500);
                      }}
                    />
                  )}
                />
              </div>
            </div>
            <div className="fixed top-[90px] right-0">
              {!showSidebar && (
                <DynamicTooltip
                  content={'表示するメンバー'}
                  placement="left"
                  customOffset={{
                    left: -125,
                  }}>
                  <div
                    className="bg-white w-[60px] h-[46px] rounded-l-[30px] flex items-center shadow-md hover:cursor-pointer"
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
                </DynamicTooltip>
              )}
            </div>
          </div>

          <div
            className={`w-full ${!isDayOrWeekView() && 'pl-6'} relative calendar-custom ${searchParams.get('view') || ''} ${getAllDayEventCountText(events)} ${showSidebar ? '' : 'pr-8'}`}
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
                      className={`${
                        searchParams.get('view') == ViewOptions.WEEK
                          ? 'pt-[20px]'
                          : `${
                              authenticatedUser
                                ? 'mt-[50px] pt-[10px]'
                                : 'mt-[-30px] pt-[20px]'
                            } pl-[15px]`
                      }`}
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
              initialView={getCalendarInitialView()}
              resources={currentResources}
              resourceOrder={(a: any, b: any) => {
                if (a.id === String(session?.user.id)) return -1;
                if (b.id === String(session?.user.id)) return 1;
                return a.title.localeCompare(b.title);
              }}
              resourceLabelContent={(resource) => {
                const memberInfo = dashboardMembersWithAvatars.find(
                  (member) => member.id == resource.resource.id,
                );
                return (
                  <div className="flex items-center justify-start gap-2">
                    <CustomUserAvatar
                      avatarUrl={memberInfo?.avatar || ''}
                      avatarColor={memberInfo?.avatarColor || ''}
                      size={36}
                    />
                    <p className="max-w-[100%] break-all text-left line-clamp-2 text-[15px] font-medium text-black">
                      {resource.resource.title}
                    </p>
                  </div>
                );
              }}
              datesAboveResources={true}
              headerToolbar={false}
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
                      <span className="text-[18px] mr-1">{day}日</span>
                      <span className="text-[12px]">({weekday})</span>
                    </div>
                  );
                } else {
                  return <span className="fc-day-header">{weekday}</span>;
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
              slotDuration={isOptionZoomSchedule}
              slotEventOverlap={false}
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
            {watch('calendarView') &&
              watch('calendarView').value !=
                CalendarViewOptions.VIEW_BY_MONTH &&
              watch('calendarView').value != CalendarViewOptions.VIEW_BY_YEAR &&
              !isEventRendering && (
                <div
                  className={`w-[180px] px-3 z-[20] h-[38px] absolute  rounded-md right-[50px] bottom-[30px] bg-white flex items-center `}>
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
                    }}
                  />
                </div>
              )}
          </div>
        </div>
        {popoverInfo && (
          <div className="z-30 flex items-center justify-center">
            <EventListModal
              checkShowUserAvatar={checkShowUserAvatar}
              handleCreateNewEventFromPopup={handleCreateNewEventFromPopup}
              handleEventClickInPopup={handleEventClickInPopup}
              handlePopoverClose={handlePopoverClose}
              popoverInfo={popoverInfo}
              popoverInfoLoading={popoverInfoLoading}
              popoverRef={popoverRef}
              setDefaultCreateStartDate={setDefaultCreateStartDate}
            />
          </div>
        )}
        <div
          className={`${showSidebar ? 'w-[24%] relative py-6 px-4 h-[1000px] shadow-lg shadow-slate-900/20 shadow-l-2 bg-[#F6F9FA]' : 'opacity-0 w-0 overflow-hidden'}`}>
          <CalendarSidebar
            calendarRef={calendarRef}
            keySearch={keySearch}
            getEventCalendarByUsers={getEventCalendarByUsers}
            handleFilterScheduleByUserIds={handleFilterScheduleByUserIds}
            handleGetAllMemberSchedules={handleGetAllMemberSchedules}
            handleRemoveAllMemberSchedules={handleRemoveAllMemberSchedules}
            removeMyselfOption={removeMyselfOption}
            searchName={searchName}
            selectedScheduleUserIds={selectedScheduleUserIds}
            selectedScheduleOrgIds={selectedScheduleOrgIds}
            setCurrentResources={setCurrentResources}
            setRemoveMyselfOption={setRemoveMyselfOption}
            setSearchName={setSearchName}
            setSelectedScheduleUserIds={setSelectedScheduleUserIds}
            setSelectedScheduleOrgIds={setSelectedScheduleOrgIds}
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
          authenticatedUser={authenticatedUser}
          onClose={() => {
            handleRemoveEventParam();
            setDataEventEdit(undefined);
            setSelectedEventId(null);
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
            setSelectedEventId(null);
            setConfirmEventDataToCreate(undefined);
            setOpenConfirmCreateEventModal(false);
            setBackToEditing(false);
          }}
          onBackToEditModal={() => {
            setOpenCreateEventModal(true);
            setOpenConfirmCreateEventModal(false);
            if (confirmEventDataToCreate) {
              setDataEventEdit({
                ...confirmEventDataToCreate,
                repeatType: confirmEventDataToCreate.repeatType ?? undefined,
                repeatInterval:
                  confirmEventDataToCreate.repeatInterval ?? undefined,
                weekDay: confirmEventDataToCreate.weekDay ?? undefined,
                monthDay: confirmEventDataToCreate.monthDay ?? undefined,
                month: confirmEventDataToCreate.month ?? undefined,
              });
            }
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
            setSelectedEventId(null);
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
            setSelectedEventId(null);
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
      {openEventInfoModal && (
        <EventInfoModal
          dataEvent={dataEventEdit}
          top={infoModalPosition?.top}
          left={infoModalPosition?.left}
          checkShowUserAvatar={checkShowUserAvatar}
          selectedScheduleUserIds={selectedScheduleUserIds}
          onClose={() => {
            setDataEventEdit(undefined);
            setSelectedEventId(null);
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
                label: String(item.name),
                value: String(item.id),
              }));
            }

            setConfirmEventDataToEdit({
              ...data,
              type: { label: `${data.type}`, value: `${data.type}` },
              largeCategory: {
                value: `${data.categories && data.categories.find((cat) => cat.type == EventWorkCategory.LARGE)?.id}`,
                label: `${
                  data.categories &&
                  (data.categories.find(
                    (cat) => cat.type == EventWorkCategory.LARGE,
                  )?.name as string)
                }`,
              },
              mediumCategory: {
                value: `${data.categories && data.categories.find((cat) => cat.type == EventWorkCategory.MEDIUM)?.id}`,
                label: `${
                  data.categories &&
                  (data.categories.find(
                    (cat) => cat.type == EventWorkCategory.MEDIUM,
                  )?.name as string)
                }`,
              },
              smallCategory: {
                value: `${data.categories && data.categories.find((cat) => cat.type == EventWorkCategory.SMALL)?.id}`,
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
              endTime: convertToTimeString(`${data.endDate}`),
              startDate: new Date(`${data.startDate}`),
              startTime: convertToTimeString(`${data.startDate}`),
              organization: {
                label: (data.organization as Organizations).name as string,
                value: (data.organization as Organizations).id as number,
              },
            });
            setOpenCreateEventModal(false);
            setOpenConfirmDeleteEventModal(true);
            setOpenEventInfoModal(false);
          }}
        />
      )}
    </Fragment>
  );
};

export default EventCalendar;
