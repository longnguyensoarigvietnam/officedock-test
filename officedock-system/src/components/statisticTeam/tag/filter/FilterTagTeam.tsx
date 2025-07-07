import React, { useContext } from 'react';

import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ImageRound from '@components/common/ImageRound';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

type Props = {
  className?: string;
};

const FilterTagTeam = ({ className }: Props) => {
  const {
    isHasLoading,
    tagsOptions,
    isCheckCompare,
    selectedTags,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    isLoadingSmall,
    isLoadingSmallCompare,
    removeTag,
    setSelectedTags,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
  } = useContext(StatisticTeamTagsStateContext);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-[240px]">
        <MultiSelectDropdown
          placeholder="集計対象のタグを選択"
          options={tagsOptions}
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
            setSelectedTags(updatedTagIds);
          }}
        />
      </div>
      <div>
        <div className="flex gap-2 flex-wrap max-w-[450px]">
          {selectedTags.map((item) => {
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
