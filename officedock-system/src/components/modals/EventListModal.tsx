import { useSession } from 'next-auth/react';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { isSameDay } from 'date-fns';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Spinner from '@components/common/Spinner';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import {
  CalendarViewOptions,
  EventCalendarType,
  PermissionsSystem,
} from '@constants/enums';

import { CalendarPopoverInfo, EventParticipant } from '@interfaces/calendar';

import { calculatePopupPosition, hasPermissionInArray } from '@utils';
import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getDateInfo,
} from '@utils/date';

import { GlobalStateContext } from '@providers/GlobalStateProvider';

interface EventListModalProps {
  eventListModalInfo: CalendarPopoverInfo | null;
  popoverInfoLoading: boolean;
  setEventListModalInfo: Dispatch<SetStateAction<CalendarPopoverInfo | null>>;
  setDefaultCreateStartDate: Dispatch<SetStateAction<Date | undefined>>;
  handleCreateNewEventFromPopup: () => void;
  handleEventClickInPopup: (eventId: string, repeatScheduleId: string) => void;
  checkShowUserAvatar: (
    type?: EventCalendarType,
    participants?: EventParticipant[],
  ) => boolean;
  calendarView: CalendarViewOptions;
}

export const EventListModal = ({
  eventListModalInfo,
  popoverInfoLoading,
  setEventListModalInfo,
  setDefaultCreateStartDate,
  handleCreateNewEventFromPopup,
  handleEventClickInPopup,
  checkShowUserAvatar,
  calendarView,
}: EventListModalProps) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
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
  }, []);

  useEffect(() => {
    if (popoverRef.current) {
      const popupRect = popoverRef.current.getBoundingClientRect();
      const adjustedPosition = calculatePopupPosition({
        calendarView,
        popupRect,
        currentPosition: popupPosition,
        padding: 20,
      });

      setPopupPosition(adjustedPosition);
    }
  }, [popupPosition, calendarView]);

  const showUserAvatars = (participantList: EventParticipant[]) => {
    if (participantList && participantList.length > 0) {
      if (participantList.length == 1) {
        const memberInfo = dashboardMembersWithAvatars.find(
          (member) => member.id == participantList[0].id,
        );
        return (
          <DynamicTooltip
            content={`${participantList[0].fullName}`}
            placement="top">
            <div className="border-[1px] border-white rounded-full mt-[-7px] mr-1">
              <CustomUserAvatar
                avatarUrl={memberInfo?.avatar || ''}
                avatarColor={memberInfo?.avatarColor || ''}
                size={27}
              />
            </div>
          </DynamicTooltip>
        );
      } else if (participantList.length === 2) {
        return (
          <div className="mt-[-7px] mr-1 flex items-center">
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
                    className={`border-[1px] border-white rounded-full ${index != 0 && 'ml-[-7px]'}`}>
                    <CustomUserAvatar
                      avatarUrl={memberInfo?.avatar || ''}
                      avatarColor={memberInfo?.avatarColor || ''}
                      size={27}
                    />
                  </div>
                </DynamicTooltip>
              );
            })}
          </div>
        );
      } else if (participantList.length > 2) {
        return (
          <div className="mt-[-7px] mr-1 flex items-center">
            {participantList.slice(0, 1).map((participant, index) => {
              const memberInfo = dashboardMembersWithAvatars.find(
                (member) => member.id === participant.id,
              );

              return (
                <DynamicTooltip
                  content={`${participant.fullName}`}
                  placement="top"
                  key={participant.id}>
                  <div
                    className={`border-[1px] border-white rounded-full ${index != 0 && 'ml-[-7px]'}`}>
                    <CustomUserAvatar
                      avatarUrl={memberInfo?.avatar || ''}
                      avatarColor={memberInfo?.avatarColor || ''}
                      size={27}
                    />
                  </div>
                </DynamicTooltip>
              );
            })}
            {participantList && participantList.length > 1 && (
              <DynamicTooltip
                content={`他に${participantList.length - 1}人の表示があります`}
                placement="top">
                <div className="text-white border-[1px] w-[27px] h-[27px] ml-[-7px] border-white rounded-full text-[11px] font-medium bg-[#77858F] flex items-center justify-center">
                  +{participantList.length - 1}
                </div>
              </DynamicTooltip>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="z-50">
      <div
        className={`p-4 bg-white border custom-popover w-[330px] border-gray-200 shadow-lg font-primary max-h-[330px] overflow-y-auto !rounded-2xl py-4`}
        ref={popoverRef}
        style={{
          position: 'absolute',
          top: `${popupPosition.top}px`,
          left: `${popupPosition.left}px`,
        }}>
        <div
          className="hover:bg-[#EBF1F4] absolute p-1.5 right-2 top-2 hover:rounded-full hover:cursor-pointer"
          onClick={() => {
            closePopover();
          }}>
          <ImageRound
            name="Close"
            src={'/icons/close.svg'}
            className="w-[18px] h-[18px] hover:cursor-pointer"
          />
        </div>
        {eventListModalInfo && (
          <h3 className="text-center mb-4">
            {eventListModalInfo.date
              ? (() => {
                  const { day, dayOfWeek, month } = getDateInfo(
                    new Date(eventListModalInfo.date),
                  );
                  return (
                    <>
                      <span className="text-md font-semibold mr-1">
                        {month}月{day}日
                      </span>
                      <span className="text-sm font-medium">({dayOfWeek})</span>
                    </>
                  );
                })()
              : ''}
          </h3>
        )}

        <ul className="list-disc max-h-[195px] overflow-y-auto">
          {eventListModalInfo &&
            eventListModalInfo?.events
              ?.sort((preEvent, nextEvent) => {
                // Put allDay: true first
                return preEvent.allDay == nextEvent.allDay
                  ? 0
                  : preEvent.allDay
                    ? -1
                    : 1;
              })
              .map((event) => {
                return (
                  <li
                    key={event.eventId}
                    className={`text-xs list-none mb-1 bg-[#EBF1F7] text-[#444546] !rounded-[8px] pl-1.5 pt-1 ${event.repeatScheduleId.includes('holiday') && 'hover:cursor-not-allowed'}`}
                    onClick={() => {
                      if (!event.repeatScheduleId.includes('holiday')) {
                        setEventListModalInfo(null);
                        handleEventClickInPopup(
                          event.eventId,
                          event.repeatScheduleId,
                        );
                      }
                    }}>
                    <div className="flex items-center gap-2">
                      {checkShowUserAvatar(event.type, event.participants) &&
                        showUserAvatars(event.participants || [])}
                      <div className="mb-2">
                        <div
                          className={`font-semibold max-w-[200px] min-h-4 truncate ${event.repeatScheduleId.includes('holiday') && 'text-error'}`}>
                          {event.title || ''}
                        </div>
                        <div className="flex gap-1">
                          <div className="flex">
                            {event && event.allDay && (
                              <p className="text-[11px] mr-1">終日</p>
                            )}
                            <p
                              className={`text-[11px] ${
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
                                <div className="flex gap-1 items-center text-[11px]">
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
                          <p className="text-[11px] truncate max-w-[100px]">
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
                className={`mx-auto mt-3 w-fit hover:cursor-pointer hover:rounded-full p-[6px] hover:bg-gray-200 border-[1px] border-transparent`}
                onClick={() => {
                  setEventListModalInfo(null);
                  handleCreateNewEventFromPopup();
                }}>
                <ImageRound
                  src={`/icons/add.svg`}
                  name="Add"
                  className="!w-4 !h-4 text-"
                />
              </div>
            </DynamicTooltip>
          )}
      </div>
    </div>
  );
};
