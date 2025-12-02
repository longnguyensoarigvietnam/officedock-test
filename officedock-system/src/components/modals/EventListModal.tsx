import { useSessionCache } from '@providers/SessionCacheProvider';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { isSameDay } from 'date-fns';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Spinner from '@components/common/Spinner';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { CalendarViewOptions, PermissionsSystem } from '@constants/enums';
import { JAPANESE_TIME_ZONE } from '@constants';

import {
  CalendarPopoverInfo,
  EventCalendarDetail,
  EventParticipant,
} from '@interfaces/calendar';
import { Profile } from '@interfaces/user';

import { calculatePopupPosition, hasPermissionInArray } from '@utils';
import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getDateInfo,
} from '@utils/date';

interface EventListModalProps {
  eventListModalInfo: CalendarPopoverInfo | null;
  dashboardMemberList: Profile[];
  popoverInfoLoading: boolean;
  dataOptionsOrganizations: {
    id: string | number;
    fullName: string;
    color: string;
    userIds: number[];
    avatarUrl: string;
  }[];
  calendarView: CalendarViewOptions;
  setEventListModalInfo: Dispatch<SetStateAction<CalendarPopoverInfo | null>>;
  setDefaultCreateStartDate: Dispatch<SetStateAction<Date | undefined>>;
  handleCreateNewEventFromPopup: () => void;
  handleEventClickInPopup: (params: {
    eventId: string;
    repeatScheduleId: string;
    eventInfo: EventCalendarDetail;
  }) => void;
  checkShowUserAvatar: (participants?: EventParticipant[]) => boolean;
}

export const EventListModal = ({
  eventListModalInfo,
  dashboardMemberList,
  popoverInfoLoading,
  dataOptionsOrganizations,
  setEventListModalInfo,
  setDefaultCreateStartDate,
  handleCreateNewEventFromPopup,
  handleEventClickInPopup,
  checkShowUserAvatar,
  calendarView,
}: EventListModalProps) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSessionCache();
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
  }>({
    top: eventListModalInfo ? Number(eventListModalInfo.top) : 0,
    left: eventListModalInfo ? Number(eventListModalInfo.left) : 0,
  });

  // Handle close popup
  const closePopover = () => {
    setEventListModalInfo(null);
    setDefaultCreateStartDate(undefined);
  };
  const handleClosePopover = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node)
    ) {
      closePopover();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClosePopover, true);
    return () => {
      document.removeEventListener('click', handleClosePopover, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (popoverInfoLoading) return;

    if (popoverRef.current) {
      const popupRect = popoverRef.current.getBoundingClientRect();
      const adjustedPosition = calculatePopupPosition({
        calendarView,
        popupRect,
        currentPosition: popupPosition,
        padding: 20,
      });
      if (
        adjustedPosition.left != popupPosition.left ||
        adjustedPosition.top != popupPosition.top
      ) {
        setPopupPosition(adjustedPosition);
      }
    }
  }, [calendarView, popupPosition, popoverInfoLoading]);

  // Render single user avatar
  const renderUserAvatar = (participant: EventParticipant, index?: number) => {
    const memberInfo = dashboardMemberList.find(
      (member) => member.id === participant.id,
    );

    return (
      <DynamicTooltip
        key={participant.id}
        content={participant.fullName}
        placement="top">
        <div className={`relative rounded-full ${index ? 'ml-[-7px]' : ''}`}>
          <CustomUserAvatar
            avatarUrl={memberInfo?.avatar || ''}
            avatarColor={memberInfo?.avatarColor || ''}
            size={24}
          />
        </div>
      </DynamicTooltip>
    );
  };

  // Render single org avatar
  const renderOrgAvatar = (orgId: number, index?: number) => {
    const orgInfo = dataOptionsOrganizations.find((org) => org.id === orgId);

    return (
      <DynamicTooltip
        key={orgInfo?.id}
        content={orgInfo?.fullName || ''}
        placement="top">
        <div className={`relative rounded-full ${index ? 'ml-[-7px]' : ''}`}>
          {orgInfo?.avatarUrl ? (
            <CustomUserAvatar
              avatarUrl={orgInfo.avatarUrl}
              avatarColor={orgInfo.color || ''}
              size={24}
            />
          ) : (
            <GroupIconWithDynamicColor
              color={orgInfo?.color || '#228CDB'}
              size={24}
            />
          )}
        </div>
      </DynamicTooltip>
    );
  };

  // Show user avatars
  const showUserAvatars = (participantList: EventParticipant[]) => {
    if (!participantList?.length) return null;

    const count = participantList.length;

    if (count === 1) return renderUserAvatar(participantList[0]);

    return (
      <div className="flex items-center">
        {participantList
          .slice(0, count > 2 ? 1 : 2)
          .map((p, i) => renderUserAvatar(p, i))}
        {count > 2 && (
          <DynamicTooltip
            content={`他に${count - 1}人の表示があります`}
            placement="top">
            <div className="text-white relative border-[1px] !w-[24px] h-[24px] ml-[-7px] border-white rounded-full text-[10px] font-medium bg-[#77858F] flex items-center justify-center">
              +{count - 1}
            </div>
          </DynamicTooltip>
        )}
      </div>
    );
  };

  // Show organization avatars
  const showOrgAvatars = (orgIds: number[]) => {
    if (!orgIds?.length) return null;

    const count = orgIds.length;

    if (count === 1) return renderOrgAvatar(orgIds[0]);

    return (
      <div className="flex items-center">
        {orgIds
          .slice(0, count > 2 ? 1 : 2)
          .map((orgId, i) => renderOrgAvatar(orgId, i))}
        {count > 2 && (
          <DynamicTooltip
            content={`他に${count - 1}チームの表示があります`}
            placement="top">
            <div className="text-white relative border-[1px] !w-[24px] h-[24px] ml-[-7px] border-white rounded-full text-[10px] font-medium bg-[#77858F] flex items-center justify-center">
              +{count - 1}
            </div>
          </DynamicTooltip>
        )}
      </div>
    );
  };

  // Show avatars depending on event
  const showEventAvatars = (event: EventCalendarDetail) => {
    const organizationIds = event.selectOrganizations || [];
    const userIds = event.participants?.map((user) => Number(user.id)) || [];

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

    if (showOrganizationAvatar) return showOrgAvatars(organizationIds);
    if (checkShowUserAvatar(event.participants)) {
      const filteredParticipants = event.participants?.filter((p) => {
        if (!p.deletedAt) return true;

        const deletedDate = new Date(p.deletedAt);

        if (deletedDate < new Date(event.start)) return false;

        return true;
      });

      return showUserAvatars(filteredParticipants || []);
    }

    return null;
  };

  return (
    <div className="z-50">
      <div
        className={`px-[6px] pt-5 pb-[14px] bg-white custom-popover w-[230px] font-primary overflow-y-auto !rounded-[14px]`}
        ref={popoverRef}
        style={{
          position: 'absolute',
          top: `${popoverInfoLoading ? popupPosition.top - 70 : popupPosition.top}px`,
          left: `${popupPosition.left}px`,
          boxShadow: '0px 2px 8px 0px #0000001A',
        }}>
        <div
          className="absolute right-[6px] top-[6px]"
          onClick={() => {
            closePopover();
          }}>
          <ImageRound
            name="Close"
            src={'/icons/close-with-bg.svg'}
            className="w-[24px] h-[24px] hover:cursor-pointer"
          />
        </div>
        {eventListModalInfo && (
          <h3 className="text-center mb-5">
            {eventListModalInfo.date
              ? (() => {
                  const { day, dayOfWeek, month } = getDateInfo(
                    new Date(eventListModalInfo.date),
                  );
                  return (
                    <>
                      <span className="text-base font-medium mr-2 leading-none">
                        {month}月{day}日
                      </span>
                      <span className="text-xs font-medium leading-none">
                        ({dayOfWeek})
                      </span>
                    </>
                  );
                })()
              : ''}
          </h3>
        )}

        <ul className="flex flex-col gap-1 max-h-[256px] overflow-y-auto">
          {eventListModalInfo &&
            eventListModalInfo?.events
              ?.sort((preEvent, nextEvent) => {
                // Prioritize all-day events first
                if (preEvent.allDay != nextEvent.allDay) {
                  return preEvent.allDay ? -1 : 1;
                }

                // Safely convert start dates to Japanese time (if undefined, fallback to 0)
                const preTime = preEvent.start
                  ? new Date(
                      new Date(preEvent.start).toLocaleString('ja-JP', {
                        timeZone: JAPANESE_TIME_ZONE,
                      }),
                    ).getTime()
                  : 0;
                const nextTime = nextEvent.start
                  ? new Date(
                      new Date(nextEvent.start).toLocaleString('ja-JP', {
                        timeZone: JAPANESE_TIME_ZONE,
                      }),
                    ).getTime()
                  : 0;
                // Ascending order (earliest first)
                return preTime - nextTime;
              })
              .map((event) => {
                return (
                  <li
                    key={event.eventId}
                    className={`text-xs bg-[#EBF1F7] text-[#444546] flex items-center !rounded-[8px] pl-[10px] h-[48px] ${event?.id && event?.id.includes('holiday') && 'hover:cursor-not-allowed'}`}
                    onClick={() => {
                      if (event.id && !event?.id.includes('holiday')) {
                        setEventListModalInfo(null);
                        handleEventClickInPopup({
                          eventId: event?.eventId || '',
                          repeatScheduleId: event.id,
                          eventInfo: event,
                        });
                      }
                    }}>
                    <div className="flex items-center gap-[10px] h-[48px]">
                      {event ? showEventAvatars(event) : <></>}
                      <div className="flex flex-col gap-[10px]">
                        <p
                          className={`font-semibold max-w-[150px] truncate ${event?.id && event?.id.includes('holiday') && 'text-error'}`}>
                          {event.title || ''}
                        </p>
                        <div className="flex gap-1">
                          <div className="flex">
                            {event && event.allDay && (
                              <p className="text-[11px] mr-1 leading-[1.2]">
                                終日
                              </p>
                            )}
                            <p
                              className={`text-[11px] leading-[1.2] ${
                                event?.start &&
                                event?.end &&
                                !isSameDay(
                                  new Date(event?.start),
                                  new Date(event?.end),
                                ) &&
                                'mr-1'
                              }`}>
                              {event?.start &&
                                event?.end &&
                                (isSameDay(
                                  new Date(event?.start),
                                  new Date(event?.end),
                                )
                                  ? ''
                                  : `${formatShowDeadline(event?.start)} ~ ${formatShowDeadline(event?.end)}`)}{' '}
                            </p>
                            {event &&
                              !event.allDay &&
                              event.start &&
                              event.end && (
                                <div className="flex gap-1 items-center text-[11px] leading-[1.2]">
                                  <p>
                                    {formatHoursAndMinutesForDateTime(
                                      new Date(event.start),
                                    )}
                                  </p>
                                  <p className="text-[11px]">~</p>
                                  <p>
                                    {formatHoursAndMinutesForDateTime(
                                      new Date(event.end),
                                    )}
                                  </p>
                                </div>
                              )}
                          </div>
                          <p className="text-[11px] truncate max-w-[78px] leading-[1.2]">
                            {event.location?.name}
                          </p>
                        </div>
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
            <DynamicTooltip content={'予定を新規作成'} placement="top">
              <div
                className={`mx-auto mt-2 w-fit hover:cursor-pointer hover:rounded-full p-[6px] hover:bg-gray-200 border-[1px] border-transparent`}
                onClick={() => {
                  setEventListModalInfo(null);
                  handleCreateNewEventFromPopup();
                }}>
                <ImageRound
                  src={`/icons/add.svg`}
                  name="Add"
                  className="!w-3 !h-3"
                />
              </div>
            </DynamicTooltip>
          )}
      </div>
    </div>
  );
};
