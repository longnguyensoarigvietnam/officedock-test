import React, { useEffect, useState, useContext } from 'react';

import Button from '@components/common/Button';
import Checkbox from '@components/common/Checkbox';
import ImageRound from '@components/common/ImageRound';

import { NO_DATA_AVAILABLE } from '@constants';
import { OptionDropdownType } from '@interfaces/common';
import { StatisticStateContext } from '@providers/StatisticProvider';
import { isEqualOptions } from '@utils/date';

type Props = {
  open: boolean;
  close: () => void;
};

const FilterStatisticModal = ({ open, close }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    selectedTags,
    isCheckCompare,
    setSelectedTags,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganization,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingOrganizationCompare,
  } = useContext(StatisticStateContext);
  const [selectedOption, setSelectedOption] = useState<OptionDropdownType[]>(
    [],
  );
  useEffect(() => {
    if (selectedTags.length) {
      setSelectedOption(selectedTags);
    }
  }, [selectedTags, open]);

  const handleReset = () => {
    setSelectedOption([]);
  };

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

  const handleSearch = () => {
    // If no available tag options, exit early
    if (tagsOptions.length === 0) return;

    setSelectedTags((prev) => {
      const prevTags = prev || [];

      // Check if selectedOption is actually different
      const hasChanged = !isEqualOptions(prevTags, selectedOption);

      // No change → skip loading and do not update state
      if (!hasChanged) {
        return prev;
      }

      // Change detected → trigger loading
      setIsLoadingLarge(true);
      setIsLoadingMedium(true);
      setIsLoadingOrganization(true);

      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
        setIsLoadingMediumCompare(true);
        setIsLoadingOrganizationCompare(true);
      }

      // Update selected tags
      return selectedOption;
    });

    close();
  };

  return (
    <div className="w-full pt-[10px]  pb-5 bg-white rounded-[14px] shadow-common p-1 flex flex-col gap-1 text-sm">
      <div className="text-xs pl-5 pr-[10px] font-medium text-[#77858F] flex justify-between items-center">
        <span>タグの絞り込み</span>
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
        <Button
          onClick={handleSearch}
          className="h-9"
          disabled={isHasLoading || tagsOptions.length == 0}>
          絞り込む
        </Button>
      </div>
    </div>
  );
};

export default FilterStatisticModal;
