import React, { MutableRefObject, useContext, useEffect } from 'react';
import { isSameDay } from 'date-fns';

import ImageRound from '@components/common/ImageRound';
import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
} from '@utils/date';
import { useSession } from 'next-auth/react';
import { hasPermissionInArray } from '@utils';
import Tippy from '@tippyjs/react';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import { NO_SETTING } from '@constants';
import { DataDetailEventType } from '@interfaces/task';
import { EventEditFormData, EventParticipant } from '@interfaces/calendar';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { ActionsEvent, PermissionsSystem } from '@constants/enums';

type Props = {
  dataEvent: DataDetailEventType;
  isStart: boolean;
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  handleSetEventParam: ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => void;
  onClose: () => void;
  onDelete?: (values: EventEditFormData) => void;
};

const DetailEventPlanModal = ({
  dataEvent,
  popoverRef,
  onClose,
  onDelete,
  handleSetEventParam,
}: Props) => {
  const { data: session } = useSession();

  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const checkShowUserAvatar = () => {
    return !(
      dataEvent.participants?.length == 1 &&
      dataEvent.participants.find(
        (participant: EventParticipant) => participant.id == session?.user.id,
      )
    );
  };
  const checkShowDimmedUserAvatar = (participantId: number) => {
    return (
      dataEvent.participants &&
      dataEvent.participants.find((item) => Number(item.id) == participantId)
    );
  };
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      {dataEvent && (
        <div className="z-50 flex items-center justify-center">
          <div
            className="font-primary shadow-lg bg-white w-[330px] !rounded-2xl z-50 p-4"
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: `${dataEvent.top}px`,
              left: `${dataEvent.left}px`,
            }}>
            <div className="flex items-center justify-between">
              <p className="font-medium text-xs text-[#77858F]">予定</p>
              <div className="flex gap-1 justify-end items-center">
                {session?.user.permissions &&
                  hasPermissionInArray(
                    session?.user.permissions,
                    PermissionsSystem.MY_TASK_UPDATE,
                  ) && (
                    <Tippy
                      content={'予定を編集'}
                      arrow={false}
                      delay={1000}
                      placement="top"
                      offset={[0, 5]}>
                      <div
                        className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer"
                        onClick={() => {
                          const newId = dataEvent.id.replace('event', '');
                          onClose();
                          handleSetEventParam({
                            id: newId,
                            action: ActionsEvent.EDIT,
                          });
                        }}>
                        <ImageRound
                          name="Edit"
                          src={'/icons/edit-task.svg'}
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
                        className="hover:bg-[#EBF1F4] px-2 py-1.5 hover:rounded-full hover:cursor-pointer"
                        onClick={() => {
                          onClose();
                          onDelete && onDelete(dataEvent);
                        }}>
                        <ImageRound
                          name="Delete"
                          src={'/icons/delete-task.svg'}
                          className="w-[13px] h-[16px] hover:cursor-pointer"
                        />
                      </div>
                    </Tippy>
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

            <p className="font-bold text-[16px] mb-3 break-words">
              {dataEvent?.title}
            </p>
            <div className="flex">
              <p className="">
                {dataEvent?.start &&
                  dataEvent?.end &&
                  (isSameDay(
                    new Date(dataEvent?.start),
                    new Date(dataEvent?.end),
                  )
                    ? formatShowDeadline(dataEvent?.start)
                    : `${formatShowDeadline(dataEvent?.start)} ~ ${formatShowDeadline(dataEvent?.end)}`)}{' '}
              </p>
            </div>
            {dataEvent && dataEvent.isAllDay ? (
              <p className="text-[14px]">終日</p>
            ) : (
              dataEvent &&
              dataEvent.start &&
              dataEvent.end && (
                <div className="flex gap-1 items-center text-[14px]">
                  <p className="text-[12px]">開始</p>
                  <p>
                    {formatHoursAndMinutesForDateTime(
                      new Date(dataEvent.start),
                    )}
                  </p>
                  <p className="text-[12px]">~</p>
                  <p className="text-[12px]">終了</p>
                  <p>
                    {formatHoursAndMinutesForDateTime(new Date(dataEvent.end))}
                  </p>
                </div>
              )
            )}
            <div className="flex items-center gap-3 mt-3">
              <p className="flex-none text-[14px]">場所</p>
              <p className="bg-[#EBF1F7] rounded-[4px] px-[5px] py-[6px] truncate max-w-[305px] text-[14px]">
                {dataEvent?.address || `${NO_SETTING}`}
              </p>
            </div>
            {dataEvent && checkShowUserAvatar() && (
              <div className="mt-3">
                <p className="text-[#77858F] flex-none text-[14px] mb-3">
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
                      <p className="text-[#000000] text-[14px] font-medium">
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
                            <div className={`${index > 0 && 'ml-[-6px]'} mb-1`}>
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
      )}
    </>
  );
};

export default DetailEventPlanModal;
