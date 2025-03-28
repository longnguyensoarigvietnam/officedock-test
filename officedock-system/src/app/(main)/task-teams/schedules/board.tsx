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
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import resourcePlugin from '@fullcalendar/resource';
import scrollgridPlugin from '@fullcalendar/scrollgrid';
import { debounce } from 'lodash';
import './styles/index.css';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import InputSearch from '@components/common/InputSearch';
import ActionFilterTaskTeam from '@components/modals/ActionFilterTeamTask';
import DatePicker from '@components/common/DatePicker';
import Dropdown from '@components/common/Dropdown';

import useCreationDataTask from '@hooks/useCreationDataTask';
import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';

import { CalendarViewOptions, ItemScheduleTitleType } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';

import { OptionDropdownType } from '@interfaces/common';
import {
  EventCalendarDayRange,
  EventCalendarDetail,
  EventCalendarProps,
} from '@interfaces/calendar';

import api from '@base/api';

import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import {
  formatHoursAndMinutesForDateTime,
  formatQueryEndDateForCalendar,
  formatQueryStartDateForCalendar,
  formatShowDeadlineAllDayEvent,
  getJapaneseDayName,
  isDateLessThanToday,
  isMidnight,
  isMoreThanThirtyMinutes,
  isTodaySchedule,
} from '@utils/date';
import { getRandomColor } from '@utils';

const ScheduleTeamBoard = () => {
  // Context
  const {
    isLoadingDataTask,
    selectedOptionZoom,
    setSelectedOptionZoom,
    setColumnWidth,
    setCreationDataTaskData,
    orderingOptions,
    setOrderingOptions,
  } = useContext(TaskTeamStateContext);

  // State
  const searchParams = useSearchParams();
  const { setIsLoading } = useContext(LoadingContext);
  const router = useRouter();
  const organizationId = searchParams.get('organization');
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

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
    }[]
  >([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType | null>({
      label: '',
      value: '',
    });

  useCreationDataStatisticTeam({
    organization_id: organizationId || '',
    isTeam: true,
    onSuccess: (data) => {
      if (!data) return;
      if (data.organization) {
        setSelectedOrganization({
          label: data.organization.name,
          value: data.organization.id,
        });
      }
      setListMemberTeam(
        data.members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          color: getRandomColor(),
        })),
      );
      setCurrentResources(
        data.members.map((member) => ({
          id: String(member.id),
          title: member.fullName,
        })),
      );
    },
  });

  const { creationDataTaskData } = useCreationDataTask({
    onSuccess: (data) => {
      setCreationDataTaskData(data);
    },
  });

  useEffect(() => {
    if (organizationId) {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const startDateISOString = formatQueryStartDateForCalendar(
          calendarApi.view.activeStart,
        );
        const endDateISOString = formatQueryEndDateForCalendar(
          calendarApi.view.activeEnd,
        );

        calendarRef.current?.getApi().refetchEvents();

        getPlanEventCalendarByTeam({
          organizationId: String(organizationId),
          startDate: startDateISOString,
          endDate: endDateISOString,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleEventContent = (eventContent: any) => {
    const calendarApi = eventContent.view.calendar;
    const currentView = calendarApi.view.type;
    if (currentView === CalendarViewOptions.VIEW_BY_DAY) {
      if (eventContent.event.allDay) {
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
        <div className="overflow-hidden">
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
    }
  };

  const debouncedFetchCalendarDataPlan = useRef(
    debounce(async (startDate, endDate) => {
      await getPlanEventCalendarByTeam({
        organizationId: String(organizationId),
        startDate,
        endDate,
      });
    }, 1000),
  ).current;
  const debouncedFetchCalendarDataActual = useRef(
    debounce(async (startDate, endDate) => {
      await getActualEventCalendarByTeam({
        organizationId: String(organizationId),
        startDate,
        endDate,
      });
    }, 1000),
  ).current;

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
      if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
        debouncedFetchCalendarDataPlan(startDateISOString, endDateISOString);
      } else {
        debouncedFetchCalendarDataActual(startDateISOString, endDateISOString);
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

      if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
        debouncedFetchCalendarDataPlan(startDateISOString, endDateISOString);
      } else {
        debouncedFetchCalendarDataActual(startDateISOString, endDateISOString);
      }
    }
  };

  const handleNavigateToSpecificDay = (date: Date) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi() as any;
      calendarApi.gotoDate(date);

      const startDateISOString = formatQueryStartDateForCalendar(
        calendarApi.view.activeStart,
      );
      const endDateISOString = formatQueryEndDateForCalendar(
        calendarApi.view.activeEnd,
      );

      if (selectedOptionShow === ItemScheduleTitleType.PLANS) {
        debouncedFetchCalendarDataPlan(startDateISOString, endDateISOString);
      } else {
        debouncedFetchCalendarDataActual(startDateISOString, endDateISOString);
      }
    }
  };
  const handleCallDataWithFilter = () => {
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
    }
  };

  const handleGetActualEventCalendarByTeam = async ({
    organizationId,
    startDate,
    endDate,
  }: {
    organizationId: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams({
      ...(organizationId && { organization_id: String(organizationId) }),
      start_date: startDate || String(currentRange.start),
      end_date: endDate || String(currentRange.end),
      ...(orderingOptions?.user_ids?.length && {
        user_id: orderingOptions.user_ids.map((item) => item.value).join(','),
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
              return {
                title: event.title,
                start: `${event.startDate}`,
                end: `${event.endDate}`,
                allDay: event.isAllDay || false,
                id: `${event.id}`,
                type: event.type,
                participants: event.participants || [],
                address: event.address || '',
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
                event.end = end.toISOString();
              }
            }
            return event;
          });
          setEvents(() => {
            return [...newEvents];
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleGetPlanEventCalendarByTeam = async ({
    organizationId,
    startDate,
    endDate,
  }: {
    organizationId: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams({
      ...(organizationId && { organization_id: String(organizationId) }),
      start_date: startDate || String(currentRange.start),
      end_date: endDate || String(currentRange.end),
      ...(orderingOptions?.user_ids?.length && {
        user_id: orderingOptions.user_ids.map((item) => item.value).join(','),
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
              return {
                title: event.title,
                start: `${event.startDate}`,
                end: `${event.endDate}`,
                allDay: event.isAllDay || false,
                id: `${event.id}`,
                type: event.type,
                participants: event.participants || [],
                address: event.address || '',
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
                event.end = end.toISOString();
              }
            }
            return event;
          });
          setEvents(() => {
            return [...newEvents];
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
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
    }[],
  ) => {
    const slicedParticipants = participants.slice(0, 6);
    const remainingCount =
      participants.length > 3 ? participants.length - 6 : 0;

    return (
      <>
        {slicedParticipants.map((item) => {
          return (
            <div
              className="ml-[-10px] border-[1px] border-white rounded-full h-[32px] w-[32px]"
              key={item.id}>
              {AvatarIconWithDynamicColor({
                color: item.color,
                size: 33,
                customClassName: '!mt-0',
              })}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] border-[1px] border-white rounded-full text-sm text-white w-[32px] h-[32px]">
            +{remainingCount}
          </div>
        )}
      </>
    );
  };

  // Calculate width kanban
  const calculateWidth = (baseWidth: number, percentage: number): number => {
    return (baseWidth * percentage) / 100;
  };

  useEffect(() => {
    if (orderingOptions) {
      handleCallDataWithFilter();
    }
  }, [orderingOptions && orderingOptions?.user_ids]);

  return (
    <>
      <div className="pt-[30px] pr-10  font-medium  w-full">
        <div className="mb-[30px] flex items-center justify-between">
          <div className="flex items-center gap-5 ">
            <div className="rounded-full w-[34px] h-[34px]  flex items-center justify-center overflow-hidden">
              <ImageRound
                className="w-[34px] h-[34px] rounded-full"
                src="/icons/statistic-team.svg"
                border="full"
                name="Multi users"
              />
            </div>
            <span className="text-[26px] font-medium relative top-[-2px] max-w-[350px] truncate">
              {selectedOrganization?.label}
            </span>
            <span className="text-[26px] font-medium relative top-[-2px]">
              チーム集計
            </span>
            <div className="flex justify-center items-center gap-2 ">
              <Button
                variant={'outline'}
                className={`!text-[#77858F] !bg-transparent !border-[#77858F] !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}
                onClick={() => {
                  router.push(
                    `${pageRouters.TASKS_TEAM_MANAGEMENT.href}?organization=${selectedOrganization?.value}&tabId=1`,
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
          </div>
          <div className="flex items-center">
            {listMemberTeam.length > 0 && getParticipantAvatars(listMemberTeam)}
          </div>
        </div>
        <div className={`flex gap-7 mb-6 w-fit min-w-[300px]`}>
          <div className="flex items-center gap-2">
            <div className="flex items-center ml-[-1rem] gap-4">
              <ImageRound
                name="Chevron left"
                src={'/icons/chevron-left-calendar.svg'}
                onClick={handlePrev}
                className="!w-[8px] !h-[10px] hover:cursor-pointer"
              />
              <div className="flex items-end font-normal gap-2">
                <p className="text-[30px] text-[#5B6770] font-medium">
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
            </div>
            <>
              {isDateLessThanToday(currentDate) ? (
                <Button
                  variant="primary"
                  className={`${selectedOptionShow === ItemScheduleTitleType.ACTUAL && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2]  !bg-[#EBF1F7] '} h-6 w-[80px] !px-0 !py-0 text-xs font-bold rounded-[20px]   `}>
                  実績
                </Button>
              ) : isTodaySchedule(currentDate) ? (
                <>
                  <Button
                    variant={
                      isLoadingDataTask
                        ? 'outline'
                        : selectedOptionShow === ItemScheduleTitleType.PLANS
                          ? 'primary'
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
                            organizationId: String(organizationId),
                            startDate: startDateISOString,
                            endDate: endDateISOString,
                          });
                        }
                      }
                    }}
                    className={`${selectedOptionShow === ItemScheduleTitleType.PLANS && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '}  h-6 w-[80px] !px-0 !py-0 text-xs font-bold rounded-[20px]`}>
                    予定
                  </Button>
                  <Button
                    variant={
                      isLoadingDataTask
                        ? 'outline'
                        : selectedOptionShow === ItemScheduleTitleType.ACTUAL
                          ? 'primary'
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
                            organizationId: String(organizationId),
                            startDate: startDateISOString,
                            endDate: endDateISOString,
                          });
                        }
                      }
                    }}
                    className={`${selectedOptionShow === ItemScheduleTitleType.ACTUAL && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2]  !bg-[#EBF1F7] '} h-6 w-[80px] !px-0 !py-0 text-xs font-bold rounded-[20px]   `}>
                    実績
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    className={`${selectedOptionShow === ItemScheduleTitleType.PLANS && !isLoadingDataTask ? '' : '!border-[#A7B7C2] !text-[#A7B7C2] !bg-[#EBF1F7]  '}  h-6 w-[80px] !px-0 !py-0 text-xs font-bold rounded-[20px]`}>
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
                            onClick={() =>
                              handleRemoveItem(
                                item.category as
                                  | 'organization_ids'
                                  | 'tag_ids'
                                  | 'category_ids',
                                item.value,
                              )
                            }
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            <ImageRound
                              src={`/icons/close.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          </div>
                        ))}
                        <p className="px-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                          +{remainingCount}
                        </p>
                      </>
                    ) : (
                      <>
                        {allLabels.map((item, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              handleRemoveItem(
                                item.category as
                                  | 'organization_ids'
                                  | 'tag_ids'
                                  | 'category_ids',
                                item.value,
                              );
                            }}
                            className="w-[105px] h-6 px-[10px] justify-between gap-[6px] text-xs text-black font-medium flex items-center truncate rounded-[20px] bg-[#EBF1F7]">
                            <span className="w-[71px] truncate">
                              {item.label}
                            </span>
                            <ImageRound
                              src={`/icons/close.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          </div>
                        ))}
                      </>
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
                        creationDataTaskData={creationDataTaskData}
                        handleClose={() => setIsOpenModalFilter(false)}
                        listMemberTeam={listMemberTeam}
                        handleReadyToFetch={() => {}}
                      />
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>

            <InputSearch
              className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
              inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
              iconClassName="w-[14px] h-[14px]"
              placeholder="タスク、キーワードを検索"
            />
          </div>
        </div>
      </div>

      <div
        className={`w-full relative calendar-team-custom`}
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
          resourceLabelContent={(resource) => {
            const avatarColor = String(
              listMemberTeam.find(
                (member) => String(member.id) == String(resource.resource.id),
              )?.color,
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
          height={'75vh'}
          dayMinWidth={250}
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
          slotDuration="00:30:00"
          slotLabelInterval="00:30:00"
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
      <div className="fixed flex items-center gap-2 bottom-5 right-20 z-20 ">
        <div className="w-[80px] !h-[30px]">
          <Dropdown
            labelOptionClass="!ml-0 !pr-0 !pl-0 flex justify-center w-full "
            className="text-sm h-8 !py-0 !pl-0 !pr-0 !px-[14px] !rounded-lg"
            classActive="!pr-[10px] !ml-0 w-full text-center left-[52px]"
            classNameOption="top-[-150px] !px-0 text-sm"
            selectedOption={selectedOptionZoom}
            options={[
              {
                label: '100%',
                value: 100,
              },
              {
                label: '90%',
                value: 90,
              },
              {
                label: '75%',
                value: 75,
              },
              {
                label: '50%',
                value: 50,
              },
              {
                label: '25%',
                value: 25,
              },
            ]}
            onChange={(selectedOption) => {
              setSelectedOptionZoom(selectedOption);
              if (selectedOption.value === 25) {
                setColumnWidth(calculateWidth(247, 50));
              } else {
                setColumnWidth(
                  calculateWidth(247, selectedOption.value as number),
                );
              }
            }}
          />
        </div>
      </div>
    </>
  );
};

export default ScheduleTeamBoard;
