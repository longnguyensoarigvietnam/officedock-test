import React, { Fragment, useContext } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import FilterDataTeamModal from '../modal/FilterDataTeamModal';

type Props = {
  className?: string;
};

const FilterTagTeam = ({ className }: Props) => {
  const {
    orderingOptions,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    isLoadingSmall,
    isLoadingSmallCompare,
    removeTag,
  } = useContext(StatisticTeamTagsStateContext);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-shrink-0 h-fit relative ">
        {/* Filter option modal */}
        <Popover className="relative">
          {({ open, close }) => (
            <>
              <div className="flex items-center gap-2 ">
                <PopoverButton className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                  <div className="w-[220px] h-[34px] text-black bg-white flex px-3 items-center justify-between text-sm font-normal border border-[#77858F] rounded-md">
                    <p>集計対象のタグを選択</p>
                    <ImageRound
                      name="down icon"
                      src={'/icons/arrow-down.svg'}
                      className={`${open ? 'rotate-180' : ''} w-fit h-fit`}
                    />
                  </div>
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
                <PopoverPanel className="absolute left-[0px] top-[40px] z-[1] w-[400px] transform">
                  <FilterDataTeamModal open={open} close={close} />
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
