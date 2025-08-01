import React, { Fragment, useContext, useEffect, useState } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { NO_DATA_AVAILABLE } from '@constants';
import Checkbox from '@components/common/Checkbox';
import { OptionDropdownType } from '@interfaces/common';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

type Props = {
  open: boolean;
  className?: string;
  classNameData?: string;
  onOpen: () => void;
};

const FilterTagUserTeam = ({
  open,
  className,
  classNameData,
  onOpen,
}: Props) => {
  const {
    orderingOptions,
    firstThreeUser,
    allLabelUser,
    isLoadingOrganization,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganizationCompare,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    remainingCountUser,
    listMemberTeam,
    isCheckCompare,
    setOrderingOptions,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingSmallCompare,
    setIsLoadingOrganization,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
    removeUser,
  } = useContext(StatisticTeamTagsStateContext);

  const [dataOptionsUserIds, setDataOptionsUserIds] = useState<
    OptionDropdownType[]
  >([]);

  useEffect(() => {
    if (listMemberTeam) {
      setDataOptionsUserIds(
        listMemberTeam.map((org) => ({
          label: String(org.fullName),
          value: String(org.id),
          imgUrl: org.avatarUrl,
          iconColor: org.color,
          color: org?.color || '',
          avatarUrl: org?.avatarUrl || '',
        })),
      );
    }
  }, [listMemberTeam]);
  const handleChangeUser = (selected: OptionDropdownType) => {
    let updatedUserIds = [];
    const currentTagIds = orderingOptions?.user_ids || [];
    const foundItemIndex = currentTagIds.findIndex(
      (tag) => tag.value == selected.value,
    );
    if (foundItemIndex == -1) {
      updatedUserIds = [...currentTagIds, selected];
    } else {
      updatedUserIds = currentTagIds.filter(
        (tag) => tag.value != selected.value,
      );
    }

    setIsLoadingLarge(true);
    setIsLoadingMedium(true);
    setIsLoadingSmall(true);
    setIsLoadingOrganization(true);
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
      setIsLoadingMediumCompare(true);
      setIsLoadingSmallCompare(true);
      setIsLoadingOrganizationCompare(true);
    }
    setOrderingOptions((prev) => ({
      tag_ids: prev?.tag_ids || [],
      user_ids: updatedUserIds || [],
    }));
  };

  const handleReset = () => {
    setOrderingOptions((prev) => ({
      tag_ids: prev?.tag_ids || [],
      user_ids: [],
    }));
  };

  return (
    <div className={`flex items-center  gap-2  ${className}`}>
      <div className="flex-shrink-0 h-6 relative ">
        {/* Filter option modal */}
        <Popover className="relative">
          {() => (
            <>
              <div className="flex items-center gap-2 relative top-[5px]">
                <PopoverButton
                  onClick={onOpen}
                  className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                  <ImageRound
                    src="/icons/filter.svg"
                    name="Filter icon"
                    className="w-[14px] h-[14px] ml-2"
                  />
                  {orderingOptions?.user_ids.length == 0 && (
                    <span>メンバーの絞り込み</span>
                  )}
                </PopoverButton>
              </div>
              <Transition
                as={Fragment}
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1">
                <PopoverPanel className="absolute left-[30px] top-[-5px] z-[1] w-[400px] transform">
                  <div className="w-full pt-[10px]  pb-5 bg-white rounded-[14px] shadow-common p-1 flex flex-col gap-1 text-sm">
                    <div className="text-xs pl-5 pr-[10px] font-medium text-[#77858F] flex justify-between items-center">
                      <span>メンバーの絞り込み</span>
                      <div className="flex items-center gap-x-[10px]">
                        <span onClick={handleReset} className="cursor-pointer">
                          選択をクリア
                        </span>
                        <div
                          style={{
                            padding: '5px',
                          }}
                          onClick={() => onOpen()}
                          className={`rounded-full cursor-pointer w-6 h-6 bg-[#E3EAED]`}>
                          <ImageRound
                            src={`/icons/close-black.svg`}
                            name="close"
                            className="w-fit h-fit"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-5">
                      <div className="mt-[10px] flex max-h-64 overflow-y-auto   px-1 border border-[#77858F] rounded-md  flex-col  ">
                        {/*  User */}
                        {dataOptionsUserIds.length ? (
                          dataOptionsUserIds.map((option) => (
                            <>
                              <div
                                key={option.value}
                                className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}>
                                <div className="max-w-[80%] flex items-center gap-2">
                                  <div className="w-5">
                                    <Checkbox
                                      onChange={() => handleChangeUser(option)}
                                      classLabel="break-words max-w-[300px] line-clamp-3 !text-sm"
                                      isChecked={
                                        orderingOptions?.user_ids?.find(
                                          (selectedOption) =>
                                            selectedOption.value ==
                                            option.value,
                                        )
                                          ? true
                                          : false
                                      }
                                    />
                                  </div>
                                  <div className="min-w-[30px]">
                                    <CustomUserAvatar
                                      avatarUrl={option?.imgUrl || ''}
                                      avatarColor={option?.iconColor || ''}
                                      size={30}
                                      customClassName={`${!option?.imgUrl && 'mt-[2px]'}`}
                                    />
                                  </div>
                                  <span
                                    className={` text-sm font-medium break-words max-w-[300px] line-clamp-3 `}>
                                    {option.label}
                                  </span>
                                </div>
                              </div>
                            </>
                          ))
                        ) : (
                          <div className="block py-2 px-3 text-sm text-gray-500">
                            {NO_DATA_AVAILABLE}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
      <div className=" flex-grow flex-shrink-0">
        <div className={`flex gap-2 flex-wrap flex-shrink-0 ${classNameData} `}>
          <>
            {firstThreeUser.map((item, index) => {
              return (
                <div key={item.value} className="flex gap-[6px] items-center">
                  {index === 0 && (
                    <ImageRound
                      src={`/icons/user-white.svg`}
                      name="close"
                      className="w-fit h-fit cursor-pointer"
                    />
                  )}
                  <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                    <span className="min-w-[32px] max-w-[118px]  truncate">
                      {item.label}
                    </span>
                    {isLoadingOrganization ||
                    isLoadingLarge ||
                    isLoadingMedium ||
                    isLoadingOrganizationCompare ||
                    isLoadingLargeCompare ||
                    isLoadingMediumCompare ? (
                      ''
                    ) : (
                      <ImageRound
                        onClick={() => {
                          removeUser(item);
                        }}
                        src={`/icons/close-white.svg`}
                        name="close"
                        className="w-fit h-fit cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {allLabelUser.length > 3 && (
              <p className=" h-6 px-1 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                +{remainingCountUser}
              </p>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default FilterTagUserTeam;
