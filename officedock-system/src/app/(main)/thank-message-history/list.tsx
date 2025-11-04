'use client';
import React, { useState } from 'react';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import Dropdown from '@components/common/Dropdown';
import ThanksMsgMemberDetailModal from '@components/modals/ThanksMsgMemberDetailModal';

import { OptionDropdownType } from '@interfaces/common';
import useMemberThankMsg from '@hooks/useMemberThankMsg';
import GroupMemberThank from './group';
import useDebounceText from '@hooks/useDebounceText';

const ThankMsgHistoryList = () => {
  const [search, setSearch] = useState<string>('');
  const [organizationUserOptions, setOrganizationUserOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<OptionDropdownType>({
      label: '選択',
      value: '',
    });
  // Modal
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [userDetailId, setUserDetailId] = useState<{
    avatar: string;
    avatarColor: string;
    fullName: string;
    id: number;
    orgName: string;
  }>();
  const debouncedFilterByName = useDebounceText(search, 1000);

  const { memberThankMsgList } = useMemberThankMsg({
    search: debouncedFilterByName,
    organization_id: selectedOrganization?.value as string,
    onSuccess: (data) => {
      setOrganizationUserOptions([
        {
          label: '選択',
          value: '',
        },
        ...data.fullOrganizations.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      ]);
    },
  });

  return (
    <>
      <div>
        <div className="text-[26px] font-medium text-black leading-[1]">
          サンクスメッセージ履歴
        </div>
        <div className="mt-[30px] flex justify-between">
          <div className=" flex gap-3 items-center">
            <div className="h-[34px] w-fit ">
              <InputSearch
                className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
                inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
                iconClassName="w-[14px] h-[14px]"
                placeholder="名前を検索"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
            </div>
            <div className="flex gap-[10px] items-center">
              <ImageRound
                src="/icons/filter.svg"
                name="Filter icon"
                className="w-[14px] h-[14px] ml-2"
              />

              {/* Search team */}
              <div className="w-[220px]">
                <Dropdown
                  options={organizationUserOptions}
                  placeholder="チーム"
                  placeholderClass="!text-black text-sm font-normal"
                  className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                  labelTextClass="!text-[#77858F] !text-xs !font-medium"
                  classNameOption="!text-sm"
                  onChange={(data) => {
                    setSelectedOrganization(data);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[30px] flex flex-col gap-[30px] mb-[30px]">
          {memberThankMsgList &&
            memberThankMsgList?.results?.map((item) => {
              return (
                <GroupMemberThank
                  key={item.id}
                  item={item}
                  onUserClick={(user) => {
                    setOpenDetailModal(true);
                    setUserDetailId(user);
                  }}
                />
              );
            })}
        </div>
      </div>
      {openDetailModal && (
        <ThanksMsgMemberDetailModal
          open={openDetailModal}
          userDetailId={userDetailId}
          onClose={() => {
            setOpenDetailModal(false);
            setUserDetailId(undefined);
          }}
        />
      )}
    </>
  );
};

export default ThankMsgHistoryList;
