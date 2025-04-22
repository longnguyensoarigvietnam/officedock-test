import { UseMutateAsyncFunction } from 'react-query';
import { useSession } from 'next-auth/react';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { CalendarDashboardMember } from '@interfaces/calendar';
import { NO_DATA_AVAILABLE } from '@constants';

export type CalendarSidebarProps = {
  selectedScheduleUserIds: string;
  removeMyselfOption: boolean;
  searchName: string;
  setShowSidebar: Dispatch<SetStateAction<boolean>>;
  setSearchName: Dispatch<SetStateAction<string>>;
  setSelectedScheduleUserIds: Dispatch<SetStateAction<string>>;
  setRemoveMyselfOption: Dispatch<SetStateAction<boolean>>;
  setCurrentResources: Dispatch<
    SetStateAction<
      {
        id: string;
        title: string;
      }[]
    >
  >;
  handleGetAllMemberSchedules: () => void;
  handleRemoveAllMemberSchedules: () => void;
  handleFilterScheduleByUserIds: (userId: number) => void;
  getEventCalendarByUsers: UseMutateAsyncFunction<
    any,
    unknown,
    {
      userId: string;
      keySearch: string;
      startDate?: string;
      endDate?: string;
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
  removeMyselfOption,
  selectedScheduleUserIds,
  searchName,
  keySearch,
  setSearchName,
  setShowSidebar,
  setRemoveMyselfOption,
  setSelectedScheduleUserIds,
  setCurrentResources,
  handleGetAllMemberSchedules,
  handleRemoveAllMemberSchedules,
  handleFilterScheduleByUserIds,
  getEventCalendarByUsers,
}: CalendarSidebarProps) => {
  const { data: session } = useSession();
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="overflow-y-auto">
      <div className="flex flex-col mb-5">
        <div className="flex items-center">
          <ImageRound
            className="w-10 h-10"
            src="/icons/multi-users.svg"
            border="full"
            name="Avatar user"
          />
          <p className="text-[16px] font-medium text-[#77858F] ml-1">
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
      <div className="py-3 mb-2 rounded-md shadow-md bg-white">
        <InputSearch
          placeholder="名前で検索"
          className="w-[100%] px-3"
          inputClassName="!py-2 placeholder-[#BABABA] !border-[1px] !border-[#77858F]"
          onChange={(e) => setSearchName(e.target.value)}
        />
        <div className="flex justify-between my-2 px-3">
          <p
            className="text-[#77858F] text-xs hover:cursor-pointer hover:text-gray-700"
            onClick={() => handleGetAllMemberSchedules()}>
            全てをチェック
          </p>
          <p
            className="text-[#77858F] text-xs hover:cursor-pointer hover:text-gray-700"
            onClick={() => handleRemoveAllMemberSchedules()}>
            全てのチェックをクリア
          </p>
        </div>
        <div className="pt-3 max-h-[calc(85vh_-_200px)] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
          {dashboardMembersWithAvatars &&
            dashboardMembersWithAvatars.filter((member) =>
              member.fullName.toLowerCase().includes(searchName.toLowerCase()),
            ).length == 0 && (
              <p className="text-center text-[#6B7280] text-[14px]">
                {NO_DATA_AVAILABLE}
              </p>
            )}
          {dashboardMembersWithAvatars &&
            dashboardMembersWithAvatars
              .filter((member) =>
                member.fullName
                  .toLowerCase()
                  .includes(searchName.toLowerCase()),
              )
              .filter(
                (member) =>
                  !removeMyselfOption || member.id != session?.user.id,
              )
              .sort(
                (
                  prev: CalendarDashboardMember,
                  next: CalendarDashboardMember,
                ) => {
                  if (prev.id === session?.user.id) return -1;
                  if (next.id === session?.user.id) return 1;
                  return prev.fullName.localeCompare(next.fullName);
                },
              )
              .map((member) => {
                return (
                  <div
                    key={member.id}
                    className={`flex items-center px-3 ${selectedScheduleUserIds.includes(`${member.id}`) && 'bg-[#EBF1F7]'}`}>
                    <div className="w-5">
                      <Checkbox
                        label=""
                        className="mr-2"
                        isChecked={
                          selectedScheduleUserIds.includes(`${member.id}`)
                            ? true
                            : false
                        }
                        onChange={() =>
                          handleFilterScheduleByUserIds(Number(member.id))
                        }
                      />
                    </div>
                    <div
                      className={`flex flex-1 gap-3 items-center p-1.5 hover:cursor-pointer`}>
                      {dashboardMembersWithAvatars &&
                      dashboardMembersWithAvatars.find(
                        (memberWithAvatar) => memberWithAvatar.id == member.id,
                      ) ? (
                        <>
                          {AvatarIconWithDynamicColor({
                            color:
                              dashboardMembersWithAvatars?.find(
                                (memberWithAvatar) =>
                                  memberWithAvatar.id == member.id,
                              )?.avatarColor || '#0068B6',
                            size: 36,
                          })}
                        </>
                      ) : (
                        <ImageRound
                          className="w-8 h-8"
                          src="/images/avatar-default.svg"
                          border="full"
                          name="Avatar user"
                        />
                      )}
                      <div className="!w-full">
                        <p
                          style={{
                            maxWidth: `calc(${Math.max(viewportWidth, 1280) / 8 - 10}px )`,
                          }}
                          className={`truncate font-medium text-[15px] text-black`}>
                          <span>{member.fullName}</span>
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
          classLabel="text-[15px] text-black"
          onChange={(state) => {
            setRemoveMyselfOption(state);
            setCurrentResources((prevCurrentResources) => {
              if (
                prevCurrentResources.find(
                  (resource) => resource.id == String(session?.user.id),
                )
              ) {
                return prevCurrentResources.filter(
                  (resource) => resource.id !== String(session?.user.id),
                );
              }
              return [...prevCurrentResources];
            });
            if (state) {
              let updatedUserIds: string[] = selectedScheduleUserIds
                ? selectedScheduleUserIds.split(',').filter(Boolean)
                : [];
              const userIdStr = String(session?.user.id);
              updatedUserIds = updatedUserIds.filter((id) => id !== userIdStr);
              setSelectedScheduleUserIds(updatedUserIds.join(','));
              getEventCalendarByUsers({
                userId:
                  `${updatedUserIds.join(',')}`.length > 0
                    ? `${updatedUserIds.join(',')}`
                    : ``,
                keySearch: keySearch,
              });
            }
          }}
        />
      </div>
    </div>
  );
};
