import React, { useContext } from 'react';

import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

type Props = {
  className?: string;
};

const FilterTag = ({ className }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    selectedTags,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingSmall,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    isLoadingSmallCompare,
    setSelectedTags,
    removeTag,
  } = useContext(StatisticTagStateContext);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-[240px]">
        <MultiSelectDropdown
          options={tagsOptions}
          placeholder="集計対象のタグを選択"
          disabled={isHasLoading}
          className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
          labelOptionClass="break-words w-[190px]"
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
      </div>
      <div>
        <div className="flex gap-2 flex-wrap max-w-[500px] ">
          {selectedTags.map((item) => {
            return (
              <div
                key={item.value}
                className="max-w-[400px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                <span className=" truncate">{item.label}</span>
                {isLoadingLarge ||
                isLoadingMedium ||
                isLoadingOrganization ||
                isLoadingSmall ||
                isLoadingLargeCompare ||
                isLoadingMediumCompare ||
                isLoadingOrganizationCompare ||
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

export default FilterTag;
