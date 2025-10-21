'use client';
import React, { useState } from 'react';

import ImageRound from '@components/common/ImageRound';
import { MemberListByOrganization } from '@components/visitRoom/MemberListByOrganization';
import { RenderAccessories } from '@components/custom/UserCustomize';
import BackToPage from '@components/custom/BackToPage';

import { ScreenName } from '@constants/enums';

import useMemberOrganizationList from '@hooks/userMemberOrganizationList';

import { UserOrganization } from '@interfaces/user';

const RoomList = () => {
  const [memberListByOrganization, setMemberListByOrganization] = useState<
    {
      orgInfo: UserOrganization;
      collapseStatus: boolean;
    }[]
  >([]);

  const { isLoadingListMemberOrganization } = useMemberOrganizationList({
    search: '',
    showLoading: false,
    currentScreen: ScreenName.CALENDAR,
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
          className="rounded-bl-[30px] relative rounded-r-[30px] h-[calc(100vh-120px)] w-full">
          <div className="relative pr-[30px] flex w-full justify-between items-center h-full">
            {/* Header */}
            <div className="flex absolute top-0 left-0 shadow-common rounded-br-[30px]">
              <div className="h-[80px] bg-white w-[426px] py-4 font-medium flex items-center gap-5 justify-center  rounded-br-[30px]">
                <BackToPage />
                <div className="flex items-center gap-[10px]">
                  <ImageRound
                    name="Visit room icon"
                    src={'/icons/visit-room.svg'}
                    className={`w-[26px] h-[26px]  cursor-pointer`}
                  />
                  <p className="text-[22px] font-medium">
                    他の人の部屋へ出かける
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-[115px] w-[calc(100%_-_750px)]">
              <div className="flex-grow">
                <div className="h-[424px] w-[336px] left-1/2 -translate-x-1/2 relative">
                  <RenderAccessories isBoat />
                </div>
              </div>
            </div>

            <MemberListByOrganization
              memberListByOrganization={memberListByOrganization}
              setMemberListByOrganization={setMemberListByOrganization}
              isLoadingList={isLoadingListMemberOrganization}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomList;
