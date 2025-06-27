import { isSameDay } from 'date-fns';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { useRouter } from 'next/navigation';
import React, { useContext } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import { NO_SETTING } from '@constants';
import {
  ActionsEvent,
  ItemStartType,
  PermissionsSystem,
  TaskRepetitiveValue,
} from '@constants/enums';
import { pageRouters } from '@constants/routers';

import { EventEditFormData, EventParticipant } from '@interfaces/calendar';
import { DataDetailEventType } from '@interfaces/task';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { hasPermissionInArray } from '@utils';
import {
  formatHoursAndMinutesForDateTime,
  formatShowDeadline,
  getJapaneseWeekDay,
} from '@utils/date';

type Props = {
  dataEvent: DataDetailEventType;
  onDelete?: (values: EventEditFormData) => void;
};

const PopupDetailEvent = ({ dataEvent, onDelete }: Props) => {
  const { data: session } = useSessionCache();
  const router = useRouter();

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

  const displayRepetitiveEventTime = (dataEvent: DataDetailEventType) => {
    let title = '';
    const repeatStartTime = dataEvent.start
      ? formatHoursAndMinutesForDateTime(new Date(dataEvent.start))
      : '';
    const repeatEndTime = dataEvent.end
      ? formatHoursAndMinutesForDateTime(new Date(dataEvent.end))
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

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-medium text-xs text-[#77858F]">予定</p>
        <div className="flex gap-1 justify-end items-center">
          {session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.MY_TASK_UPDATE,
            ) && (
              <DynamicTooltip content={'予定に移動'} placement="top">
                <div
                  className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer"
                  onClick={() => {
                    const newId = dataEvent.scheduleId;

                    router.push(
                      `${pageRouters.CALENDAR_MANAGEMENT.href}?event=${newId}&type=${ItemStartType.SCHEDULE}&action=${ActionsEvent.EDIT}`,
                    );
                  }}>
                  <ImageRound
                    name="go to"
                    src={'/icons/go.svg'}
                    className="w-[18px] h-[16px] hover:cursor-pointer"
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
                  className="hover:bg-[#EBF1F4] px-2 py-1.5 hover:rounded-full hover:cursor-pointer"
                  onClick={() => {
                    onDelete && onDelete(dataEvent);
                  }}>
                  <ImageRound
                    name="Delete"
                    src={'/icons/delete-task.svg'}
                    className="w-[13px] h-[16px] hover:cursor-pointer"
                  />
                </div>
              </DynamicTooltip>
            )}
        </div>
      </div>

      <p className="font-bold text-[16px] mb-3 break-words">
        {dataEvent?.title}
      </p>

      {(dataEvent?.repeatType as string) != TaskRepetitiveValue.ONCE ? (
        <>{displayRepetitiveEventTime(dataEvent!)}</>
      ) : (
        <>
          <div className="flex">
            <p className="">
              {dataEvent?.start &&
                dataEvent?.end &&
                (isSameDay(new Date(dataEvent?.start), new Date(dataEvent?.end))
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
                  {formatHoursAndMinutesForDateTime(new Date(dataEvent.start))}
                </p>
                <p className="text-[12px]">~</p>
                <p className="text-[12px]">終了</p>
                <p>
                  {formatHoursAndMinutesForDateTime(new Date(dataEvent.end))}
                </p>
              </div>
            )
          )}
        </>
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
            {dataEvent.participants && dataEvent.participants?.length == 1 ? (
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
                              member.id === dataEvent.participants?.[0]?.id,
                          )?.avatar) ||
                        ''
                      }
                      avatarColor={
                        (dataEvent.participants?.[0] &&
                          dashboardMembersWithAvatars?.find(
                            (member) =>
                              member.id === dataEvent.participants?.[0]?.id,
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
                <p className="text-[#000000] text-[14px] font-medium">
                  {dataEvent.participants[0].fullName}
                </p>
              </div>
            ) : (
              dataEvent.participants
                ?.sort((a: EventParticipant, b: EventParticipant) => {
                  const aIsDimmed = checkShowDimmedUserAvatar(Number(a.id));
                  const bIsDimmed = checkShowDimmedUserAvatar(Number(b.id));

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
                          avatarColor={memberInfo?.avatarColor || ''}
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
    </>
  );
};

export default PopupDetailEvent;
