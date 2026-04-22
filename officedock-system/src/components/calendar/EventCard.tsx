'use client';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import {
  CalendarViewOptions,
  EventCalendarType,
  SelectedEventOpenType,
} from '@constants/enums';

import { EventParticipant } from '@interfaces/calendar';
import { Profile } from '@interfaces/user';

import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadlineAllDayEvent,
  isCurrentTimeWithinEvent,
  isMoreThanThirtyMinutes,
} from '@utils/date';

interface EventCardProps {
  currentView: CalendarViewOptions;
  eventContent: any;
  isMySchedule: boolean;
  timeText: string;
  selectedEventInfo: {
    eventId: string | number;
    repeatScheduleId: string | number;
    openType: SelectedEventOpenType;
  } | null;
  dataOptionsOrganizations: {
    id: string | number;
    fullName: string;
    color: string;
    userIds: number[];
    avatarUrl: string;
  }[];
  dashboardMemberList: Profile[];
  currentResources: {
    id: string;
    title: string;
  }[];
  checkShowUserAvatar: (
    participants?: EventParticipant[] | undefined,
  ) => boolean;
}

export const EventCard = ({
  currentView,
  eventContent,
  isMySchedule,
  timeText,
  selectedEventInfo,
  dataOptionsOrganizations,
  dashboardMemberList,
  currentResources,
  checkShowUserAvatar,
}: EventCardProps) => {
  // Show user's avatar
  const showUserAvatars = ({
    participantList,
    avatarSize,
    isWeekView,
    isWeekViewAllDaySection,
  }: {
    participantList: EventParticipant[];
    avatarSize: number;
    isWeekView?: boolean;
    isWeekViewAllDaySection?: boolean;
  }) => {
    // ============================================================
    // FILTER: remove members with deletedAt < eventStart
    // ============================================================
    const filteredList =
      participantList?.filter((p) => {
        const memberInfo = dashboardMemberList.find(
          (member) => member.id === p.id,
        );

        // Cannot find member in dashboard → skip
        if (!memberInfo) return false;

        // No deletedAt → still show
        if (!memberInfo.deletedAt) return true;

        // If there is no eventStart (just in case) → just show
        if (!eventContent.event.start) return true;

        // deletedAt < eventStart → không show
        return (
          new Date(memberInfo.deletedAt) >= new Date(eventContent.event.start)
        );
      }) || [];

    // After filtering, if there is no one left, then stop.
    if (!filteredList.length) return null;

    // ============================================================
    //  Use filteredList instead of participantList from here on
    // ============================================================
    if (filteredList.length === 1) {
      const memberInfo = dashboardMemberList.find(
        (member) => member.id == filteredList[0].id,
      );
      return (
        <DynamicTooltip content={`${filteredList[0].fullName}`} placement="top">
          <div className={`relative`}>
            <CustomUserAvatar
              avatarUrl={memberInfo?.avatar || ''}
              avatarColor={memberInfo?.avatarColor || ''}
              size={avatarSize}
              isCalendarScreen={true}
            />
          </div>
        </DynamicTooltip>
      );
    } else if (filteredList.length === 2) {
      return (
        <div className="mr-1 flex items-center">
          {filteredList.map((participant, index) => {
            const memberInfo = dashboardMemberList.find(
              (member) => member.id === participant.id,
            );

            return (
              <DynamicTooltip
                content={`${participant.fullName}`}
                placement="top"
                key={participant.id}>
                <div className={`relative ${index != 0 && 'ml-[-7px]'}`}>
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
    } else if (filteredList.length > 2) {
      return (
        <div className={`mr-1 flex items-center ${!isWeekView && 'gap-1'}`}>
          {filteredList
            .slice(0, isWeekView ? 5 : 1)
            .map((participant, index) => {
              const memberInfo = dashboardMemberList.find(
                (member) => member.id === participant.id,
              );

              return (
                <DynamicTooltip
                  content={`${participant.fullName}`}
                  placement="top"
                  key={participant.id}>
                  <div className={`relative ${index != 0 && 'ml-[-7px]'}`}>
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
            ? filteredList.length > 5 && (
                <DynamicTooltip
                  content={`他に${filteredList.length - 5}人の表示があります`}
                  placement="top">
                  <div
                    className={`text-[#77858F] relative text-[11px] font-medium ml-[-12px] ${
                      isWeekView &&
                      'border-[1px] !ml-[-12px] border-white text-white rounded-full shrink-0 !w-[26px] !h-[26px] bg-[#77858F] flex items-center justify-center'
                    }`}>
                    +{filteredList.length - 5}
                  </div>
                </DynamicTooltip>
              )
            : filteredList.length > 1 && (
                <DynamicTooltip
                  content={`他に${filteredList.length - 1}人の表示があります`}
                  placement="top">
                  <div
                    className={`text-[#77858F] relative text-[11px] font-medium ${
                      isWeekViewAllDaySection &&
                      'border-[1px] !ml-[-12px] !text-[9px] text-white shrink-0 border-white rounded-full !w-[22.5px] !h-[22.5px] bg-[#77858F] flex items-center justify-center'
                    } `}>
                    +{filteredList.length - 1}
                  </div>
                </DynamicTooltip>
              )}
        </div>
      );
    }

    return null;
  };

  // Show organization's avatar
  const showOrgAvatars = ({
    selectOrganizations,
    avatarSize,
    isWeekView,
    isWeekViewAllDaySection,
  }: {
    selectOrganizations: number[];
    avatarSize: number;
    isWeekView?: boolean;
    isWeekViewAllDaySection?: boolean;
  }) => {
    const avaScale = avatarSize / 28;
    if (selectOrganizations && selectOrganizations.length > 0) {
      if (selectOrganizations.length == 1) {
        const orgInfo = dataOptionsOrganizations.find(
          (org) => org.id === selectOrganizations[0],
        );
        return (
          <DynamicTooltip content={`${orgInfo?.fullName}`} placement="top">
            <div className={`relative`}>
              {orgInfo?.avatarUrl ? (
                <CustomUserAvatar
                  avatarUrl={orgInfo?.avatarUrl || ''}
                  avatarColor={orgInfo?.color || ''}
                  size={avatarSize}
                  isCalendarScreen={true}
                />
              ) : (
                <div style={{ transform: `scale(${avaScale})` }}>
                  <GroupIconWithDynamicColor
                    color={orgInfo?.color || '#228CDB'}
                  />
                </div>
              )}
            </div>
          </DynamicTooltip>
        );
      } else if (selectOrganizations.length === 2) {
        return (
          <div className="mr-1 flex items-center">
            {selectOrganizations.map((orgId, index) => {
              const orgInfo = dataOptionsOrganizations.find(
                (org) => org.id === orgId,
              );

              return (
                <DynamicTooltip
                  content={`${orgInfo?.fullName}`}
                  placement="top"
                  key={orgInfo?.id}>
                  <div className={`relative ${index != 0 && 'ml-[-7px]'}`}>
                    {orgInfo?.avatarUrl ? (
                      <CustomUserAvatar
                        avatarUrl={orgInfo?.avatarUrl || ''}
                        avatarColor={orgInfo?.color || ''}
                        size={avatarSize}
                        isCalendarScreen={true}
                      />
                    ) : (
                      <div style={{ transform: `scale(${avaScale})` }}>
                        <GroupIconWithDynamicColor
                          color={orgInfo?.color || '#228CDB'}
                        />
                      </div>
                    )}
                  </div>
                </DynamicTooltip>
              );
            })}
          </div>
        );
      } else if (selectOrganizations.length > 2) {
        return (
          <div className={`mr-1 flex items-center ${!isWeekView && 'gap-1'}`}>
            {selectOrganizations
              .slice(0, isWeekView ? 5 : 1)
              .map((orgId, index) => {
                const orgInfo = dataOptionsOrganizations.find(
                  (org) => org.id === orgId,
                );

                return (
                  <DynamicTooltip
                    content={`${orgInfo?.fullName}`}
                    placement="top"
                    key={orgInfo?.id}>
                    <div className={`relative ${index != 0 && 'ml-[-7px]'}`}>
                      {orgInfo?.avatarUrl ? (
                        <CustomUserAvatar
                          avatarUrl={orgInfo?.avatarUrl || ''}
                          avatarColor={orgInfo?.color || ''}
                          size={avatarSize}
                          isCalendarScreen={true}
                        />
                      ) : (
                        <div style={{ transform: `scale(${avaScale})` }}>
                          <GroupIconWithDynamicColor
                            color={orgInfo?.color || '#228CDB'}
                          />
                        </div>
                      )}
                    </div>
                  </DynamicTooltip>
                );
              })}
            {isWeekView
              ? selectOrganizations &&
                selectOrganizations.length > 5 && (
                  <DynamicTooltip
                    content={`他に${selectOrganizations.length - 5}チームの表示があります`}
                    placement="top">
                    <div
                      className={`text-[#77858F] relative text-[11px] font-medium ml-[-12px] ${isWeekView && 'border-[1px] !ml-[-12px] border-white text-white rounded-full shrink-0 !w-[33px] !h-[33px] bg-[#77858F] flex items-center justify-center'}`}>
                      +{selectOrganizations.length - 5}
                    </div>
                  </DynamicTooltip>
                )
              : selectOrganizations &&
                selectOrganizations.length > 1 && (
                  <DynamicTooltip
                    content={`他に${selectOrganizations.length - 1}チームの表示があります`}
                    placement="top">
                    <div
                      className={`text-[#77858F] relative text-[11px] font-medium ${isWeekViewAllDaySection && 'border-[1px] !ml-[-12px] !text-[9px] text-white shrink-0 border-white rounded-full !w-[22.5px] !h-[22.5px] bg-[#77858F] flex items-center justify-center'} `}>
                      +{selectOrganizations.length - 1}
                    </div>
                  </DynamicTooltip>
                )}
          </div>
        );
      }
    }
  };

  // Show avatars depending on event
  const showEventAvatars = ({
    participantList,
    selectOrganizations,
    avatarSize,
    isWeekView,
    isWeekViewAllDaySection,
  }: {
    participantList: EventParticipant[];
    selectOrganizations: number[];
    avatarSize: number;
    isWeekView?: boolean;
    isWeekViewAllDaySection?: boolean;
  }) => {
    const organizationIds = selectOrganizations || [];
    const userIds = participantList?.map((user) => Number(user.id)) || [];

    // Start by assuming we show organization avatars only if there are selected orgs
    let showOrganizationAvatar = organizationIds.length > 0;

    if (showOrganizationAvatar) {
      // Collect all userIds that belong to the selected organizations
      const selectedOrgUserIds = dataOptionsOrganizations
        .filter((org) => organizationIds.includes(Number(org.id)))
        .flatMap((org) => org.userIds);

      // If any participant is not in any selected organization, disable org avatars
      const hasOutsideUser = userIds.some(
        (userId) => !selectedOrgUserIds.includes(userId),
      );

      if (hasOutsideUser) {
        showOrganizationAvatar = false;
      }
    }

    if (showOrganizationAvatar)
      return showOrgAvatars({
        selectOrganizations,
        avatarSize,
        isWeekView,
        isWeekViewAllDaySection,
      });
    return showUserAvatars({
      participantList,
      avatarSize,
      isWeekView,
      isWeekViewAllDaySection,
    });
  };

  if (currentView === CalendarViewOptions.VIEW_BY_WEEK) {
    if (eventContent.event.allDay) {
      if (eventContent.event.extendedProps.type == EventCalendarType.HOLIDAY) {
        return (
          <div className="rounded-sm hover:cursor-pointer mb-1 overflow-hidden">
            <p
              className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-[#E95062] font-semibold px-1 text-[12px]`}>
              {eventContent.event.title != 'null'
                ? eventContent.event.title
                : ''}
            </p>
          </div>
        );
      }

      return (
        <div
          className={`my-1 bg-white hover:cursor-pointer ${eventContent.event.id == selectedEventInfo?.repeatScheduleId && 'selected-all-day-event'}`}>
          <div
            className={` text-black bg-white overflow-hidden !w-[calc(100%_-_1px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}
            style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
            {checkShowUserAvatar(
              eventContent.event.extendedProps.participants,
            ) ? (
              <div className="flex items-center gap-1">
                {showEventAvatars({
                  participantList:
                    eventContent.event.extendedProps.participants,
                  selectOrganizations:
                    eventContent.event.extendedProps.selectOrganizations,
                  avatarSize: 21,
                  isWeekView: false,
                  isWeekViewAllDaySection: true,
                })}
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
        className={`overflow-hidden bg-white p-3 h-full hover:cursor-pointer ${eventContent.event.id == selectedEventInfo?.repeatScheduleId && 'selected-event'} ${isMySchedule && isCurrentTimeWithinEvent({ start: eventContent.event.start, end: eventContent.event.end }) && 'event-has-now-indicator'}`}>
        {checkShowUserAvatar(eventContent.event.extendedProps.participants) &&
          showEventAvatars({
            participantList: eventContent.event.extendedProps.participants,
            selectOrganizations:
              eventContent.event.extendedProps.selectOrganizations,
            avatarSize: 24,
            isWeekView: true,
            isWeekViewAllDaySection: false,
          })}
        <div className={`text-black text-[14px] font-medium`}>
          <p className="font-semibold min-h-5">
            {eventContent.event.title != 'null' ? eventContent.event.title : ''}
          </p>
        </div>
        <div className={`text-black text-[11px] font-normal`}>
          {new Date(
            new Date(eventContent.event.start).setHours(0, 0, 0, 0),
          ).getTime() !==
          new Date(
            new Date(eventContent.event.end).setHours(0, 0, 0, 0),
          ).getTime() ? (
            <>
              <p className="whitespace-nowrap text-nowrap">
                {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.start))}`}
                ~
                {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.end))}`}
              </p>
              <p className={`text-black text-[11px] font-normal break-all`}>
                {eventContent.event.extendedProps?.location?.name}
              </p>
            </>
          ) : (
            <>
              {isMoreThanThirtyMinutes(eventContent.timeText) && (
                <>
                  <p>{timeText}</p>
                  <p className={`text-black text-[11px] font-normal break-all`}>
                    {eventContent.event.extendedProps?.location?.name}
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
      if (eventContent.event.extendedProps.type == EventCalendarType.HOLIDAY) {
        return (
          <div className="rounded-sm hover:cursor-pointer mb-[1px] overflow-hidden">
            <p
              className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-[#E95062] font-semibold px-1 text-[12px]`}>
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
        <div
          className={`my-1 bg-white hover:cursor-pointer ${eventContent.event.id == selectedEventInfo?.repeatScheduleId && 'selected-all-day-event'}`}>
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
        className={`overflow-hidden hover:cursor-pointer bg-white p-3 h-full ${eventContent.event.id == selectedEventInfo?.repeatScheduleId && 'selected-event'} ${isMySchedule && isCurrentTimeWithinEvent({ start: eventContent.event.start, end: eventContent.event.end }) && 'event-has-now-indicator'}`}>
        <div className={`text-black font-medium text-[14px]`}>
          <p className="truncate max-w-[calc(100%)] font-semibold min-h-5">
            {eventContent.event.title != 'null' ? eventContent.event.title : ''}
          </p>
        </div>{' '}
        <div className={` text-black text-[11px] font-normal`}>
          {new Date(
            new Date(eventContent.event.start).setHours(0, 0, 0, 0),
          ).getTime() !==
          new Date(
            new Date(eventContent.event.end).setHours(0, 0, 0, 0),
          ).getTime() ? (
            <div
              className={`${currentResources.length == 1 && 'flex gap-[10px]'}`}>
              <p className="whitespace-nowrap">
                {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.start))}`}{' '}
                ~{' '}
                {`${formatHoursAndMinutesForDateTime(new Date(eventContent.event.end))}`}
              </p>
              <p className="text-black text-[11px] font-normal break-all">
                {eventContent.event.extendedProps?.location?.name}
              </p>
            </div>
          ) : (
            <>
              {isMoreThanThirtyMinutes(eventContent.timeText) && (
                <div
                  className={`text-black text-[11px] font-normal break-all ${currentResources.length == 1 && 'flex gap-[10px]'}`}>
                  <p className="text-nowrap">{timeText}</p>
                  <p>{eventContent.event.extendedProps?.location?.name}</p>
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
      new Date(
        new Date(eventContent.event.start).setHours(0, 0, 0, 0),
      ).getTime() !==
        new Date(
          new Date(eventContent.event.end).setHours(0, 0, 0, 0),
        ).getTime()
    ) {
      if (eventContent.event.extendedProps.type == EventCalendarType.HOLIDAY) {
        return (
          <div className="rounded-sm hover:cursor-pointer mb-[1px] overflow-hidden">
            <p
              className={`truncate max-w-[calc(100%)] mt-0.5 pt-0.5 h-[25px] text-[#E95062] font-semibold px-1 text-[12px]`}>
              {eventContent.event.title != 'null'
                ? eventContent.event.title
                : ''}
            </p>
          </div>
        );
      }

      return (
        <div
          className={`fc-daygrid-event shadow-lg ${eventContent.event.id == selectedEventInfo?.repeatScheduleId && 'selected-all-day-event'} hover:cursor-pointer`}>
          <div
            className={`text-black bg-white overflow-hidden !w-[calc(100%_-_0px)] py-0.5 !rounded-[8px] text-[12px] font-normal px-1`}>
            {checkShowUserAvatar(
              eventContent.event.extendedProps.participants,
            ) ? (
              <div className="flex items-center gap-1">
                {showEventAvatars({
                  participantList:
                    eventContent.event.extendedProps.participants,
                  selectOrganizations:
                    eventContent.event.extendedProps.selectOrganizations,
                  avatarSize: 21,
                  isWeekView: false,
                  isWeekViewAllDaySection: false,
                })}
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
      <div
        className={`rounded-sm w-full hover:cursor-pointer mb-[1px] overflow-hidden`}>
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
            {eventContent.event.title != 'null' ? eventContent.event.title : ''}
          </p>
        </div>
      </div>
    );
  }
};
