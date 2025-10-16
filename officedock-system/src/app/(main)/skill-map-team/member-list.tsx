'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';

import useMemberOrganizationList from '@hooks/userMemberOrganizationList';

import { pageRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';

const MemberList = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabId = searchParams.get('tabId');

  const [organizationList, setOrganizationList] = useState<
    {
      orgId: number;
      orgName: string;
      users: {
        id: number;
        fullName: string;
        avatarColor: string;
        avatar?: string;
      }[];
    }[]
  >([]);

  // Get members by organization
  useMemberOrganizationList({
    search: '',
    currentScreen: ScreenName.TEAM_DOCK_SKILL_MAP,
    onSuccess: (data) => {
      setOrganizationList(() => {
        return data.map((org) => {
          return {
            orgId: org.id,
            orgName: org.name,
            users: org.users || [],
          };
        });
      });
    },
  });

  // Navigate to user's skill screen
  const handleNavigateUserSkill = (id: number, organizationId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('is_skill', 'true');
    params.set('user_organization', organizationId);
    const newPath = `${pageRouters.SKILL_MAP_TEAM_DETAIL.href(id)}?${params.toString()}`;
    router.push(newPath);
  };

  // Navigate to user's skillmap screen
  const handleNavigateUserMap = (id: number, organizationId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('is_map', 'true');
    params.set('user_organization', organizationId);

    const newPath = `${pageRouters.SKILL_MAP_TEAM_DETAIL.href(id)}?${params.toString()}`;
    router.push(newPath);
  };

  return (
    <>
      <div className="sticky z-[21] top-[0px] px-10 py-[27px] bg-[#E6F3FB]">
        <div className="flex gap-2 items-center bg-white w-fit p-[6px] rounded-[20px]">
          <Button
            variant="primary"
            className={`w-[100px] !p-0 text-xs h-[28px] !font-bold text-white border-none !rounded-[20px]`}>
            メンバー一覧
          </Button>
          <Link href={`${pageRouters.LEVEL_UP_TEAM.href}?tabId=${tabId || 0}`}>
            <Button
              variant="outline"
              className={`w-[120px] !p-0 text-xs h-[28px] !font-bold !text-[#77858F] !bg-[#EBF1F7] border-none !rounded-[20px]`}>
              レベルアップ申請
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-10">
        {organizationList.length > 0 &&
          organizationList.map((org) => {
            return (
              <div
                key={org.orgId}
                className="p-[30px] bg-[#F8FAFC] rounded-[30px]"
                style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
                <p className="text-[#77858F] text-[16px] font-medium mb-[30px] max-w-[100%] break-all">
                  {org.orgName}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {org.users.map((user) => {
                    return (
                      <div
                        key={user.id}
                        className="flex justify-between items-center p-5 h-[70px] bg-white rounded-[14px]"
                        style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                        <div className="flex gap-[10px] items-center w-[calc(100%_-_320px)]">
                          <CustomUserAvatar
                            avatarUrl={user?.avatar || ''}
                            avatarColor={user?.avatarColor || ''}
                            size={30}
                          />
                          <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_30px)] break-all line-clamp-2">
                            {user.fullName}
                          </p>
                        </div>
                        <div className="flex gap-[10px] items-center">
                          <Button
                            variant="primary"
                            onClick={() =>
                              handleNavigateUserMap(user.id, String(org.orgId))
                            }
                            className="!p-0 w-[150px] h-[34px] text-white text-sm font-medium">
                            スキルマップを見る
                          </Button>

                          <Button
                            onClick={() =>
                              handleNavigateUserSkill(
                                user.id,
                                String(org.orgId),
                              )
                            }
                            variant="primary"
                            className="!p-0 w-[150px] h-[34px] text-white text-sm font-medium">
                            マイスキルを見る
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default MemberList;
