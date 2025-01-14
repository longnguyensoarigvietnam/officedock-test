import { memo, useEffect, useRef } from 'react';
import { isSameDay } from 'date-fns';
import { useSession } from 'next-auth/react';

import ImageRound from '@components/common/ImageRound';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

import { NO_SETTING } from '@constants';
import { EventCalendarType, PermissionsSystem } from '@constants/enums';

import {
  CalendarDashboardMember,
  EventEditFormData,
  EventParticipant,
} from '@interfaces/calendar';

import { formatShowDeadline, getTimeRangeForClickDate } from '@utils/date';
import { hasPermissionInArray } from '@utils';

export type EventInfoModalProps = {
  top?: number;
  left?: number;
  dataEvent?: EventEditFormData;
  dashboardMembers?: CalendarDashboardMember[];
  checkShowUserAvatar: (
    type?: EventCalendarType,
    participants?: EventParticipant[],
  ) => boolean | EventParticipant | undefined;
  onClose: () => void;
  onEdit?: (values: EventEditFormData) => void;
  onDelete?: (values: EventEditFormData) => void;
};

const EventInfoModal = memo(
  ({
    top,
    left,
    dataEvent,
    dashboardMembers,
    checkShowUserAvatar,
    onEdit,
    onDelete,
    onClose,
  }: EventInfoModalProps) => {
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const { data: session } = useSession();

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
          <div className="flex gap-1 justify-end mb-3 items-center">
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CALENDAR_UPDATE,
              ) && (
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
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CALENDAR_DELETE,
              ) && (
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
          <p className="text-white font-medium mb-3 bg-[#1f7abf] break-words p-2 rounded-md">
            {dataEvent?.title}
          </p>
          <div className="flex">
            <p className="text-white pl-2">
              {dataEvent?.startDate &&
                dataEvent?.endDate &&
                isSameDay(
                  new Date(dataEvent?.startDate),
                  new Date(dataEvent?.endDate),
                ) &&
                formatShowDeadline(dataEvent?.startDate)}{' '}
            </p>
          </div>
          {dataEvent && dataEvent.startDate && dataEvent.endDate && (
            <p className="text-white pl-2">
              {getTimeRangeForClickDate(
                new Date(dataEvent.startDate),
                new Date(dataEvent.endDate),
              )}
            </p>
          )}
          <div className="flex gap-3 mt-3 pl-2">
            <p className="text-white flex-none">場所</p>
            <p className="text-[#0068B6] bg-white rounded-md px-1 py-0.5 truncate max-w-[305px]">
              {dataEvent?.address || `${NO_SETTING}`}
            </p>
          </div>
          {dataEvent &&
            checkShowUserAvatar(
              EventCalendarType.SCHEDULE,
              dataEvent.participants,
            ) && (
              <div className="flex items-center gap-3 mt-3 pl-2">
                <p className="text-white flex-none">参加者</p>
                <div className="flex gap-2 flex-wrap">
                  {dataEvent.participants
                    ?.sort((prev: EventParticipant, next: EventParticipant) =>
                      prev.fullName.localeCompare(next.fullName),
                    )
                    ?.map((participant) => {
                      const avatarColor = dashboardMembers?.find(
                        (member) => member.id == participant.id,
                      )?.avatarColor;
                      return AvatarIconWithDynamicColor({
                        color: avatarColor || '',
                        size: 36,
                      });
                    })}
                </div>
              </div>
            )}
        </div>
      </div>
    );
  },
);

export default EventInfoModal;
