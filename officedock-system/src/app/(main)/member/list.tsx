'use client';
import React, { useContext, useState } from 'react';
import Link from 'next/link';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import DetailProfileMemberModal from '@components/modals/DetailProfileMemberModal';
import GroupMember from './group';

import { pageRouters } from '@constants/routers';
import { ScreenName } from '@constants/enums';

import useMemberOrganizationList from '@hooks/userMemberOrganizationList';
import useDebounceText from '@hooks/useDebounceText';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import useAuthenticatedUser from '@hooks/useAuthenticatedUser';

const ListMember = () => {
  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);

  const [searchData, setSearchData] = useState<string>('');
  const { authenticatedUser } = useAuthenticatedUser({});

  const searchTermDebounce = useDebounceText(searchData, 1000);

  const { listMemberOrganization } = useMemberOrganizationList({
    search: searchTermDebounce,
    currentScreen: ScreenName.CALENDAR,
  });

  const [isShowModalDetail, setIsShowModalDetail] = useState(false);
  const [userClick, setUserClick] = useState<{
    id: string;
    fullName?: string;
    avatarColor: string;
    avatarUrl: string;
  }>();
  const [organizationId, setOrganizationId] = useState<string>('');

  return (
    <div className="px-6 py-[14px] text-black font-medium text-[26px] ">
      <div className="flex justify-between">
        <div className="flex items-center gap-[10px] w-fit">
          <ImageRound
            src="/icons/company.svg"
            name="Company icon"
            className="w-[34px] h-[34px]"
          />
          <p className="">{authenticatedUser?.company.name || ''}</p>
          <div className="text-[#77858F] text-[13px] ml-[10px]">
            全メンバー{dashboardMembersWithAvatars.length}人
          </div>
        </div>
        <div className="flex items-center">
          <InputSearch
            className="w-[300px] h-[34px] py-0 !bg-white !rounded-[20px]"
            inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
            iconClassName="w-[14px] h-[14px]"
            placeholder="名前を検索"
            onChange={(e) => {
              setSearchData(e.target.value);
            }}
          />
          <p className="text-[#77858F] text-sm font-normal ml-[30px]">
            ユーザー管理へ
          </p>
          <Link
            href={pageRouters.USERS_MANAGEMENT.href}
            className="h-[18px] w-[18px] flex items-center justify-center bg-white rounded-full ml-[6px]">
            <ImageRound
              className=" h-[8px] w-fit cursor-pointer"
              src="/icons/right-statistic.svg"
              name="right"
            />
          </Link>
        </div>
      </div>
      <div className="mt-[30px] flex flex-col gap-[30px]">
        {listMemberOrganization &&
          listMemberOrganization.map((item) => {
            return (
              <GroupMember
                key={item.id}
                item={item}
                onClickMember={(
                  id: string,
                  avatarColor: string,
                  organizationId: string,
                  avatarUrl: string,
                ) => {
                  setUserClick({
                    id: id,
                    avatarColor: avatarColor,
                    avatarUrl: avatarUrl,
                  });
                  setIsShowModalDetail(true);
                  setOrganizationId(organizationId);
                }}
              />
            );
          })}
      </div>
      {isShowModalDetail && (
        <DetailProfileMemberModal
          open={isShowModalDetail}
          userId={userClick?.id || ''}
          avatarColor={userClick?.avatarColor || ''}
          avatarUrl={userClick?.avatarUrl || ''}
          organizationId={organizationId}
          type={''}
          onConfirm={function (): void {
            throw new Error('Function not implemented.');
          }}
          onClose={() => setIsShowModalDetail(false)}
        />
      )}
    </div>
  );
};

export default ListMember;
