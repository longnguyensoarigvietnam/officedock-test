import React, { Fragment, useContext, useEffect, useState } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';

type Props = {
  className?: string;
};

const FilterTagTeam = ({ className }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    isCheckCompare,
    orderingOptions,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    isLoadingSmall,
    isLoadingSmallCompare,
    setOrderingOptions,
    removeTag,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
  } = useContext(StatisticTeamTagsStateContext);
  const [isOpen, setOpen] = useState(false);

  const [selectedOption, setSelectedOption] = useState<OptionDropdownType[]>(
    [],
  );
  const onOpen = () => {
    setOpen(!isOpen);
  };

  useEffect(() => {
    if (orderingOptions) {
      setSelectedOption(orderingOptions.tag_ids);
    }
  }, [orderingOptions]);

  const handleChangeTag = (selected: OptionDropdownType) => {
    const foundItemIndex = selectedOption.findIndex(
      (tag) => tag.value == selected.value,
    );
    if (foundItemIndex == -1) {
      setSelectedOption([...selectedOption, selected]);
    } else {
      setSelectedOption(
        selectedOption.filter((op) => op.value != selected.value),
      );
    }
  };

  const handleReset = () => {
    setSelectedOption([]);
  };

  const handleSearch = () => {
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
      tag_ids: selectedOption || [],
      user_ids: prev?.user_ids || [],
    }));
    onOpen();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-shrink-0 h-fit relative ">
        {/* Filter option modal */}
        <Popover className="relative">
          {() => (
            <>
              <div className="flex items-center gap-2 ">
                <PopoverButton
                  onClick={onOpen}
                  className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                  <div className="w-[220px] h-[34px] text-black bg-white flex px-3 items-center justify-between text-sm font-normal border border-[#77858F] rounded-md">
                    <p>集計対象のタグを選択</p>
                    <ImageRound
                      name="down icon"
                      src={'/icons/arrow-down.svg'}
                      className={`${isOpen ? 'rotate-180' : ''} w-fit h-fit`}
                    />
                  </div>
                </PopoverButton>
              </div>
              <Transition
                as={Fragment}
                show={isOpen}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1">
                <PopoverPanel className="absolute left-[0px] top-[40px] z-[1] w-[400px] transform">
                  <div className="w-full pt-[10px]  pb-5 bg-white rounded-[14px] shadow-common p-1 flex flex-col gap-1 text-sm">
                    <div className="text-xs pl-5 pr-[10px] font-medium text-[#77858F] flex justify-between items-center">
                      <span>集計対象のタグを選択</span>
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
                        {/*  tag */}
                        {tagsOptions.length ? (
                          tagsOptions.map((option) => (
                            <>
                              <div
                                key={option.value}
                                className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}>
                                <div className="max-w-[80%] flex items-center gap-2">
                                  <div className="w-5">
                                    <Checkbox
                                      onChange={() => handleChangeTag(option)}
                                      classLabel={`break-words max-w-[300px] line-clamp-3 !text-sm `}
                                      disable={isHasLoading}
                                      isChecked={
                                        selectedOption.find(
                                          (selectedOption) =>
                                            selectedOption.value ==
                                            option.value,
                                        )
                                          ? true
                                          : false
                                      }
                                    />
                                  </div>
                                  <div className="flex-grow">
                                    <span
                                      className={` w-full text-sm font-medium break-words max-w-[300px] line-clamp-3 `}>
                                      {option.label}
                                    </span>
                                  </div>
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
                    <div className="flex justify-center gap-[10px] mt-4 ">
                      <Button
                        variant="outline"
                        onClick={() => onOpen()}
                        className="h-9">
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleSearch}
                        className="h-9"
                        disabled={isHasLoading}>
                        絞り込む
                      </Button>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
      <div>
        <div className="flex gap-2 flex-wrap max-w-[450px]">
          {orderingOptions?.tag_ids.map((item) => {
            return (
              <div
                key={item.value}
                className="min-w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                <span className="min-w-[32px] truncate">{item.label}</span>
                {isLoadingLarge ||
                isLoadingMedium ||
                isLoadingOrganization ||
                isLoadingLargeCompare ||
                isLoadingMediumCompare ||
                isLoadingOrganizationCompare ||
                isLoadingSmall ||
                isLoadingSmallCompare ? (
                  ''
                ) : (
                  <ImageRound
                    onClick={() => {
                      removeTag(item);
                    }}
                    src={`/icons/close-white.svg`}
                    name="close"
                    className="w-fit h-fit cursor-pointer"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FilterTagTeam;
