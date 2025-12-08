import React, { useState, useContext, useEffect } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Checkbox from '@components/common/Checkbox';

import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { OptionDropdownType } from '@interfaces/common';
import { NO_DATA_AVAILABLE } from '@constants';
import { isEqualOptions } from '@utils/date';

type Props = {
  open: boolean;
  close: () => void;
};

const FilterDataTeamModal = ({ open, close }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    isCheckCompare,
    orderingOptions,
    setOrderingOptions,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
  } = useContext(StatisticTeamTagsStateContext);

  const [selectedOption, setSelectedOption] = useState<OptionDropdownType[]>(
    [],
  );

  useEffect(() => {
    if (orderingOptions) {
      setSelectedOption(orderingOptions.tag_ids);
    }
  }, [orderingOptions, open]);

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
    setOrderingOptions((prev) => {
      const prevTagIds = prev?.tag_ids || [];

      // Check if tag_ids has actually changed
      const hasChanged = !isEqualOptions(prevTagIds, selectedOption);

      // No change → return previous state and skip all loading updates
      if (!hasChanged) {
        return prev;
      }

      // Change detected → trigger loading states
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

      // Update only the changed values
      return {
        tag_ids: selectedOption || [],
        user_ids: prev?.user_ids || [],
      };
    });

    close();
  };

  return (
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
            onClick={close}
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
                  className={`relative hover:cursor-pointer flex items-start justify-between  select-none hover:bg-[#f8fafc] py-2 pl-2 pr-3 border-b-[1px] border-gray-100`}
                  onClick={() => handleChangeTag(option)}>
                  <div className="max-w-[80%] flex items-center gap-2">
                    <div className="w-5">
                      <Checkbox
                        classLabel={`break-words max-w-[300px] line-clamp-3 !text-sm `}
                        disable={isHasLoading}
                        isChecked={
                          selectedOption.find(
                            (selectedOption) =>
                              selectedOption.value == option.value,
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
        <Button variant="outline" onClick={close} className="h-9">
          キャンセル
        </Button>
        <Button onClick={handleSearch} className="h-9" disabled={isHasLoading}>
          絞り込む
        </Button>
      </div>
    </div>
  );
};

export default FilterDataTeamModal;
