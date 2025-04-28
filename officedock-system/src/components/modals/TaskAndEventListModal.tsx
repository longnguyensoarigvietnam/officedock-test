import { useSession } from 'next-auth/react';
import { Dispatch, MutableRefObject, SetStateAction, useContext } from 'react';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Spinner from '@components/common/Spinner';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { EventCalendarType, PermissionsSystem } from '@constants/enums';
import { CalendarPopoverInfo, EventParticipant } from '@interfaces/calendar';
import { hasPermissionInArray } from '@utils';
import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getDateInfo,
} from '@utils/date';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { isSameDay } from 'date-fns';

interface TaskAndEventListModalProps {
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  popoverInfo: CalendarPopoverInfo | null;
  popoverInfoLoading: boolean;
  setDefaultCreateStartDate: Dispatch<SetStateAction<Date | undefined>>;
  handlePopoverClose: () => void;
  handleCreateNewEventFromPopup: () => void;
  handleEventClickInPopup: (
    eventType: string,
    eventId: string,
    taskScheduleId: string | undefined,
  ) => void;
  checkShowUserAvatar: (
    type?: EventCalendarType,
    participants?: EventParticipant[],
  ) => boolean;
}

export const TaskAndEventListModal = ({
  popoverRef,
  popoverInfo,
  popoverInfoLoading,
  setDefaultCreateStartDate,
  handlePopoverClose,
  handleCreateNewEventFromPopup,
  handleEventClickInPopup,
  checkShowUserAvatar,
}: TaskAndEventListModalProps) => {
  const { data: session } = useSession();
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const showUserAvatars = (
    participantList: EventParticipant[],
    type: string,
  ) => {
    if (participantList && participantList.length > 0) {
      if (type == EventCalendarType.TASK) {
        const memberInfo = dashboardMembersWithAvatars.find(
          (member) => member.id == session?.user.id,
        );
        return (
          <DynamicTooltip
            content={`${session?.user.profile.fullName}`}
            placement="top">
            <div className="border-[1px] border-white rounded-full w-[26.5px] h-[26.5px] mt-[-7px] mr-1">
              <CustomUserAvatar
                avatarUrl={memberInfo?.avatar || ''}
                avatarColor={memberInfo?.avatarColor || ''}
                size={30}
              />
            </div>
          </DynamicTooltip>
        );
      } else {
        if (participantList.length == 1) {
          const memberInfo = dashboardMembersWithAvatars.find(
            (member) => member.id == participantList[0].id,
          );
          return (
            <DynamicTooltip
              content={`${participantList[0].fullName}`}
              placement="top">
              <div className="border-[1px] border-white rounded-full w-[26.5px] h-[26.5px] mt-[-7px] mr-1">
                <CustomUserAvatar
                  avatarUrl={memberInfo?.avatar || ''}
                  avatarColor={memberInfo?.avatarColor || ''}
                  size={30}
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
                      className={`border-[1px] border-white rounded-full w-[26.5px] h-[26.5px] ${index != 0 && 'ml-[-7px]'}`}>
                      <CustomUserAvatar
                        avatarUrl={memberInfo?.avatar || ''}
                        avatarColor={memberInfo?.avatarColor || ''}
                        size={30}
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
                      className={`border-[1px] border-white rounded-full w-[26.5px] h-[26.5px] ${index != 0 && 'ml-[-7px]'}`}>
                      <CustomUserAvatar
                        avatarUrl={memberInfo?.avatar || ''}
                        avatarColor={memberInfo?.avatarColor || ''}
                        size={30}
                      />
                    </div>
                  </DynamicTooltip>
                );
              })}
              {participantList && participantList.length > 1 && (
                <DynamicTooltip
                  content={`他に${participantList.length - 1}人の表示があります`}
                  placement="top">
                  <div className="text-white border-[1px] ml-[-7px] border-white rounded-full w-[26.5px] h-[26.5px] text-[11px] font-medium bg-[#77858F] flex items-center justify-center">
                    +{participantList.length - 1}
                  </div>
                </DynamicTooltip>
              )}
            </div>
          );
        }
      }
    }
  };
  return (
    <>
      {popoverInfo && (
        <div
          className={`p-4 bg-white border custom-popover w-[330px] border-gray-200 shadow-lg font-primary max-h-[500px] overflow-y-auto !rounded-2xl py-4`}
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${popoverInfo ? popoverInfo.top : 0}px`,
            left: `${popoverInfo ? popoverInfo.left : 0}px`,
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
                      <span className="text-sm font-medium">({dayOfWeek})</span>
                    </>
                  );
                })()
              : ''}
          </h3>
          <ul className="list-disc">
            {popoverInfo.events.map((event) => {
              return (
                <li
                  key={event.id}
                  className={`text-xs list-none mb-1 bg-[#EBF1F7] text-[#444546] !rounded-[8px] pl-1.5 pt-1`}
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
                    {checkShowUserAvatar(event.type, event.participants) &&
                      showUserAvatars(
                        event.participants || [],
                        event.type as string,
                      )}
                    <div className="mb-2">
                      <div className="font-semibold max-w-[200px] min-h-4 truncate">
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
                          {event.address}
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
                    handlePopoverClose();
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
      )}
    </>
  );
};
