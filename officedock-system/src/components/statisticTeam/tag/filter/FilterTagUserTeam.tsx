import React, { Fragment, useContext } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import ImageRound from '@components/common/ImageRound';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

import FilterDataUserTeam from '../modal/FilterDataUserTeamModal';

type Props = {
  className?: string;
  classNameData?: string;
};

const FilterTagUserTeam = ({ className, classNameData }: Props) => {
  const {
    orderingOptions,
    allLabelUser,
    isLoadingOrganization,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganizationCompare,
    isLoadingLargeCompare,
    isLoadingMediumCompare,

    removeUser,
  } = useContext(StatisticTeamTagsStateContext);

  return (
    <div className={`flex items-center  gap-2  ${className}`}>
      <div className="flex-shrink-0 h-6 relative ">
        {/* Filter option modal */}
        <Popover className="relative">
          {({ open, close }) => (
            <>
              <div className="flex items-center gap-2 relative top-[5px]">
                <PopoverButton className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
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
                  <FilterDataUserTeam open={open} close={close} />
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
      <div className=" flex-grow flex-shrink-0">
        <div className={`flex gap-2 flex-wrap flex-shrink-0 ${classNameData} `}>
          <>
            {allLabelUser.map((item, index) => {
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
          </>
        </div>
      </div>
    </div>
  );
};

export default FilterTagUserTeam;
