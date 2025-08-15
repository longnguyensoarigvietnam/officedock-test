import React, { Fragment, useContext } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';

import { StatisticStateContext } from '@providers/StatisticProvider';
import FilterStatisticModal from '../modal/FilterStatisticModal';

type Props = {
  className?: string;
};

const FilterStatistic = ({ className }: Props) => {
  const {
    selectedTags,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    removeTag,
  } = useContext(StatisticStateContext);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-shrink-0 h-fit relative ">
        {/* Filter option modal */}
        <Popover className="relative">
          {({ open, close }) => (
            <>
              <div className="flex items-center gap-2 ">
                <PopoverButton className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                  <ImageRound
                    src="/icons/filter.svg"
                    name="Filter icon"
                    className="w-[14px] h-[14px] ml-2"
                  />
                  {selectedTags.length == 0 && <span>タグの絞り込み</span>}
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
                <PopoverPanel className="absolute left-[30px] top-[-5px]  z-[1] w-[400px] transform">
                  <FilterStatisticModal open={open} close={close} />
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
      <div className="relative  flex-grow ">
        <div className="flex gap-2 flex-wrap  w-full flex-shrink-0">
          {selectedTags.map((item) => {
            return (
              <div
                key={item.value}
                className="max-w-[400px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                <span className=" truncate">{item.label}</span>
                {isLoadingLarge ||
                isLoadingMedium ||
                isLoadingOrganization ||
                isLoadingLargeCompare ||
                isLoadingMediumCompare ||
                isLoadingOrganizationCompare ? (
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

export default FilterStatistic;
