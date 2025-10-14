import { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { UseMutateAsyncFunction } from 'react-query';
import FullCalendar from '@fullcalendar/react';

import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { EventParticipant } from '@interfaces/calendar';

import { EventParticipantType } from '@constants/enums';
import { NO_DATA_AVAILABLE } from '@constants';

import {
  formatQueryEndDateForCalendar,
  formatQueryStartDateForCalendar,
} from '@utils/date';
import { Profile } from '@interfaces/user';

export type CalendarSidebarProps = {
  calendarRef: MutableRefObject<FullCalendar | null>;
  selectedScheduleUserIds: string;
  selectedScheduleOrgIds: string;
  removeMyselfOption: boolean;
  searchName: string;
  dataOptionsOrganizations: {
    id: string | number;
    fullName: string;
    color: string;
    userIds: number[];
  }[];
  dataOptionsParticipants: EventParticipant[];
  dashboardMemberList: Profile[];
  setShowSidebar: Dispatch<SetStateAction<boolean>>;
  setSearchName: Dispatch<SetStateAction<string>>;
  setSelectedScheduleUserIds: Dispatch<SetStateAction<string>>;
  setSelectedScheduleOrgIds: Dispatch<SetStateAction<string>>;
  setRemoveMyselfOption: Dispatch<SetStateAction<boolean>>;
  setCurrentResources: Dispatch<
    SetStateAction<
      {
        id: string;
        title: string;
      }[]
    >
  >;
  handleGetAllMemberSchedules: (
    dataOptionsParticipants: EventParticipant[],
  ) => void;
  handleRemoveAllMemberSchedules: (
    dataOptionsParticipants: EventParticipant[],
  ) => void;
  handleFilterScheduleByUserIds: (
    user: EventParticipant,
    dataOptionsParticipants: EventParticipant[],
  ) => void;
  getEventCalendarByUsers: UseMutateAsyncFunction<
    any,
    unknown,
    {
      userId: string;
      keySearch: string;
      startDate: string;
      endDate: string;
      filterMyTask?: boolean;
      isYearView?: boolean;
      date?: Date;
      clientX?: number;
      clientY?: number;
    },
    unknown
  >;
  keySearch: string;
};

export const CalendarSidebar = ({
  calendarRef,
  removeMyselfOption,
  selectedScheduleUserIds,
  selectedScheduleOrgIds,
  searchName,
  keySearch,
  dataOptionsOrganizations,
  dataOptionsParticipants,
  dashboardMemberList,
  setSearchName,
  setShowSidebar,
  setRemoveMyselfOption,
  setSelectedScheduleUserIds,
  setSelectedScheduleOrgIds,
  setCurrentResources,
  handleGetAllMemberSchedules,
  handleRemoveAllMemberSchedules,
  handleFilterScheduleByUserIds,
  getEventCalendarByUsers,
}: CalendarSidebarProps) => {
  const { data: session } = useSessionCache();

  // Check is participant selected
  const checkIsParticipantSelected = (member: EventParticipant) => {
    const memberId = String(Number(String(member.id).split('-')[1]));

    const userIds = selectedScheduleUserIds?.split(',').filter(Boolean) ?? [];
    const orgIds = selectedScheduleOrgIds?.split(',').filter(Boolean) ?? [];

    return member.type === EventParticipantType.USER
      ? userIds.includes(memberId)
      : orgIds.includes(memberId);
  };

  // Render user's avatar
  const renderAvatar = (memberId: string) => {
    const actualMemberId = Number(memberId.split('-')[1]);
    const memberInfo = dashboardMemberList.find(
      (memberWithAvatar) => memberWithAvatar.id == actualMemberId,
    );

    return (
      <div className="h-6 min-w-[30px] min-h-[30px]">
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatar || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={30}
        />
      </div>
    );
  };

  return (
    <div className="overflow-y-auto">
      <div className="flex flex-col mb-5">
        <div className="flex items-center">
          <ImageRound
            className="w-9 h-9"
            src="/icons/calendar-multi-users.svg"
            border="full"
            name="Avatar user"
          />
          <p className="text-[16px] font-medium text-[#77858F] ml-3">
            メンバーの予定を見る
          </p>
          <div
            className="bg-white hover:bg-slate-200 ml-auto shadow-lg rounded-full w-7 h-7 flex items-center justify-center hover:cursor-pointer"
            onClick={() => setShowSidebar(false)}>
            <ImageRound
              className="w-4 h-4 hover:cursor-pointer"
              src="/icons/close.svg"
              name="Close modal"
            />
          </div>
        </div>
      </div>
      <div
        className="py-3 mb-5 rounded-md bg-white"
        style={{
          boxShadow: '0px 4px 8px 0px #0000000F',
        }}>
        <InputSearch
          placeholder="名前で検索"
          className="w-[100%] px-3"
          inputClassName="!py-2 !placeholder-[#BABABA] !border-[1px] !border-[#77858F]"
          onChange={(e) => setSearchName(e.target.value)}
        />
        <div className="flex justify-between my-2 px-3">
          <p
            className="text-[#77858F] text-xs hover:cursor-pointer font-medium hover:text-gray-700"
            onClick={() =>
              handleGetAllMemberSchedules(dataOptionsParticipants)
            }>
            全てをチェック
          </p>
          <p
            className="text-[#77858F] text-xs hover:cursor-pointer font-medium hover:text-gray-700"
            onClick={() =>
              handleRemoveAllMemberSchedules(dataOptionsParticipants)
            }>
            全てのチェックをクリア
          </p>
        </div>
        <div className="pt-3 max-h-[calc(100vh_-_320px)] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
          {dataOptionsParticipants &&
            dataOptionsParticipants.filter((member) =>
              member.fullName.toLowerCase().includes(searchName.toLowerCase()),
            ).length == 0 && (
              <p className="text-center text-[#6B7280] text-[14px]">
                {NO_DATA_AVAILABLE}
              </p>
            )}
          {dataOptionsParticipants &&
            dataOptionsParticipants
              .filter((member) =>
                member.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              )
              .filter(
                (member) =>
                  !removeMyselfOption || member.id != session?.user.id,
              )
              .sort((prev: EventParticipant, next: EventParticipant) => {
                const prevSelected = checkIsParticipantSelected(prev);
                const nextSelected = checkIsParticipantSelected(next);

                // 1. Checked participants first
                if (prevSelected !== nextSelected) {
                  return prevSelected ? -1 : 1;
                }

                // 2. Current user (only if user, not org)
                if (
                  prev.id === session?.user.id &&
                  prev.type === EventParticipantType.USER
                )
                  return -1;
                if (
                  next.id === session?.user.id &&
                  next.type === EventParticipantType.USER
                )
                  return 1;

                // 3. Organizations before users
                if (
                  prev.type === EventParticipantType.ORGANIZATION &&
                  next.type === EventParticipantType.USER
                )
                  return -1;
                if (
                  prev.type === EventParticipantType.USER &&
                  next.type === EventParticipantType.ORGANIZATION
                )
                  return 1;

                // 4. Alphabetical
                return prev.fullName.localeCompare(next.fullName);
              })
              .map((member) => {
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-[14px] px-3 ${
                      checkIsParticipantSelected(member) && 'bg-[#EBF1F7]'
                    }`}>
                    <div className="w-4">
                      <Checkbox
                        label=""
                        className="mr-2"
                        isChecked={checkIsParticipantSelected(member)}
                        onChange={() =>
                          handleFilterScheduleByUserIds(
                            member,
                            dataOptionsParticipants,
                          )
                        }
                      />
                    </div>
                    <div
                      className={`flex flex-1 gap-[10px] items-center p-2 pl-0 hover:cursor-pointer !w-full`}>
                      {member.type == EventParticipantType.USER && (
                        <>{renderAvatar(String(member.id))}</>
                      )}
                      {member.type == EventParticipantType.ORGANIZATION && (
                        <div className='w-[30px]'>
                          {member.avatarUrl ? (
                            <CustomUserAvatar
                              avatarUrl={member?.avatarUrl || ''}
                              avatarColor={member?.color || ''}
                              size={30}
                            />
                          ) : (
                            <GroupIconWithDynamicColor
                              color={member.color || '#0068B6'}
                              size={30}
                            />
                          )}
                        </div>
                      )}
                      <div className="!w-full">
                        <p className="line-clamp-3 break-all font-medium leading-none text-[15px] text-black">
                          {member.fullName}
                          <span className="text-[#77858F] text-xs ml-1">
                            {member.mainOrganization}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
      <div className="ml-[13px]">
        <Checkbox
          label="自分をメンバーから外す"
          classLabel="text-[15px] !text-black"
          boxLabelClass="!ml-[14px]"
          onChange={(state) => {
            setRemoveMyselfOption(state);

            let updatedUserIds: string[] = selectedScheduleUserIds
              ? selectedScheduleUserIds.split(',').filter(Boolean)
              : [];
            let updatedOrgIds: number[] = selectedScheduleOrgIds
              ? selectedScheduleOrgIds
                  .split(',')
                  .filter(Boolean)
                  .map((id) => Number(id))
              : [];
            if (state) {
              // Remove user from selectedScheduleUserIds
              const userIdStr = String(session?.user.id);
              updatedUserIds = updatedUserIds.filter((id) => id !== userIdStr);

              // Remove any org that includes the removed user
              const belongedOrganizations = dataOptionsParticipants
                .filter(
                  (participant) =>
                    participant.type == EventParticipantType.ORGANIZATION &&
                    participant.userIds?.includes(Number(session?.user.id)),
                )
                .map((org) => Number(String(org.id).split('-')[1]));
              updatedOrgIds = updatedOrgIds.filter(
                (org) => !belongedOrganizations.includes(org),
              );
            } else {
              // Add user to selectedScheduleUserIds if user belongs to selectedScheduleOrgIds
              const updatedOrgIds: string[] = selectedScheduleOrgIds
                ? selectedScheduleOrgIds.split(',').filter(Boolean)
                : [];
              for (const orgId of updatedOrgIds) {
                const org = dataOptionsOrganizations.find(
                  (organization) => organization.id == orgId,
                );
                if (org) {
                  const orgMembers = org.userIds || [];
                  if (orgMembers.includes(Number(session?.user.id))) {
                    updatedUserIds.push(String(session?.user.id));
                    break;
                  }
                }
              }
            }
            setSelectedScheduleOrgIds(updatedOrgIds.join(','));
            setSelectedScheduleUserIds(updatedUserIds.join(','));
            if (calendarRef.current) {
              const calendarApi = calendarRef.current.getApi();
              const startDateISOString = formatQueryStartDateForCalendar(
                calendarApi.view.activeStart,
              );
              const endDateISOString = formatQueryEndDateForCalendar(
                calendarApi.view.activeEnd,
              );

              getEventCalendarByUsers({
                userId:
                  `${updatedUserIds.join(',')}`.length > 0
                    ? `${updatedUserIds.join(',')}`
                    : ``,
                startDate: startDateISOString,
                endDate: endDateISOString,
                keySearch: keySearch,
              });
            }
            setCurrentResources(() => {
              return updatedUserIds.map((userId) => {
                return {
                  id: String(userId),
                  title:
                    dashboardMemberList?.find(
                      (member) => String(member.id) == String(userId),
                    )?.fullName || '',
                };
              });
            });
          }}
        />
      </div>
    </div>
  );
};
