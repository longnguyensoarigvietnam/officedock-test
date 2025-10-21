import { useRouter } from 'next/navigation';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { pageRouters } from '@constants/routers';

import { UserOrganization } from '@interfaces/user';

import { useSessionCache } from '@providers/SessionCacheProvider';

interface MemberListByOrganizationProps {
  isLoadingList: boolean;
  memberListByOrganization: {
    orgInfo: UserOrganization;
    collapseStatus: boolean;
  }[];
  setMemberListByOrganization: React.Dispatch<
    React.SetStateAction<
      {
        orgInfo: UserOrganization;
        collapseStatus: boolean;
      }[]
    >
  >;
}

export const MemberListByOrganization = ({
  isLoadingList,
  memberListByOrganization,
  setMemberListByOrganization,
}: MemberListByOrganizationProps) => {
  const router = useRouter();
  const { data: session } = useSessionCache();
  return (
    <div
      style={{
        background: 'rgba(53, 153, 216, 0.8)',
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="w-[720px] h-[calc(100%_-_60px)] p-[30px] pr-[12px] absolute top-1/2 -translate-y-1/2 right-[30px] font-medium text-white border border-white rounded-3xl">
      <div className="flex flex-col max-h-[calc(100%_-_10px)] gap-[26px] overflow-y-auto customized-scrollbar">
        {isLoadingList ? (
          <div className="">
            <RowSkeleton
              numberOfRows={6}
              className="h-[125px] !rounded-[14px] w-[calc(100%)]"
            />
          </div>
        ) : (
          memberListByOrganization?.map((organization, index) => {
            return (
              <div
                key={organization.orgInfo.id}
                className={`border-b-[1px] border-white pb-[26px] ${index == memberListByOrganization.length - 1 && 'mb-[1px]'}`}>
                <div
                  className={`flex items-center justify-between ${!organization.collapseStatus || (organization.collapseStatus && organization.orgInfo.users.length == 0) ? 'mb-0' : 'mb-5'}`}>
                  <p className="font-medium text-base max-w-full break-all leading-none">
                    {organization.orgInfo.name}
                    <span className="text-xs font-medium ml-[18px]">
                      メンバー{organization.orgInfo.users.length}人
                    </span>
                  </p>
                  <ImageRound
                    name="Collapse icon"
                    src={'/icons/white-collapse.svg'}
                    className={`w-[12px] h-[12px] hover:cursor-pointer ${!organization.collapseStatus && 'rotate-180'}`}
                    onClick={() =>
                      setMemberListByOrganization((prev) => {
                        return prev.map((org) =>
                          org.orgInfo.id == organization.orgInfo.id
                            ? { ...org, collapseStatus: !org.collapseStatus }
                            : org,
                        );
                      })
                    }
                  />
                </div>

                <div className="flex gap-[10px] flex-wrap">
                  {organization.collapseStatus &&
                    organization.orgInfo.users.map((user) => {
                      return (
                        <div
                          key={`${organization.orgInfo.id}-${user.id}`}
                          className={`w-[157px] bg-white rounded-[14px] h-[50px] px-[14px] flex items-center gap-[10px] hover:cursor-pointer ${user.id == session?.user.id && 'opacity-50 hover:!cursor-not-allowed'}`}
                          onClick={() =>
                            user.id != session?.user.id &&
                            router.push(
                              pageRouters.VISIT_ROOM_DETAIL.href(
                                String(user.id),
                              ),
                            )
                          }>
                          <CustomUserAvatar
                            avatarUrl={user?.avatar || ''}
                            avatarColor={user?.avatarColor || ''}
                            size={30}
                          />
                          <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_30px)] truncate text-nowrap">
                            {user.fullName}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
