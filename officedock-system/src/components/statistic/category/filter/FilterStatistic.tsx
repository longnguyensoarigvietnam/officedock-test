import React, { useContext } from 'react';

import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { StatisticStateContext } from '@providers/StatisticProvider';

type Props = {
  className?: string;
};

const FilterStatistic = ({ className }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    selectedTags,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    setSelectedTags,
    removeTag,
  } = useContext(StatisticStateContext);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-[240px]  relative flex-shrink-0">
        <MultiSelectDropdown
          isShowIconFilter
          options={tagsOptions}
          disabled={isHasLoading}
          placeholder="集計対象のタグを選択"
          className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
          optionClassName="!top-6"
          labelOptionClass="break-all w-[190px]"
          selectedOptions={selectedTags || []}
          onChange={(selected) => {
            let updatedTagIds = [];
            const currentTagIds = selectedTags || [];
            const foundItemIndex = currentTagIds.findIndex(
              (tag) => tag.value == selected.value,
            );
            if (foundItemIndex == -1) {
              updatedTagIds = [...currentTagIds, selected];
            } else {
              updatedTagIds = currentTagIds.filter(
                (tag) => tag.value != selected.value,
              );
            }
            setSelectedTags(updatedTagIds);
          }}
        />
        {selectedTags.length === 0 && (
          <span className="text-xs absolute text-[#77858F] top-[2px] right-[135px]">
            タグの絞り込み
          </span>
        )}
      </div>
      <div className="relative right-[224px] flex-grow top-[-8px]">
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
