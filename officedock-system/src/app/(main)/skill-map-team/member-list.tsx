'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';

import useMemberOrganizationList from '@hooks/userMemberOrganizationList';
import { pageRouters } from '@constants/routers';

const MemberList = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useMemberOrganizationList({
    search: '',
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
  const handleNavigateUserSkill = (id: number, organizationId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('is_skill', 'true');
    params.set('user_organization', organizationId);
    const newPath = `${pageRouters.SKILL_MAP_TEAM_DETAIL.href(id)}?${params.toString()}`;
    router.push(newPath);
  };
  const handleNavigateUserMap = (id: number, organizationId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('is_map', 'true');
    params.set('user_organization', organizationId);

    const newPath = `${pageRouters.SKILL_MAP_TEAM_DETAIL.href(id)}?${params.toString()}`;
    router.push(newPath);
  };

  return (
    <>
      {organizationList.length > 0 &&
        organizationList.map((org) => {
          return (
            <div
              key={org.orgId}
              className="p-[30px] bg-[#F8FAFC] rounded-[14px]"
              style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
              <p className="text-[#77858F] text-[16px] font-medium mb-4 max-w-[100%] break-all">
                {org.orgName}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {org.users.map((user) => {
                  return (
                    <div
                      key={user.id}
                      className="flex justify-between items-center px-3 h-[70px] bg-white rounded-[6px]"
                      style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                      <div className="flex gap-3 items-center w-[calc(100%_-_320px)]">
                        <CustomUserAvatar
                          avatarUrl={user?.avatar || ''}
                          avatarColor={user?.avatarColor || ''}
                          size={30}
                        />
                        <p className="text-black text-[15px] font-medium max-w-[calc(100%_-_30px)] break-all line-clamp-2">
                          {user.fullName}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center w-[320px]">
                        <Button
                          variant="primary"
                          onClick={() =>
                            handleNavigateUserMap(user.id, String(org.orgId))
                          }
                          className="!p-0 w-[154px] h-[36px] text-white text-sm font-medium">
                          スキルマップを見る
                        </Button>

                        <Button
                          onClick={() =>
                            handleNavigateUserSkill(user.id, String(org.orgId))
                          }
                          variant="primary"
                          className="!p-0 w-[154px] h-[36px] text-white text-sm font-medium">
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
    </>
  );
};

export default MemberList;
