'use client';
import React from 'react';
import Link from 'next/link';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import GroupMember from './group';

import { pageRouters } from '@constants/routers';
import useMemberOrganizationList from '@hooks/userMemberOrganizationList';
import DetailProfileMemberModal from '@components/modals/DetailProfileMemberModal';

const ListMember = () => {
  const { listMemberOrganization } = useMemberOrganizationList({});
  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * (80 - 40) + 40);
    const lightness = Math.floor(Math.random() * (70 - 30) + 30);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div className="px-6 py-[14px] text-black font-medium text-[26px] ">
      <div className="flex justify-between">
        <div className="flex items-center gap-[10px] w-fit">
          <ImageRound
            src="/icons/company.svg"
            name="Company icon"
            className="w-[34px] h-[34px]"
          />
          <p className="">会社名</p>
          <Link
            href={pageRouters.USERS_MANAGEMENT}
            className="text-[#77858F] text-[13px] ml-[10px]">
            全メンバー50人
          </Link>
        </div>
        <div className="flex items-center">
          <InputSearch
            className="w-[300px] h-[34px] py-0 !bg-white !rounded-[20px]"
            inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
            iconClassName="w-[14px] h-[14px]"
            placeholder="名前を検索"
          />
          <p className="text-[#77858F] text-sm font-normal ml-[30px]">
            ユーザー管理へ
          </p>
          <div className="h-[18px] w-[18px] flex items-center justify-center bg-white rounded-full ml-[6px]">
            <ImageRound
              className=" h-[8px] w-fit cursor-pointer"
              src="/icons/right-statistic.svg"
              name="right"
            />
          </div>
        </div>
      </div>
      <div className="mt-[30px] flex flex-col gap-[30px]">
        {listMemberOrganization &&
          listMemberOrganization.map((item) => {
            return (
              <GroupMember key={item.id} item={item} color={getRandomColor()} />
            );
          })}
      </div>
      <DetailProfileMemberModal
        open={false}
        type={''}
        onConfirm={function (): void {
          throw new Error('Function not implemented.');
        }}
        onClose={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    </div>
  );
};

export default ListMember;
