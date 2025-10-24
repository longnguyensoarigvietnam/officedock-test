'use client';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import { isAfter, isBefore, isToday } from 'date-fns';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import resourcePlugin from '@fullcalendar/resource';
import scrollgridPlugin from '@fullcalendar/scrollgrid';
import { useSessionCache } from '@providers/SessionCacheProvider';

import './styles/index.css';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import ActionFilterTaskTeam from '@components/modals/ActionFilterTeamTask';
import DatePicker from '@components/common/DatePicker';
import RangeSlider from '@components/common/RangeSlider';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import {
  CalendarViewOptions,
  EventWorkCategory,
  ItemScheduleTitleType,
  ItemStartType,
} from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';

import {
  EventCalendarDayRange,
  EventCalendarDetail,
  EventCalendarProps,
} from '@interfaces/calendar';

import api from '@base/api';

import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { TaskContext } from '@providers/TaskProvider';

import {
  adjustEndDate,
  formatHoursAndMinutesForDateTime,
  formatQueryEndDateForCalendar,
  formatQueryStartDateForCalendar,
  formatShowDeadlineAllDayEvent,
  getJapaneseDayName,
  getMinuteDifferenceTime,
  getNext30MinuteSlot,
  isDateLessThanToday,
  isMidnight,
  isMoreThanThirtyMinutes,
  isTodaySchedule,
} from '@utils/date';
import { OptionDropdownType } from '@interfaces/common';
import { NO_SETTING } from '@constants';
import { generateVerticalGradient } from '@utils';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import Checkbox from '@components/common/Checkbox';

const ScheduleTeamBoard = () => {
  const hasFetched = useRef<boolean>(false);

  // Context
  const {
    isLoadingDataTask,
    orderingOptions,
    setIsLoadingDataTask,
    setOrderingOptions,
  } = useContext(TaskTeamStateContext);
  const { organizationTeamList, selectedOrganization } =
    useContext(GlobalStateContext);
  const { dataActualAddSchedule } = useContext(TaskContext);

  // State
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isConcurrently, setIsConcurrently] = useState(false);
  const router = useRouter();
  const organizationId = searchParams.get('organization');
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const screenHeight = window.innerHeight;
  const { data: session } = useSessionCache();

  const baseHeight = Math.round(43 * (screenHeight / 890));
  const baseSlider = Math.round(43 * (screenHeight / 890));

  const [sliderValue, setSliderValue] = useState(baseSlider);
  const [slotHeight, setSlotHeight] = useState(baseHeight);
  const [resetTrigger, _setResetTrigger] = useState(0);

  const [isOptionZoomSchedule, setIsOptionZoomSchedule] = useState('00:15:00');

  // Calendar
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentResources, setCurrentResources] = useState<
    {
      id: string;
      title: string;
    }[]
  >([]);
  const [displayMonth, setDisplayMonth] = useState<number>();
  const [displayDay, setDisplayDay] = useState<number>();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventCalendarDetail[]>([]);
  const [currentRange, setCurrentRange] = useState<EventCalendarDayRange>({
    start: '',
    end: '',
  });
  const [selectedOptionShow, setOptionShow] = useState<string>(
    ItemScheduleTitleType.PLANS,
  );

  // State
  // Member
  const [listMemberTeam, setListMemberTeam] = useState<
    {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[]
  >([]);

  const handleSetParamTeam = (id: string) => {
    params.set('organization', id);
    router.push(`?${params.toString()}`);
  };

  useCreationDataCommon({
    organizationId:
      (selectedOrganization?.value as string) || organizationId || '',
    options: {
      get_organization_members: true,
    },
    onSuccess: (data) => {
      if (data.organizationMembers) {
        setListMemberTeam(
          data.organizationMembers.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            color: member.avatarColor,
            avatarUrl: member?.avatar || '',
          })),
        );
        setCurrentResources(
          data.organizationMembers.map((member) => ({
            id: String(member.id),
            title: member.fullName,
          })),
        );
      }
    },
  });
  useEffect(() => {
    if (organizationId && !hasFetched.current) {
      hasFetched.current = true;
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const startDateISOString = formatQueryStartDateForCalendar(
          calendarApi.view.activeStart,
        );
        const endDateISOString = formatQueryEndDateForCalendar(
          calendarApi.view.activeEnd,
        );

        calendarRef.current?.getApi().refetchEvents();
        if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
          getPlanEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        } else {
          getActualEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const scrollToNowIndicator = () => {
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

  useEffect(() => {
    if (
      dataActualAddSchedule &&
      selectedOptionShow === ItemScheduleTitleType.ACTUAL
    ) {
      if (dataActualAddSchedule.isStart) {
        const largeColor =
          dataActualAddSchedule.categories &&
          dataActualAddSchedule.categories.find(
            (item) => item.type === EventWorkCategory.LARGE,
          )?.color;
        const startDateActual = new Date(
          `${dataActualAddSchedule.planStartDate}`,
        );

        const endDateActual = new Date(`${dataActualAddSchedule.planEndDate}`);
        const endTimeCustom = dataActualAddSchedule.planEndDate
          ? endDateActual
          : getNext30MinuteSlot(startDateActual);

        const newItem = {
          title: dataActualAddSchedule.title,
          taskId: dataActualAddSchedule.taskId,
          scheduleId: dataActualAddSchedule.scheduleId,
          start: new Date(dataActualAddSchedule.planStartDate as string),
          end: dataActualAddSchedule.planEndDate
            ? adjustEndDate(startDateActual, endDateActual, 5)
            : adjustEndDate(startDateActual, endTimeCustom as Date),
          allDay: false,
          id: `${dataActualAddSchedule.id}`,
          isStart: dataActualAddSchedule.isStart,
          type: dataActualAddSchedule.type,
          participants: [],
          address: '',
          largeColor: largeColor,
          planStartDate: `${dataActualAddSchedule.planStartDate}`,
          planEndDate: dataActualAddSchedule.planEndDate
            ? String(adjustEndDate(startDateActual, endDateActual, 0))
            : String(adjustEndDate(startDateActual, endTimeCustom as Date)),
          resourceIds: [`${session?.user.id}`],
        };
        setEvents([...events, newItem]);
      } else {
        const itemUpdate = events.map((item) => {
          if (
            item.taskId === dataActualAddSchedule.taskId &&
            `${item.id}` === `${dataActualAddSchedule.id}`
          ) {
            return {
              ...item,
              isStart: false,
              end: new Date(`${dataActualAddSchedule.planEndDate}`),
            };
          }
          return item;
        });
        setEvents(itemUpdate);
      }
    }
  }, [dataActualAddSchedule]);

  const handleEventContent = (eventContent: any) => {
    const calendarApi = eventContent.view.calendar;
    const currentView = calendarApi.view.type;

    const largeColor = eventContent?.event?.extendedProps?.largeColor || '';
    if (currentView === CalendarViewOptions.VIEW_BY_DAY) {
      if (eventContent.event.allDay) {
        const end = new Date(eventContent.event?.end);
        const start = new Date(eventContent.event?.start);
        if (start.toDateString() !== end.toDateString()) {
          end.setDate(end.getDate() - 1);
        }
        return (
          <div>
            <div
              style={{
                borderLeftColor:
                  selectedOptionShow === ItemScheduleTitleType.PLANS
                    ? largeColor || 'white'
                    : '',
                backgroundColor:
                  selectedOptionShow === ItemScheduleTitleType.PLANS
                    ? 'white'
                    : largeColor
                      ? largeColor
                      : '#A7B9C2',
              }}
              className={`mb-1 ${eventContent.event.extendedProps.isStart && selectedOptionShow === ItemScheduleTitleType.ACTUAL && '!bg-custom-gradient'} hover:cursor-pointer  px-[10px] py-1 ${selectedOptionShow === ItemScheduleTitleType.PLANS ? 'border-l-2 text-black' : 'text-white'} rounded-md`}>
              <div
                className={` flex gap-2 items-center overflow-hidden !w-[calc(100%_-_1px)] py-0.5 text-[12px] font-normal px-1`}>
                <p
                  className={`truncate max-w-[calc(100%)] font-semibold mt-0.5 pt-0.5 h-[25px] ${eventContent.event.extendedProps.type !== ItemStartType.TASK && '!text-primary'}`}>
                  {eventContent.event.extendedProps.isCrossTeamTask
                    ? `${eventContent.event.extendedProps.largeCategory}タスク`
                    : eventContent.event.title !== 'null'
                      ? eventContent.event.title
                      : ''}
                </p>
                <div className="flex gap-2">
                  <p>終日</p>
                  <p>{`${formatShowDeadlineAllDayEvent(start)} ~ ${eventContent.event.extendedProps.isStart ? '計測中' : formatShowDeadlineAllDayEvent(end)}`}</p>
                </div>
              </div>{' '}
            </div>
          </div>
        );
      }

      return (
        <>
          <div
            style={{
              background:
                selectedOptionShow === ItemScheduleTitleType.PLANS
                  ? 'white'
                  : largeColor
                    ? generateVerticalGradient(largeColor)
                    : '#A7B9C2',
            }}
            className={`h-full mx-1 ${eventContent.event.extendedProps.isStart && selectedOptionShow === ItemScheduleTitleType.ACTUAL && '!bg-custom-gradient'} px-[10px]   ${selectedOptionShow === ItemScheduleTitleType.PLANS ? 'border-l-2 text-black' : 'text-white'} rounded-tr-[14px] rounded-br-[14px] rounded-tl-[14px] rounded-bl-[14px] `}>
            <div className="overflow-hidden">
              <div
                className={`  font-medium px-1 pt-1 text-[14px] flex gap-[6px]`}>
                {selectedOptionShow !== ItemScheduleTitleType.ACTUAL &&
                  largeColor && (
                    <div
                      style={{ backgroundColor: largeColor || 'white' }}
                      className="w-2 h-2 rounded-full mt-[7px] flex-shrink-0"></div>
                  )}
                <p
                  className={`truncate max-w-[calc(100%)] font-semibold min-h-5 ${eventContent.event.extendedProps.type !== ItemStartType.TASK && '!text-primary'}`}>
                  {eventContent.event.extendedProps.isCrossTeamTask
                    ? `${eventContent.event.extendedProps.largeCategory}タスク`
                    : eventContent.event.title != 'null'
                      ? eventContent.event.title
                      : ''}
                </p>
              </div>{' '}
              <div className="flex items-center">
                <div className={`  text-[12px] font-normal px-1`}>
                  {new Date(eventContent.event.start).getDate() !=
                  new Date(eventContent.event.end).getDate() ? (
                    <>
                      <p className="whitespace-nowrap">
                        {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.start))}`}{' '}
                        ~{' '}
                        {eventContent.event.extendedProps.isStart
                          ? '計測中'
                          : `${formatHoursAndMinutesForDateTime(new Date(eventContent.event.end))}`}
                      </p>
                      <p>{eventContent.event.extendedProps.address}</p>
                    </>
                  ) : (
                    <>
                      {isMoreThanThirtyMinutes(eventContent.timeText) && (
                        <div className=" text-[12px] font-normal px-1">
                          <p className="">
                            {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.start))}`}{' '}
                            ~{' '}
                            {eventContent.event.extendedProps.isStart
                              ? '計測中'
                              : `${formatHoursAndMinutesForDateTime(new Date(eventContent.event.end))}`}
                          </p>
                          <p>{eventContent.event.extendedProps.address}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="text-[12px] font-normal px-1">
                  {selectedOptionShow === ItemScheduleTitleType.ACTUAL &&
                    !eventContent.event.extendedProps.isStart && (
                      <p>
                        {getMinuteDifferenceTime(
                          eventContent.event.extendedProps.planStartDate,
                          eventContent.event.extendedProps.planEndDate,
                        )}
                        分
                      </p>
                    )}
                </p>
              </div>
            </div>
          </div>
        </>
      );
    }
  };

  const handlePrev = () => {
    if (calendarRef.current) {
      setEvents([]);
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.prev();

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );
      const startDate = new Date(startDateISOString);
      const today = new Date();

      if (isToday(startDate)) {
        if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
          getPlanEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        } else {
          getActualEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        }
      } else if (isBefore(startDate, today)) {
        if (selectedOptionShow == ItemScheduleTitleType.ACTUAL) {
          getActualEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        } else {
          getPlanEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        }
      } else if (isAfter(startDate, today)) {
        setOptionShow(ItemScheduleTitleType.PLANS);
        getPlanEventCalendarByTeam({
          organizationId:
            (selectedOrganization?.value as string) || String(organizationId),
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      }
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      setEvents([]);
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.next();

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );
      const startDate = new Date(startDateISOString);
      const today = new Date();

      if (isToday(startDate)) {
        if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
          getPlanEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        } else {
          getActualEventCalendarByTeam({
            organizationId:
              (selectedOrganization?.value as string) || String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        }
      } else if (isBefore(startDate, today)) {
        setOptionShow(ItemScheduleTitleType.ACTUAL);
        getActualEventCalendarByTeam({
          organizationId:
            (selectedOrganization?.value as string) || String(organizationId),
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      } else if (isAfter(startDate, today)) {
        setOptionShow(ItemScheduleTitleType.PLANS);
        getPlanEventCalendarByTeam({
          organizationId:
            (selectedOrganization?.value as string) || String(organizationId),
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      }
    }
  };

  const handleNavigateToSpecificDay = (date: Date) => {
    if (calendarRef.current) {
      if (calendarRef.current.getApi().getDate().getTime() == date.getTime()) {
        return;
      }
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.gotoDate(date);

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      const startDate = new Date(startDateISOString);
      const today = new Date();

      if (isToday(startDate)) {
        if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
          getPlanEventCalendarByTeam({
            organizationId: String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        } else {
          getActualEventCalendarByTeam({
            organizationId: String(organizationId),
            startDate: startDateISOString,
            endDate: endDateISOString,
          });
        }
      } else if (isBefore(startDate, today)) {
        setOptionShow(ItemScheduleTitleType.ACTUAL);
        getActualEventCalendarByTeam({
          organizationId: String(organizationId),
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      } else if (isAfter(startDate, today)) {
        setOptionShow(ItemScheduleTitleType.PLANS);
        getPlanEventCalendarByTeam({
          organizationId: String(organizationId),
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      }
    }
  };

  const handleGetActualEventCalendarByTeam = async ({
    organizationId,
    startDate,
    endDate,
    isConcurrentlyParam,
  }: {
    organizationId: string;
    startDate?: string;
    endDate?: string;
    isConcurrentlyParam?: boolean;
  }) => {
    setIsLoadingSchedule(true);

    const params = new URLSearchParams({
      ...(organizationId && { organization_id: String(organizationId) }),
      start_date: startDate || String(currentRange.start),
      end_date: endDate || String(currentRange.end),
      is_cross_team_task:
        isConcurrentlyParam != undefined
          ? String(isConcurrentlyParam)
          : String(isConcurrently),

      ...(orderingOptions?.user_ids?.length && {
        user_ids: orderingOptions.user_ids.map((item) => item.value).join(','),
      }),
    });

    const apiUrl = `${apiRouters.ACTUAL_TEAM_SCHEDULE_LIST}?${params.toString()}`;
    const { data } = await api.get(apiUrl);

    return data;
  };

  const { mutateAsync: getActualEventCalendarByTeam } = useMutation(
    'getActualEventCalendarByTeam',
    handleGetActualEventCalendarByTeam,
    {
      onSuccess: (data) => {
        if (data) {
          const eventList: EventCalendarDetail[] = data.map(
            (event: EventCalendarProps) => {
              const largeColor =
                event.categories &&
                event.categories.find(
                  (item) => item.type === EventWorkCategory.LARGE,
                )?.color;
              const startDateActual = new Date(`${event.startDate}`);

              const endDateActual = new Date(`${event.endDate}`);
              const endTimeCustom = event.endDate
                ? endDateActual
                : getNext30MinuteSlot(startDateActual);
              const largeCategory =
                (event.categories &&
                  event.categories.find(
                    (item) => item.type === EventWorkCategory.LARGE,
                  )?.name) ||
                NO_SETTING;

              return {
                title: event.title,
                taskId: event.taskId,
                scheduleId: event.scheduleId,
                start: `${event.startDate}`,
                end: event.endDate
                  ? adjustEndDate(startDateActual, endDateActual, 5)
                  : adjustEndDate(startDateActual, endTimeCustom as Date),
                allDay: event.isAllDay || false,
                id: `${event.id}`,
                isStart: event.isStart,
                type: event.type,
                participants: event.participants || [],
                locationId: data.location
                  ? String((data.location as OptionDropdownType)?.value)
                  : '',
                isCrossTeamTask: event.isCrossTeamTask,
                largeCategory: largeCategory,
                largeColor: largeColor,
                planStartDate: `${event.startDate}`,
                planEndDate: event.endDate
                  ? adjustEndDate(startDateActual, endDateActual, 0)
                  : adjustEndDate(startDateActual, endTimeCustom as Date),
                resourceIds: [
                  ...(event.participants?.map(
                    (participant) => participant.id,
                  ) ?? []),
                ],
              };
            },
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
          setEvents(() => {
            return [...newEvents];
          });
          scrollToNowIndicator();
        }
      },
      onError: () => {
        if (organizationTeamList.length > 0) {
          handleSetParamTeam(String(organizationTeamList[0].value));
        }
      },
      onSettled: () => {
        setIsLoadingDataTask(false);
        setIsLoadingSchedule(false);
        hasFetched.current = false;
      },
    },
  );

  const handleGetPlanEventCalendarByTeam = async ({
    organizationId,
    startDate,
    endDate,
    isConcurrentlyParam,
  }: {
    organizationId: string;
    startDate?: string;
    endDate?: string;
    isConcurrentlyParam?: boolean;
  }) => {
    setIsLoadingSchedule(true);
    const params = new URLSearchParams({
      ...(organizationId && { organization_id: String(organizationId) }),
      start_date: startDate || String(currentRange.start),
      end_date: endDate || String(currentRange.end),
      is_cross_team_task:
        isConcurrentlyParam !== undefined
          ? String(isConcurrentlyParam)
          : String(isConcurrently),
      ...(orderingOptions?.user_ids?.length && {
        user_ids: orderingOptions.user_ids.map((item) => item.value).join(','),
      }),
    });

    const apiUrl = `${apiRouters.PLAN_TEAM_SCHEDULE_LIST}?${params.toString()}`;
    const { data } = await api.get(apiUrl);
    return data;
  };

  const { mutateAsync: getPlanEventCalendarByTeam } = useMutation(
    'getPlanEventCalendarByTeam',
    handleGetPlanEventCalendarByTeam,
    {
      onSuccess: (data) => {
        if (data) {
          const eventList: EventCalendarDetail[] = data.map(
            (event: EventCalendarProps) => {
              const largeColor =
                event.categories &&
                event.categories.find(
                  (item) => item.type === EventWorkCategory.LARGE,
                )?.color;
              const largeCategory =
                (event.categories &&
                  event.categories.find(
                    (item) => item.type === EventWorkCategory.LARGE,
                  )?.name) ||
                NO_SETTING;
              return {
                title: event.title,
                start: `${event.startDate}`,
                end: `${event.endDate}`,
                planStartDate: `${event.startDate}`,
                planEndDate: `${event.endDate}`,
                allDay: event.isAllDay || false,
                id: `${event.id}`,
                type: event.type,
                participants: event.participants || [],
                locationId: data.location
                  ? String((data.location as OptionDropdownType)?.value)
                  : '',
                isCrossTeamTask: event.isCrossTeamTask,
                largeCategory: largeCategory,
                largeColor: largeColor,
                resourceIds: [
                  ...(event.participants?.map(
                    (participant) => participant.id,
                  ) ?? []),
                ],
              };
            },
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
          setEvents(() => {
            return [...newEvents];
          });
          scrollToNowIndicator();
        }
      },
      onError: () => {
        if (organizationTeamList.length > 0) {
          handleSetParamTeam(String(organizationTeamList[0].value));
        }
      },
      onSettled: () => {
        setIsLoadingDataTask(false);
        setIsLoadingSchedule(false);
        hasFetched.current = false;
      },
    },
  );

  const modifyEvents = (events: EventCalendarDetail[]) => {
    return events.map((event) => {
      return {
        ...event,
      };
    });
  };

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

  // Show data filter
  const allLabels = orderingOptions
    ? [
        ...orderingOptions.organization_ids.map((item) => ({
          ...item,
          category: 'organization_ids',
        })),
        ...orderingOptions.tag_ids.map((item) => ({
          ...item,
          category: 'tag_ids',
        })),
        ...orderingOptions.category_ids.map((item) => ({
          ...item,
          category: 'category_ids',
        })),
        ...orderingOptions.user_ids.map((item) => ({
          ...item,
          category: 'user_ids',
        })),
      ]
    : [];

  const firstThree = allLabels.slice(0, 3);

  const remainingCount = allLabels.length - firstThree.length;

  // Handle remove option filter

  const handleRemoveItem = (
    category: 'organization_ids' | 'tag_ids' | 'category_ids',
    value: string | number,
  ) => {
    setOrderingOptions((prevData) => {
      if (!prevData) return prevData;

      return {
        ...prevData,
        [category]:
          prevData[category]?.filter((item) => item.value !== value) || [],
      };
    });
  };

  // Handle Show avatar user
  const getParticipantAvatars = (
    participants: {
      id: number;
      fullName: string;
      color: string;
      avatarUrl: string;
    }[],
  ) => {
    const slicedParticipants = participants.slice(0, 6);
    const remainingCount =
      participants.length > 3 ? participants.length - 6 : 0;

    return (
      <>
        <p className="mr-8 text-[#77858F] font-medium text-[13px]">
          メンバー{participants.length}人
        </p>
        <div className="flex items-center">
          {slicedParticipants.map((item) => {
            return (
              <div
                className="ml-[-10px] relative border-[1px] border-white rounded-full h-[32px] w-[32px]"
                key={item.id}>
                <CustomUserAvatar
                  avatarUrl={item?.avatarUrl || ''}
                  avatarColor={item?.color || ''}
                  size={32}
                  customClassName={`${!item?.avatarUrl && '!mt-0'}`}
                />
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="ml-[-10px] relative flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[36px] h-[36px]">
              +{remainingCount}
            </div>
          )}
        </div>
      </>
    );
  };

  useEffect(() => {
    if (orderingOptions && listMemberTeam) {
      const newListMemberData =
        orderingOptions?.user_ids?.length > 0
          ? listMemberTeam.filter((member) =>
              orderingOptions.user_ids.some(
                (option) => String(option.value) === String(member.id),
              ),
            )
          : listMemberTeam;
      setCurrentResources(
        newListMemberData.map((member) => ({
          id: String(member.id),
          title: member.fullName,
        })),
      );
    }
  }, [orderingOptions && orderingOptions?.user_ids, listMemberTeam]);

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
  const getAllDayEventCountText = (events: EventCalendarDetail[]) => {
    if (!events || events.length === 0) return 'zero-all-day-events';
    const allDayCount = events.filter((event) => event.allDay).length;
    if (allDayCount === 1) return 'one-all-day-event';
    if (allDayCount >= 2) return 'many-all-day-events';
    return 'zero-all-day-events';
  };

  const pathname = usePathname();
  useEffect(() => {
    const timer = setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi?.();
      if (calendarApi) {
        calendarApi.updateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [currentResources]);

  return (
    <div className="w-full h-full relative">
      <div className="pt-[30px] px-10  font-medium  w-full">
        <div className="mb-[30px] flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex gap-1 items-center">
              {selectedOrganization?.imgComponent && (
                <div className="w-[34px] h-[34px] scale-[1.4167] flex justify-center items-center">
                  {selectedOrganization.imgComponent}
                </div>
              )}
              <p className="text-[26px] font-medium relative top-[0px] line-clamp-3 max-w-[350px] break-all ml-[10px]  ">
                {selectedOrganization?.label}
              </p>
            </div>
            <div className="flex justify-center bg-white p-[6px] rounded-[20px] items-center gap-2 ml-5 ">
              <Button
                variant={'outline'}
                className={`!text-[#77858F] !bg-[#EBF1F7] !border-none !py-0 !px-0 font-bold w-[90px] h-7 !rounded-[20px] text-xs`}
                onClick={() => {
                  router.push(
                    `${pageRouters.TASKS_TEAM_MANAGEMENT.href}?organization=${
                      (selectedOrganization?.value as string) ||
                      String(organizationId)
                    }&tabId=1`,
                  );
                }}>
                タスク
              </Button>
              <Button
                variant={'primary'}
                className={`!py-0 !px-0 font-bold w-[90px] h-7 
              !rounded-[20px] text-xs`}>
                スケジュール
              </Button>
            </div>{' '}
            <div className="ml-3">
              <Checkbox
                label="他チームを表示"
                isChecked={isConcurrently}
                disable={isLoadingDataTask}
                onChange={(data) => {
                  setIsConcurrently(data);
                  if (selectedOptionShow == ItemScheduleTitleType.PLANS) {
                    if (calendarRef.current) {
                      const calendarApi = calendarRef.current.getApi();
                      const startDateISOString =
                        formatQueryStartDateForCalendar(
                          calendarApi.view.activeStart,
                        );
                      const endDateISOString = formatQueryEndDateForCalendar(
                        calendarApi.view.activeEnd,
                      );

                      calendarRef.current?.getApi().refetchEvents();

                      getPlanEventCalendarByTeam({
                        organizationId:
                          (selectedOrganization?.value as string) ||
                          String(organizationId),
                        startDate: startDateISOString,
                        endDate: endDateISOString,
                        isConcurrentlyParam: data,
                      });
                    }
                  }
                  if (selectedOptionShow == ItemScheduleTitleType.ACTUAL) {
                    if (calendarRef.current) {
                      const calendarApi = calendarRef.current.getApi();
                      const startDateISOString =
                        formatQueryStartDateForCalendar(
                          calendarApi.view.activeStart,
                        );
                      const endDateISOString = formatQueryEndDateForCalendar(
                        calendarApi.view.activeEnd,
                      );

                      calendarRef.current?.getApi().refetchEvents();

                      getActualEventCalendarByTeam({
                        organizationId:
                          (selectedOrganization?.value as string) ||
                          String(organizationId),
                        startDate: startDateISOString,
                        endDate: endDateISOString,
                        isConcurrentlyParam: data,
                      });
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center">
            {listMemberTeam.length > 0 && getParticipantAvatars(listMemberTeam)}
          </div>
        </div>
        <div
          className={`flex gap-7 justify-between items-center w-full mb-6 min-w-[300px]`}>
          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="flex items-center ml-[-1rem] gap-4">
              {!isLoadingSchedule ? (
                <ImageRound
                  name="Chevron left"
                  src={'/icons/chevron-left-calendar.svg'}
                  onClick={handlePrev}
                  className="!w-[8px] !h-[10px] hover:cursor-pointer"
                />
              ) : (
                <div className="!w-[8px] !h-[10px]"></div>
              )}
              <div className="flex items-end font-normal gap-2">
                <p className="text-[30px] text-[#5B6770]  font-medium">
                  {displayMonth}月
                </p>
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
              </div>
              {!isLoadingSchedule ? (
                <ImageRound
                  name="Chevron right"
                  src={'/icons/chevron-left-calendar.svg'}
                  onClick={handleNext}
                  className="!w-[8px] !h-[10px] rotate-180 hover:cursor-pointer"
                />
              ) : (
                <div className="!w-[8px] !h-[10px]"></div>
              )}

              <div className="ml-[10px] z-20">
                <DatePicker
                  className="z-50"
                  isShowInput={false}
                  selected={
                    calendarRef.current
                      ? calendarRef.current.getApi().getDate()
                      : new Date()
                  }
                  disabled={isLoadingSchedule}
                  tooltipMsg="カレンダーから日付を選択"
                  size="!w-[18px] !h-[18px]"
                  onChange={(e) => {
                    handleNavigateToSpecificDay(e as Date);
                  }}
                />
              </div>
            </div>
            <>
              {isDateLessThanToday(currentDate) ? (
                <>
                  <Button
                    disabled={isLoadingSchedule}
                    variant={
                      isLoadingDataTask
                        ? 'outline'
                        : selectedOptionShow === ItemScheduleTitleType.PLANS
                          ? 'option'
                          : 'outline'
                    }
                    onClick={() => {
                      if (selectedOptionShow !== ItemScheduleTitleType.PLANS) {
                        setOptionShow(ItemScheduleTitleType.PLANS);
                        if (calendarRef.current) {
                          const calendarApi = calendarRef.current.getApi();
                          const startDateISOString =
                            formatQueryStartDateForCalendar(
                              calendarApi.view.activeStart,
                            );
                          const endDateISOString =
                            formatQueryEndDateForCalendar(
                              calendarApi.view.activeEnd,
                            );

                          calendarRef.current?.getApi().refetchEvents();

                          getPlanEventCalendarByTeam({
                            organizationId:
                              (selectedOrganization?.value as string) ||
                              String(organizationId),
                            startDate: startDateISOString,
                            endDate: endDateISOString,
                          });
                        }
                      }
                    }}
                    className={`${selectedOptionShow === ItemScheduleTitleType.PLANS && !isLoadingDataTask ? '!bg-[#3CABF3]' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '}   h-6 w-[80px] !px-0 !py-0 text-xs font-bold !rounded-[20px] `}>
                    予定
                  </Button>
                  <Button
                    disabled={isLoadingSchedule}
                    variant={
                      isLoadingDataTask
                        ? 'outline'
                        : selectedOptionShow === ItemScheduleTitleType.ACTUAL
                          ? 'option'
                          : 'outline'
                    }
                    onClick={() => {
                      if (selectedOptionShow !== ItemScheduleTitleType.ACTUAL) {
                        setOptionShow(ItemScheduleTitleType.ACTUAL);
                        if (calendarRef.current) {
                          const calendarApi = calendarRef.current.getApi();
                          const startDateISOString =
                            formatQueryStartDateForCalendar(
                              calendarApi.view.activeStart,
                            );
                          const endDateISOString =
                            formatQueryEndDateForCalendar(
                              calendarApi.view.activeEnd,
                            );

                          calendarRef.current?.getApi().refetchEvents();

                          getActualEventCalendarByTeam({
                            organizationId:
                              (selectedOrganization?.value as string) ||
                              String(organizationId),
                            startDate: startDateISOString,
                            endDate: endDateISOString,
                          });
                        }
                      }
                    }}
                    className={`${selectedOptionShow === ItemScheduleTitleType.ACTUAL && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2]  !bg-[#EBF1F7] '} h-6 w-[80px] !px-0 !py-0 text-xs font-bold !rounded-[20px]   `}>
                    実績
                  </Button>
                </>
              ) : isTodaySchedule(currentDate) ? (
                <>
                  <Button
                    disabled={isLoadingSchedule}
                    variant={
                      isLoadingDataTask
                        ? 'outline'
                        : selectedOptionShow === ItemScheduleTitleType.PLANS
                          ? 'option'
                          : 'outline'
                    }
                    onClick={() => {
                      if (selectedOptionShow !== ItemScheduleTitleType.PLANS) {
                        setOptionShow(ItemScheduleTitleType.PLANS);
                        if (calendarRef.current) {
                          const calendarApi = calendarRef.current.getApi();
                          const startDateISOString =
                            formatQueryStartDateForCalendar(
                              calendarApi.view.activeStart,
                            );
                          const endDateISOString =
                            formatQueryEndDateForCalendar(
                              calendarApi.view.activeEnd,
                            );

                          calendarRef.current?.getApi().refetchEvents();

                          getPlanEventCalendarByTeam({
                            organizationId:
                              (selectedOrganization?.value as string) ||
                              String(organizationId),
                            startDate: startDateISOString,
                            endDate: endDateISOString,
                          });
                        }
                      }
                    }}
                    className={`${selectedOptionShow === ItemScheduleTitleType.PLANS && !isLoadingDataTask ? '!bg-[#3CABF3]' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '}   h-6 w-[80px] !px-0 !py-0 text-xs font-bold !rounded-[20px] `}>
                    予定
                  </Button>
                  <Button
                    disabled={isLoadingSchedule}
                    variant={
                      isLoadingDataTask
                        ? 'outline'
                        : selectedOptionShow === ItemScheduleTitleType.ACTUAL
                          ? 'option'
                          : 'outline'
                    }
                    onClick={() => {
                      if (selectedOptionShow !== ItemScheduleTitleType.ACTUAL) {
                        setOptionShow(ItemScheduleTitleType.ACTUAL);
                        if (calendarRef.current) {
                          const calendarApi = calendarRef.current.getApi();
                          const startDateISOString =
                            formatQueryStartDateForCalendar(
                              calendarApi.view.activeStart,
                            );
                          const endDateISOString =
                            formatQueryEndDateForCalendar(
                              calendarApi.view.activeEnd,
                            );

                          calendarRef.current?.getApi().refetchEvents();

                          getActualEventCalendarByTeam({
                            organizationId:
                              (selectedOrganization?.value as string) ||
                              String(organizationId),
                            startDate: startDateISOString,
                            endDate: endDateISOString,
                          });
                        }
                      }
                    }}
                    className={`${selectedOptionShow === ItemScheduleTitleType.ACTUAL && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2]  !bg-[#EBF1F7] '} h-6 w-[80px] !px-0 !py-0 text-xs font-bold !rounded-[20px]   `}>
                    実績
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={isLoadingSchedule}
                    variant="option"
                    className={`${selectedOptionShow === ItemScheduleTitleType.PLANS && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '} !bg-[#3CABF3]  h-6 w-[80px] !px-0 !py-0 text-xs font-bold !rounded-[20px]`}>
                    予定
                  </Button>
                </>
              )}
            </>

            {/* Filter option modal */}
            <Popover className="relative">
              {() => (
                <>
                  <div className="flex items-center gap-2">
                    <PopoverButton
                      onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
                      className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                      <ImageRound
                        src="/icons/filter.svg"
                        name="Filter icon"
                        className="w-[14px] h-[14px] ml-2"
                      />
                    </PopoverButton>
                    {allLabels.length > 3 ? (
                      <>
                        {firstThree.slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            {!isLoadingSchedule ? (
                              <ImageRound
                                src={`/icons/close.svg`}
                                name="close"
                                onClick={() => {
                                  handleRemoveItem(
                                    item.category as
                                      | 'organization_ids'
                                      | 'tag_ids'
                                      | 'category_ids',
                                    item.value,
                                  );
                                  scrollToNowIndicator();
                                }}
                                className="w-fit h-fit cursor-pointer"
                              />
                            ) : (
                              <div className="w-[18px] h-[18px]"></div>
                            )}
                          </div>
                        ))}
                        <p className="px-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                          +{remainingCount}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2 w-[340px]">
                        {allLabels.map((item, index) => (
                          <div
                            key={index}
                            className=" h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#DAE2EB]">
                            <span className="min-w-[71px] truncate">
                              {item.label}
                            </span>
                            {!isLoadingSchedule ? (
                              <ImageRound
                                src={`/icons/close.svg`}
                                name="close"
                                className="w-fit h-fit cursor-pointer"
                                onClick={() => {
                                  handleRemoveItem(
                                    item.category as
                                      | 'organization_ids'
                                      | 'tag_ids'
                                      | 'category_ids',
                                    item.value,
                                  );
                                  scrollToNowIndicator();
                                }}
                              />
                            ) : (
                              <div className="w-[18px] h-[18px]"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Transition
                    as={Fragment}
                    show={isOpenModalFilter}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute left-0 top-5 z-[30] w-[400px] transform">
                      <ActionFilterTaskTeam
                        handleClose={() => setIsOpenModalFilter(false)}
                        listMemberTeam={listMemberTeam}
                        handleReadyToFetch={() => {
                          scrollToNowIndicator();
                        }}
                        handleScroll={() => scrollToNowIndicator()}
                      />
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>
          </div>
          <InputSearch
            className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
            inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
            iconClassName="w-[14px] h-[14px]"
            placeholder="タスク、キーワードを検索"
          />
        </div>
      </div>
      {isLoadingSchedule && (
        <div className="absolute h-[calc(100vh_-_150px)] w-full z-[30] ">
          <RowSkeleton
            numberOfRows={1}
            className="h-full flex-grow !rounded-[14px] w-[calc(100%)] !bg-[#E6F3FB] !bg-[linear-gradient(100deg,_#ffffff00_40%,_#ffffff80_50%,_#ffffff00_60%)] !bg-[length:200%_100%]"
            classNameCustom="h-full"
          />
        </div>
      )}
      <div
        key={pathname}
        className={`w-full relative  overflow-visible min-w-0 calendar-team-custom day ${getAllDayEventCountText(events)} `}
        style={{ overflowX: 'auto', width: '100%' }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            resourceTimeGridPlugin,
            resourcePlugin,
            scrollgridPlugin,
          ]}
          initialView={CalendarViewOptions.VIEW_BY_DAY}
          resources={currentResources}
          resourceOrder={(a: any, b: any) => {
            if (a.id === String(session?.user.id)) return -1;
            if (b.id === String(session?.user.id)) return 1;
            return Number(a.id) - Number(b.id);
          }}
          resourceLabelContent={(resource) => {
            const memberInfo = listMemberTeam.find(
              (member) => String(member.id) == String(resource.resource.id),
            );
            return (
              <div className="flex items-center justify-start gap-2">
                <CustomUserAvatar
                  avatarUrl={memberInfo?.avatarUrl || ''}
                  avatarColor={memberInfo?.color || ''}
                  size={36}
                />
                <p className="line-clamp-2 break-all max-w-[100%] text-[15px] font-medium text-black">
                  {resource.resource.title}
                </p>
              </div>
            );
          }}
          datesAboveResources={true}
          headerToolbar={false}
          datesSet={handleDatesSet}
          locale={'ja-JP'}
          height={'70vh'}
          dayMinWidth={300}
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
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: false,
            hour12: false,
          }}
          slotDuration={isOptionZoomSchedule}
          // slotLabelInterval={isOptionZoomSchedule}
          slotEventOverlap={false}
          slotLabelContent={({ text }: { text: any }) => (
            <div className="text-[12px] text-[#77858F]">{text}</div>
          )}
          firstDay={1}
          scrollTimeReset={false}
          allDayText="終日"
          dayPopoverFormat={{
            month: 'long',
            day: 'numeric',
          }}
          views={{
            resourceTimeGridDay: {
              titleFormat: (date) => {
                setDisplayMonth(date.date.month + 1);
                setDisplayDay(date.date.day);
                setCurrentDate(date.date.marker);
                return `${date.date.year}年 ${date.date.month + 1}月 ${date.date.day}日`;
              },
            },
          }}
        />
      </div>

      {/* Option select value zoom */}
      <div
        style={{
          boxShadow: '0px 2px 8px 0px #0000001A',
        }}
        className={`w-[180px] px-3 z-20 h-[38px] absolute rounded-[100px] right-[70px] bottom-[35px] bg-white flex items-center `}>
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
            scrollToNowIndicator();
          }}
        />
      </div>
    </div>
  );
};

export default ScheduleTeamBoard;
