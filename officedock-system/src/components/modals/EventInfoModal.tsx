import { memo, useContext, useEffect, useRef, useState } from 'react';
import { isSameDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import tinycolor from 'tinycolor2';

import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { NO_SETTING } from '@constants';
import { EventCalendarType, PermissionsSystem } from '@constants/enums';

import { EventEditFormData, EventParticipant } from '@interfaces/calendar';
import { LocationEventType } from '@interfaces/location';

import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
} from '@utils/date';
import { calculatePopupPosition, hasPermissionInArray } from '@utils';

import { GlobalStateContext } from '@providers/GlobalStateProvider';

export type EventInfoModalProps = {
  top?: number;
  left?: number;
  dataEvent?: EventEditFormData;
  checkShowUserAvatar: (
    type?: EventCalendarType,
    participants?: EventParticipant[],
  ) => boolean;
  onClose: () => void;
  onEdit?: (values: EventEditFormData) => void;
  onCopy?: (values: EventEditFormData) => void;
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
    onCopy,
    onDelete,
    onClose,
    selectedScheduleUserIds,
  }: EventInfoModalProps) => {
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const { data: session } = useSession();
    const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
    const [popupPosition, setPopupPosition] = useState<{
      top: number;
      left: number;
    }>({
      top: Number(top),
      left: Number(left),
    });

    useEffect(() => {
      if (popoverRef.current) {
        const popupRect = popoverRef.current.getBoundingClientRect();
        const adjustedPosition = calculatePopupPosition(
          popupRect,
          popupPosition,
        );

        setPopupPosition(adjustedPosition);
      }
    }, []);

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

    const lightenColor = (color: string, amount = 40) => {
      return tinycolor(color).lighten(amount).toString();
    };

    return (
      <div className="z-50">
        <div
          className="font-primary shadow-lg bg-white w-[330px] !rounded-2xl z-50 p-4"
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
          }}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-xs text-[#77858F]">予定</p>
            <div className="flex gap-1 justify-end items-center">
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_UPDATE,
                ) && (
                  <DynamicTooltip content={'予定を編集'} placement="top">
                    <div
                      className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer opacity-25 hover:opacity-100"
                      onClick={() => {
                        onEdit && onEdit(dataEvent as EventEditFormData);
                      }}>
                      <ImageRound
                        name="Edit"
                        src={'/icons/edit-task.svg'}
                        className="w-[15px] h-[15px] hover:cursor-pointer"
                      />
                    </div>
                  </DynamicTooltip>
                )}
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_ADD,
                ) && (
                  <DynamicTooltip content={'予定を複製'} placement="top">
                    <div
                      className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer opacity-25 hover:opacity-100"
                      onClick={() => {
                        onCopy && onCopy(dataEvent as EventEditFormData);
                      }}>
                      <ImageRound
                        name="Copy"
                        src={'/icons/copy-event.svg'}
                        className="w-[16px] h-[16px] hover:cursor-pointer"
                      />
                    </div>
                  </DynamicTooltip>
                )}
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CALENDAR_DELETE,
                ) && (
                  <DynamicTooltip content={'予定を削除'} placement="top">
                    <div
                      className="hover:bg-[#EBF1F4] px-2 py-1.5 hover:rounded-full hover:cursor-pointer opacity-25 hover:opacity-100"
                      onClick={() => {
                        onDelete && onDelete(dataEvent as EventEditFormData);
                      }}>
                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-task.svg'}
                        className="w-[13px] h-[16px] hover:cursor-pointer"
                      />
                    </div>
                  </DynamicTooltip>
                )}
              <div
                className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer"
                onClick={onClose}>
                <ImageRound
                  name="Close"
                  src={'/icons/close.svg'}
                  className="w-[18px] h-[18px] hover:cursor-pointer"
                />
              </div>
            </div>
          </div>

          <p className="font-bold text-[16px] mb-3 break-all line-clamp-3">
            {dataEvent?.title}
          </p>
          <div className="flex">
            <p className="">
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
            <p className="text-[14px]">終日</p>
          ) : (
            dataEvent &&
            dataEvent.startDate &&
            dataEvent.endDate && (
              <div className="flex gap-1 items-center text-[14px]">
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
          <div className="flex items-center gap-3 mt-3">
            <p className="flex-none text-[14px]">場所</p>
            <p className="bg-[#EBF1F7] rounded-[4px] px-[5px] py-[6px] truncate max-w-[305px] text-[14px]">
              {(dataEvent?.location as LocationEventType)?.name ||
                `${NO_SETTING}`}
            </p>
          </div>
          {dataEvent &&
            checkShowUserAvatar(
              EventCalendarType.SCHEDULE,
              dataEvent.participants,
            ) && (
              <div className="mt-3">
                <p className="text-[#77858F] flex-none text-[14px] mb-3">
                  参加メンバー {dataEvent.participants?.length}人
                </p>
                <div className="flex flex-wrap">
                  {dataEvent.participants &&
                  dataEvent.participants?.length == 1 ? (
                    <div className="flex gap-2 items-center">
                      <DynamicTooltip
                        content={`${dataEvent.participants[0].fullName}`}
                        placement="top">
                        <div
                          className={`border-[2px] border-white rounded-full w-[40px] h-[40px] ${checkShowDimmedUserAvatar(Number(dataEvent.participants[0].id)) && 'opacity-60'}`}>
                          <CustomUserAvatar
                            avatarUrl={
                              (dataEvent.participants?.[0] &&
                                dashboardMembersWithAvatars?.find(
                                  (member) =>
                                    member.id ===
                                    dataEvent.participants?.[0]?.id,
                                )?.avatar) ||
                              ''
                            }
                            avatarColor={
                              (dataEvent.participants?.[0] &&
                                dashboardMembersWithAvatars?.find(
                                  (member) =>
                                    member.id ===
                                    dataEvent.participants?.[0]?.id,
                                )?.avatarColor) ||
                              ''
                            }
                            size={36}
                            customClassName={`${
                              !dataEvent.participants?.[0] &&
                              dashboardMembersWithAvatars?.find(
                                (member) =>
                                  member.id === dataEvent.participants?.[0]?.id,
                              )?.avatar &&
                              '!mt-0'
                            }`}
                          />
                        </div>
                      </DynamicTooltip>
                      <p className="text-[#000000] text-[14px] font-medium w-[250px] break-words">
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
                        const memberInfo = dashboardMembersWithAvatars?.find(
                          (member) => member.id == participant.id,
                        );
                        return (
                          <DynamicTooltip
                            content={`${participant.fullName}`}
                            key={index}
                            placement="top">
                            <div className={`${index > 0 && 'ml-[-6px]'} mb-1`}>
                              <CustomUserAvatar
                                avatarUrl={memberInfo?.avatar || ''}
                                avatarColor={
                                  checkShowDimmedUserAvatar(
                                    Number(participant.id),
                                  )
                                    ? lightenColor(
                                        memberInfo?.avatarColor || '',
                                        30,
                                      )
                                    : memberInfo?.avatarColor || ''
                                }
                                size={36}
                                customClassName={`${!memberInfo?.avatar && '!mt-0'}`}
                              />
                            </div>
                          </DynamicTooltip>
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
