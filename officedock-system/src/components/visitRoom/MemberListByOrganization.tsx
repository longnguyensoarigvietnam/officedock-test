import { useRouter } from 'next/navigation';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ImageRound from '@components/common/ImageRound';

import { pageRouters } from '@constants/routers';

import { UserOrganization } from '@interfaces/user';

interface MemberListByOrganizationProps {
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
  memberListByOrganization,
  setMemberListByOrganization,
}: MemberListByOrganizationProps) => {
  const router = useRouter();
  return (
    <div
      style={{
        background: 'rgba(53, 153, 216, 0.8)',
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="w-[750px] h-[90%] p-[26px] absolute top-1/2 -translate-y-1/2 right-[30px] font-medium text-white border border-white rounded-3xl">
      <div className="flex flex-col max-h-[calc(100%_-_20px)] gap-5 overflow-y-auto customized-scrollbar">
        {memberListByOrganization?.map((organization) => {
          return (
            <div
              key={organization.orgInfo.id}
              className="border-b-[1px] border-white pb-5">
              <div className="flex items-center justify-between mb-5">
                <p className="font-medium text-[16px] max-w-full break-all">
                  {organization.orgInfo.name}{' '}
                  <span className="text-xs font-medium ml-4">
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

              <div className="flex gap-3 flex-wrap">
                {organization.collapseStatus &&
                  organization.orgInfo.users.map((user) => {
                    return (
                      <div
                        key={`${organization.orgInfo.id}-${user.id}`}
                        className="w-[157px] bg-white rounded-[14px] h-[50px] px-[20px] flex items-center gap-2 hover:cursor-pointer"
                        onClick={() =>
                          router.push(
                            pageRouters.VISIT_ROOM_DETAIL.href(String(user.id)),
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
        })}
      </div>
    </div>
  );
};
