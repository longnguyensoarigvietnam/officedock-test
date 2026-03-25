import React, { Fragment, useContext, useEffect, useState } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';

import { OptionDropdownType } from '@interfaces/common';
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

  const [previewSelectedTags, setPreviewSelectedTags] =
    useState<OptionDropdownType[]>(selectedTags);

  // Keep preview aligned with applied selection when filter is not interacting
  useEffect(() => {
    setPreviewSelectedTags(selectedTags);
  }, [selectedTags]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover className="relative flex items-center gap-2 w-full">
        {({ open, close }) => {
          const currentTags = open ? previewSelectedTags : selectedTags;
          return (
            <>
              <div className="flex-shrink-0 h-fit relative ">
                {/* Filter option modal */}
                <div className="flex items-center gap-2 ">
                  <PopoverButton className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                    <ImageRound
                      src="/icons/filter.svg"
                      name="Filter icon"
                      className="w-[14px] h-[14px]"
                    />
                    {currentTags.length == 0 && <span>タグの絞り込み</span>}
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
                  <PopoverPanel className="absolute left-[30px] top-[40px]  z-[1] w-[400px] transform">
                    <FilterStatisticModal
                      open={open}
                      close={close}
                      onPreviewChange={setPreviewSelectedTags}
                    />
                  </PopoverPanel>
                </Transition>
              </div>
              <div className="relative  flex-grow ">
                <div className="flex gap-2 flex-wrap  w-full flex-shrink-0">
                  {currentTags.map((item) => {
                    return (
                      <div
                        key={item.value}
                        className="max-w-[400px] min-w-0 h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                        <span className="truncate min-w-0">{item.label}</span>
                        {/* Hide remove while user is previewing to avoid removing non-applied values */}
                        {open ? (
                          ''
                        ) : isLoadingLarge ||
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
            </>
          );
        }}
      </Popover>
    </div>
  );
};

export default FilterStatistic;
