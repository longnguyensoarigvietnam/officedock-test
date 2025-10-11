import { memo, useEffect, useRef, useState } from 'react';
import { isSameDay } from 'date-fns';
import { useSessionCache } from '@providers/SessionCacheProvider';

import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { NO_SETTING } from '@constants';
import { PermissionsSystem, TaskRepetitiveValue } from '@constants/enums';

import { EventEditFormData, EventParticipant } from '@interfaces/calendar';
import { LocationEventType } from '@interfaces/location';
import { Profile } from '@interfaces/user';

import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getJapaneseWeekDay,
} from '@utils/date';
import { calculatePopupPosition, hasPermissionInArray } from '@utils';

export type EventInfoModalProps = {
  top?: number;
  left?: number;
  dataEvent?: EventEditFormData;
  dashboardMemberList: Profile[];
  dataOptionsOrganizations: {
    id: string | number;
    fullName: string;
    color: string;
    userIds: number[];
    avatarUrl: string;
  }[];
  selectedScheduleUserIds: string;
  checkShowUserAvatar: (participants?: EventParticipant[]) => boolean;
  onClose: () => void;
  onEdit?: (values: EventEditFormData) => void;
  onCopy?: (values: EventEditFormData) => void;
  onDelete?: (values: EventEditFormData) => void;
};

const EventInfoModal = memo(
  ({
    top,
    left,
    dataEvent,
    dashboardMemberList,
    dataOptionsOrganizations,
    selectedScheduleUserIds,
    checkShowUserAvatar,
    onEdit,
    onCopy,
    onDelete,
    onClose,
  }: EventInfoModalProps) => {
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const { data: session } = useSessionCache();
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
        const adjustedPosition = calculatePopupPosition({
          popupRect,
          currentPosition: popupPosition,
          padding: 20,
        });

        setPopupPosition(adjustedPosition);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkShowDimmedUserAvatar = (participantId: number) => {
      return !selectedScheduleUserIds
        .split(',')
        .map((num) => num.trim())
        .filter(Boolean)
        .find((selectedUserId) => Number(selectedUserId) == participantId);
    };

    const displayRepetitiveEventTime = (dataEvent: EventEditFormData) => {
      let title = '';
      const repeatStartTime = dataEvent.startDate
        ? formatHoursAndMinutesForDateTime(new Date(dataEvent.startDate))
        : '';
      const repeatEndTime = dataEvent.endDate
        ? formatHoursAndMinutesForDateTime(new Date(dataEvent.endDate))
        : '';
      switch (dataEvent?.repeatType as string) {
        case TaskRepetitiveValue.DAILY:
          title = '毎日' + repeatStartTime + '~' + repeatEndTime;
          break;
        case TaskRepetitiveValue.WEEKLY:
          title =
            '毎週' +
            getJapaneseWeekDay(Number(dataEvent.weekDay || 0)) +
            '曜日' +
            repeatStartTime +
            '~' +
            repeatEndTime;
          break;
        case TaskRepetitiveValue.MONTHLY:
          title =
            '毎月' +
            dataEvent.monthDay +
            '日' +
            repeatStartTime +
            '~' +
            repeatEndTime;
          break;
        case TaskRepetitiveValue.YEARLY:
          title =
            '毎年' +
            dataEvent.month +
            '月' +
            dataEvent.monthDay +
            '日' +
            repeatStartTime +
            '~' +
            repeatEndTime;
          break;
      }
      return title;
    };

    // Show user avatars
    const showUserAvatars = (participantList: EventParticipant[]) => {
      return (
        <div className="mt-3">
          <p className="text-[#77858F] flex-none text-[12px] mb-[10px] leading-none">
            参加メンバー {participantList?.length}人
          </p>
          <div className="flex flex-wrap">
            {participantList && participantList?.length == 1 ? (
              <div className="flex gap-2 items-center">
                <DynamicTooltip
                  content={`${participantList[0].fullName}`}
                  placement="top">
                  <div
                    className={`rounded-full relative ${checkShowDimmedUserAvatar(Number(participantList[0].id)) && 'opacity-60'}`}>
                    <CustomUserAvatar
                      avatarUrl={
                        (participantList?.[0] &&
                          dashboardMemberList?.find(
                            (member) => member.id === participantList?.[0]?.id,
                          )?.avatar) ||
                        ''
                      }
                      avatarColor={
                        (participantList?.[0] &&
                          dashboardMemberList?.find(
                            (member) => member.id === participantList?.[0]?.id,
                          )?.avatarColor) ||
                        ''
                      }
                      size={26}
                      customClassName={`${
                        !participantList?.[0] &&
                        dashboardMemberList?.find(
                          (member) => member.id === participantList?.[0]?.id,
                        )?.avatar &&
                        '!mt-0'
                      }`}
                    />
                  </div>
                </DynamicTooltip>
                <p className="text-[#000000] text-[14px] font-medium w-[180px] break-words">
                  {participantList[0].fullName}
                </p>
              </div>
            ) : (
              participantList
                ?.sort((a: EventParticipant, b: EventParticipant) => {
                  const aIsDimmed = checkShowDimmedUserAvatar(Number(a.id));
                  const bIsDimmed = checkShowDimmedUserAvatar(Number(b.id));

                  if (aIsDimmed !== bIsDimmed) {
                    return aIsDimmed ? 1 : -1;
                  }

                  return a.fullName.localeCompare(b.fullName);
                })
                ?.map((participant, index) => {
                  const memberInfo = dashboardMemberList?.find(
                    (member) => member.id == participant.id,
                  );
                  return (
                    <DynamicTooltip
                      content={`${participant.fullName}`}
                      key={index}
                      placement="top">
                      <div
                        className={`${index > 0 && 'ml-[-6px]'} relative mb-1 inline-block`}>
                        <CustomUserAvatar
                          avatarUrl={memberInfo?.avatar || ''}
                          avatarColor={memberInfo?.avatarColor || ''}
                          size={26}
                          customClassName={`${!memberInfo?.avatar && '!mt-0 border-[2px] rounded-full border-white/60'}`}
                        />

                        {checkShowDimmedUserAvatar(Number(participant.id)) && (
                          <div className="absolute inset-0 rounded-full bg-white/60 border-[2px] border-white/60 pointer-events-none" />
                        )}
                      </div>
                    </DynamicTooltip>
                  );
                })
            )}
          </div>
        </div>
      );
    };

    // Show organization avatars
    const showOrgAvatars = (orgIds: number[]) => {
      if (!orgIds?.length) return null;

      return (
        <div className="mt-3">
          <p className="text-[#77858F] flex-none text-[12px] mb-[10px] leading-none">
            参加メンバー {orgIds.length}チーム
          </p>

          <div className="flex flex-wrap items-center">
            {orgIds.map((orgId, index) => {
              const orgInfo = dataOptionsOrganizations.find(
                (org) => org.id === orgId,
              );

              return (
                <div
                  key={orgInfo?.id || orgId}
                  className="flex items-center gap-2">
                  <DynamicTooltip
                    content={orgInfo?.fullName || ''}
                    placement="top">
                    <div
                      className={`relative rounded-full ${
                        index > 0 ? 'ml-[-6px]' : ''
                      }`}>
                      {orgInfo?.avatarUrl ? (
                        <CustomUserAvatar
                          avatarUrl={orgInfo.avatarUrl}
                          avatarColor={orgInfo.color || ''}
                          size={26}
                        />
                      ) : (
                        <div className="scale-[0.9285]">
                          <GroupIconWithDynamicColor
                            color={orgInfo?.color || '#228CDB'}
                          />
                        </div>
                      )}
                    </div>
                  </DynamicTooltip>

                  {/* Show org name if there's only one organization */}
                  {orgIds.length === 1 && (
                    <span className="text-[#000000] text-[14px] font-medium w-[180px] break-words">
                      {orgInfo?.fullName || ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    // Show avatars depending on event
    const showEventAvatars = (event: EventEditFormData) => {
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
      if (checkShowUserAvatar(event.participants))
        return showUserAvatars(event.participants || []);

      return null;
    };

    return (
      <div className="z-50">
        <div
          className="font-primary bg-white w-[250px] !rounded-[14px] z-50 px-5 py-[10px]"
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            boxShadow: '0px 2px 8px 0px #0000001A'
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
                        className="w-[13px] h-[13px] hover:cursor-pointer"
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
                        className="w-[13px] h-[13px] hover:cursor-pointer"
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
                        className="w-[12px] h-[14px] hover:cursor-pointer"
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
                  className="w-[15px] h-[15px] hover:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <p className="font-bold text-[16px] mb-3 break-all line-clamp-3">
            {dataEvent?.title}
          </p>
          {/* Date - time */}
          {(dataEvent?.repeatType as string) != TaskRepetitiveValue.ONCE ? (
            <>{displayRepetitiveEventTime(dataEvent!)}</>
          ) : (
            <>
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
            </>
          )}

          {/* Location */}
          <div className="flex items-center gap-[6px] mt-3">
            <p className="flex-none text-[14px]">場所</p>
            <p className="bg-[#EBF1F7] h-[22px] rounded-[4px] px-[5px] truncate max-w-[175px] text-[14px]">
              {(dataEvent?.location as LocationEventType)?.name ||
                `${NO_SETTING}`}
            </p>
            {dataEvent?.isEventOverlapping && (
              <ImageRound
                src={`/icons/overlap-task.svg`}
                name="icon warning"
                className="w-3 h-3"
              />
            )}
          </div>
          {/* Participants */}
          {dataEvent ? showEventAvatars(dataEvent) ?? <></> : <></>}
        </div>
      </div>
    );
  },
);

export default EventInfoModal;
