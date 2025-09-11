'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import { MemberListByOrganization } from '@components/visitRoom/MemberListByOrganization';
import { RenderAccessories } from '@components/custom/UserCustomize';

import useMemberOrganizationList from '@hooks/userMemberOrganizationList';

import { UserOrganization } from '@interfaces/user';

import { pageRouters } from '@constants/routers';

const RoomList = () => {
  const router = useRouter();
  const [memberListByOrganization, setMemberListByOrganization] = useState<
    {
      orgInfo: UserOrganization;
      collapseStatus: boolean;
    }[]
  >([]);

  useMemberOrganizationList({
    search: '',
    onSuccess: (data) => {
      setMemberListByOrganization(
        data.map((org) => {
          return {
            orgInfo: { ...org },
            collapseStatus: true,
          };
        }),
      );
    },
  });

  return (
    <>
      <div className="h-full w-full overflow-hidden">
        <div
          style={{
            backgroundImage: 'url("/images/bg-visit-room.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
          }}
          className=" relative  h-[calc(100vh-120px)] w-full">
          <div className="relative  pr-[30px] flex w-full justify-between items-center h-full">
            {/* Header */}
            <div className="flex absolute top-0 left-0 shadow-common  rounded-br-[30px]">
              <div className="h-[92px] bg-white w-[402px] py-4 font-medium flex items-center justify-center gap-5 rounded-br-[30px]">
                <div
                  className="flex items-center"
                  onClick={() => router.push(pageRouters.MY_PAGE.href)}>
                  <ImageRound
                    name="Left icon"
                    src={'/icons/chevron-left.svg'}
                    className={`w-[8px] h-[16px] mr-3 cursor-pointer`}
                  />
                  <p className="text-sm font-medium hover:cursor-pointer">
                    戻る
                  </p>
                </div>
                <p className="text-[22px] font-medium">
                  他の人の部屋へ出かける
                </p>
              </div>
            </div>

            <MemberListByOrganization
              memberListByOrganization={memberListByOrganization}
              setMemberListByOrganization={setMemberListByOrganization}
            />
          </div>
          <div className="absolute -bottom-[115px] -left-[150px]">
            <div className="flex-grow">
              <div className="h-[424px] w-[336px] ml-[200px] relative">
                <RenderAccessories />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomList;
