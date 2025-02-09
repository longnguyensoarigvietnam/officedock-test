import { memo, useContext, useEffect, useRef } from 'react';
import { isSameDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

import { NO_SETTING } from '@constants';
import { PermissionsSystem } from '@constants/enums';

import { EventEditFormData, EventParticipant } from '@interfaces/calendar';

import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
} from '@utils/date';
import { hasPermissionInArray } from '@utils';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

export type EventInfoModalProps = {
  top?: number;
  left?: number;
  dataEvent?: EventEditFormData;
  checkShowUserAvatar: (participants?: EventParticipant[]) => boolean
  onClose: () => void;
  onEdit?: (values: EventEditFormData) => void;
  onDelete?: (values: EventEditFormData) => void;
  selectedScheduleUserIds: string;
};

const EventInfoModal = memo(
  ({
    top,
    left,
    dataEvent,
    checkShowUserAvatar,
    onEdit,
    onDelete,
    onClose,
    selectedScheduleUserIds,
  }: EventInfoModalProps) => {
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const { data: session } = useSession();
    const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

    const handleClosePopover = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    useEffect(() => {
      document.addEventListener('click', handleClosePopover, true);
      return () => {
        document.removeEventListener('click', handleClosePopover, true);
      };
    }, []);

    const checkShowDimmedUserAvatar = (participantId: number) => {
      return !selectedScheduleUserIds
        .split(',')
        .map((num) => num.trim())
        .filter(Boolean)
        .find((selectedUserId) => Number(selectedUserId) == participantId);
    };

    return (
      <div className="z-50 flex items-center justify-center">
        <div
          className="font-primary shadow-sm shadow-[#072338] bg-[#0068B6] w-[330px] !rounded-2xl z-50 p-4"
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
          }}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-xs text-white">予定</p>
            <div className="flex gap-1 justify-end items-center">
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_UPDATE,
                ) && (
                  <Tippy
                    content={'予定を編集'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
                    <div
                      className="hover:bg-[#1f7abf] p-1.5 hover:rounded-full hover:cursor-pointer"
                      onClick={() => {
                        onEdit && onEdit(dataEvent as EventEditFormData);
                      }}>
                      <ImageRound
                        name="Edit"
                        src={'/icons/edit-event.svg'}
                        className="w-[16px] h-[16px] hover:cursor-pointer"
                      />
                    </div>
                  </Tippy>
                )}
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_DELETE,
                ) && (
                  <Tippy
                    content={'予定を削除'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
                    <div
                      className="hover:bg-[#1f7abf] px-2 py-1.5 hover:rounded-full hover:cursor-pointer"
                      onClick={() => {
                        onDelete && onDelete(dataEvent as EventEditFormData);
                      }}>
                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-event.svg'}
                        className="w-[13px] h-[16px] hover:cursor-pointer"
                      />
                    </div>
                  </Tippy>
                )}
              <div
                className="hover:bg-[#1f7abf] p-1.5 hover:rounded-full hover:cursor-pointer"
                onClick={onClose}>
                <ImageRound
                  name="Close"
                  src={'/icons/white-close.svg'}
                  className="w-[18px] h-[18px] hover:cursor-pointer"
                />
              </div>
            </div>
          </div>

          <p className="text-white font-bold text-[16px] mb-3 break-words">
            {dataEvent?.title}
          </p>
          <div className="flex">
            <p className="text-white">
              {dataEvent?.startDate &&
                dataEvent?.endDate &&
                (isSameDay(
                  new Date(dataEvent?.startDate),
                  new Date(dataEvent?.endDate),
                )
                  ? formatShowDeadline(dataEvent?.startDate)
                  : `${formatShowDeadline(dataEvent?.startDate)} ~ ${formatShowDeadline(dataEvent?.endDate)}`)}{' '}
            </p>
          </div>
          {dataEvent && dataEvent.isAllDay ? (
            <p className="text-white text-[14px]">終日</p>
          ) : (
            dataEvent &&
            dataEvent.startDate &&
            dataEvent.endDate && (
              <div className="flex gap-1 items-center text-white text-[14px]">
                <p className="text-[12px]">開始</p>
                <p>
                  {formatHoursAndMinutesForDateTime(
                    new Date(dataEvent.startDate),
                  )}
                </p>
                <p className="text-[12px]">~</p>
                <p className="text-[12px]">終了</p>
                <p>
                  {formatHoursAndMinutesForDateTime(
                    new Date(dataEvent.endDate),
                  )}
                </p>
              </div>
            )
          )}
          <div className="flex gap-3 mt-3">
            <p className="text-white flex-none text-[14px]">場所</p>
            <p className="text-[#0068B6] bg-white rounded-md px-1 py-0.5 truncate max-w-[305px] text-[14px]">
              {dataEvent?.address || `${NO_SETTING}`}
            </p>
          </div>
          {dataEvent &&
            checkShowUserAvatar(
              dataEvent.participants,
            ) && (
              <div className="mt-3">
                <p className="text-white flex-none text-[14px] mb-3">
                  参加メンバー {dataEvent.participants?.length}人
                </p>
                <div className="flex flex-wrap">
                  {dataEvent.participants &&
                  dataEvent.participants?.length == 1 ? (
                    <div className="flex gap-2 items-center">
                      <Tippy
                        content={`${dataEvent.participants[0].fullName}`}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 5]}>
                        <div
                          className={`border-[2px] border-white rounded-full w-[40px] h-[40px] ${checkShowDimmedUserAvatar(Number(dataEvent.participants[0].id)) && 'opacity-60'}`}>
                          {AvatarIconWithDynamicColor({
                            color:
                              (dataEvent.participants?.[0] &&
                                dashboardMembersWithAvatars?.find(
                                  (member) =>
                                    member.id ===
                                    dataEvent.participants?.[0]?.id,
                                )?.avatarColor) ||
                              '',
                            size: 36,
                            customClassName: '!mt-0',
                          })}
                        </div>
                      </Tippy>
                      <p className="text-white text-[14px] font-medium">
                        {dataEvent.participants[0].fullName}
                      </p>
                    </div>
                  ) : (
                    dataEvent.participants
                      ?.sort((a: EventParticipant, b: EventParticipant) => {
                        const aIsDimmed = checkShowDimmedUserAvatar(
                          Number(a.id),
                        );
                        const bIsDimmed = checkShowDimmedUserAvatar(
                          Number(b.id),
                        );

                        if (aIsDimmed !== bIsDimmed) {
                          return aIsDimmed ? 1 : -1;
                        }

                        return a.fullName.localeCompare(b.fullName);
                      })
                      ?.map((participant, index) => {
                        const avatarColor = dashboardMembersWithAvatars?.find(
                          (member) => member.id == participant.id,
                        )?.avatarColor;
                        return (
                          <Tippy
                            content={`${participant.fullName}`}
                            arrow={false}
                            delay={1000}
                            key={index}
                            placement="top"
                            offset={[0, 5]}>
                            <div
                              className={`${index > 0 && 'ml-[-6px]'} mb-1 border-[2px] border-white rounded-full w-[40px] h-[40px] ${checkShowDimmedUserAvatar(Number(participant.id)) && 'opacity-60'}`}>
                              {AvatarIconWithDynamicColor({
                                color: avatarColor || '',
                                size: 36,
                                customClassName: '!mt-0',
                              })}
                            </div>
                          </Tippy>
                        );
                      })
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    );
  },
);

export default EventInfoModal;
