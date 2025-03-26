'use client';
import { useRouter } from 'next/navigation';
import React, { useContext, useState } from 'react';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import TaskListStatisticTags from '@components/statistic/tag/TaskList';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import PercentageTags from '@components/statistic/tag/PercentageTags';
import StatisticTagCalendar from '@components/statistic/tag/StatisticCalendar';
import PercentageTagsCompare from '@components/statistic/tag/compare/PercentageTagsCompare';

import useCreationDataStatistic from '@hooks/useCreationDataStatistic';
import useStatisticTagsCompare from '@hooks/useStatisticTagsCompare';
import useStatisticsTags from '@hooks/useStatisticTags';
import { pageRouters } from '@constants/routers';
import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';

import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

const StatisticTagBoard = () => {
  const {
    startDate,
    endDate,
    isCheckCompare,
    startDateCompare,
    endDateCompare,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    tagsOptions,
    selectedTags,
    selectedSmall,
    setSelectedTags,
    setTagsOptions,
    setTotalDurationSmall,
    setTotalDurationLarge,
    setTotalDurationMedium,
    setSelectedOrganization,
    setTotalDurationLargeCompare,
    setTotalDurationMediumCompare,
    setTotalDurationSmallCompare,
    setTotalDurationCategory,
    setTotalDurationCategoryCompare,
    setListOptionsOrganization,
    setSelectedLarge,
    setSelectedMedium,
    setSelectedSmall,
    setLargeOptions,
    setMediumOptions,
    setSmallOptions,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingSmall,
    setIsLoadingOrganization,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setIsLoadingSmallCompare,
  } = useContext(StatisticTagStateContext);
  const [isMyTask, setIsMyTask] = useState(true);
  const router = useRouter();

  const { statisticTagsList } = useStatisticsTags({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
    },
    onSuccess: (data) => {
      const organization = creationDataStatisticData?.organizations?.find(
        (org) => org.id === selectedOrganization?.value,
      );
      if (organization) {
        const largeCategories = organization.statisticCategories.map(
          (stat) => ({
            value: stat.LARGE.id,
            label: stat.LARGE.name,
          }),
        );
        setLargeOptions(largeCategories);
      } else {
        setLargeOptions([]);
      }

      setTotalDurationLarge(sumDurations(data.largeCategories ?? []));
      setTotalDurationMedium(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmall(sumDurations(data.smallCategories ?? []));
      setTotalDurationCategory(sumDurations(data.category ?? []));
    },
  });
  const { statisticTagsListCompare } = useStatisticTagsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,

      isCompare: isCheckCompare,
    },
    onSuccess: (data) => {
      setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
      setTotalDurationMediumCompare(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmallCompare(sumDurations(data.smallCategories ?? []));
      setTotalDurationCategoryCompare(sumDurations(data.smallCategories ?? []));
    },
  });
  const { creationDataStatisticData } = useCreationDataStatistic({
    onSuccess: (data) => {
      const result = (() => {
        if (data.organizations.length === 0) {
          return { label: '', value: '' };
        }

        const mainItem =
          data.organizations.find((item) => item.isMain) ||
          data.organizations[0];
        return {
          label: mainItem.name,
          value: mainItem.id,
        };
      })();

      const optionsTagList = data.tags.map((item) => ({
        label: item.name,
        value: item.id,
      }));

      setSelectedOrganization(result);
      setTagsOptions(optionsTagList);
      setSelectedTags(optionsTagList);
      setListOptionsOrganization([
        ...data.organizations.map((org) => ({
          value: org.id || '',
          label: org.name,
        })),
      ]);
    },
  });

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = selectedTags || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setSelectedTags(updatedTagIds);
  };

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    setIsLoadingOrganization(true);
    if (isCheckCompare) {
      setIsLoadingOrganizationCompare(true);
    }
    setSelectedOrganization(data);
    setSelectedLarge(null);
    setSelectedMedium(null);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations?.find(
      (org) => org.id === data.value,
    );
    if (organization) {
      const largeCategories = organization.statisticCategories.map((stat) => ({
        value: stat.LARGE.id,
        label: stat.LARGE.name,
      }));
      setLargeOptions(largeCategories);
    } else {
      setLargeOptions([]);
    }
    setMediumOptions([]);
  };
  // Handle Choose LARGE
  const handleSelectLarge = (data: OptionDropdownType) => {
    setIsLoadingLarge(true);
    if (isCheckCompare) {
      setIsLoadingLargeCompare(true);
    }
    setSelectedLarge(data);
    setSelectedMedium(null);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations.find(
      (org) => org.id === selectedOrganization?.value,
    );
    const largeCategory = organization?.statisticCategories.find(
      (stat) => stat.LARGE.id === data.value,
    );

    if (largeCategory) {
      const mediumCategories = largeCategory.MEDIUM.map((medium) => ({
        value: medium.MEDIUM?.id || '',
        label: medium.MEDIUM?.name || '',
      }));

      setMediumOptions(mediumCategories);
    } else {
      setMediumOptions([]);
    }
  };

  // Handle Choose MEDIUM
  const handleSelectMedium = (data: OptionDropdownType) => {
    setIsLoadingMedium(true);
    if (isCheckCompare) {
      setIsLoadingMediumCompare(true);
    }
    setSelectedMedium(data);
    setSelectedSmall(null);

    const organization = creationDataStatisticData?.organizations.find(
      (org) => org.id === selectedOrganization?.value,
    );
    const largeCategory = organization?.statisticCategories.find(
      (stat) => stat.LARGE.id === selectedLarge?.value,
    );
    const mediumCategory = largeCategory?.MEDIUM.find(
      (medium) => medium.MEDIUM?.id === data.value,
    );

    if (mediumCategory) {
      const smallCategories =
        mediumCategory.SMALL &&
        mediumCategory.SMALL.map((small) => ({
          value: small.id,
          label: small.name,
        }));
      setSmallOptions(smallCategories);
    } else {
      setSmallOptions([]);
    }
  };
  // Handle choose small
  const handleSelectSmall = (data: OptionDropdownType) => {
    setIsLoadingSmall(true);
    if (isCheckCompare) {
      setIsLoadingSmallCompare(true);
    }
    setSelectedSmall(data);
  };

  return (
    <div className="pt-[30px] pr-10  font-medium ">
      <div className="flex items-center gap-5 mb-[33px]">
        <span className="text-[26px] font-medium relative top-[-2px]">
          集計
        </span>
        <div className="flex justify-center items-center gap-2 ">
          <Button
            onClick={() => {
              router.push(pageRouters.STATISTIC_MANAGEMENT.href);
            }}
            variant={'outline'}
            className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs !text-[#77858F] !bg-transparent !border-[#77858F]`}>
            カテゴリー
          </Button>
          <Button
            onClick={() => {
              if (isMyTask) {
                setIsMyTask(false);
              }
            }}
            variant={'primary'}
            className={` !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
            タグ
          </Button>
        </div>{' '}
      </div>
      <div>
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-[240px]">
              <MultiSelectDropdown
                options={tagsOptions}
                placeholder="集計対象のタグを選択"
                className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
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
                      className="w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                      <span className="w-[32px] truncate">{item.label}</span>
                      <ImageRound
                        onClick={() => {
                          removeTag(item);
                        }}
                        src={`/icons/close-white.svg`}
                        name="close"
                        className="w-fit h-fit cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <StatisticTagCalendar />
          </div>
        </div>
        <div className="my-8"></div>
      </div>
      {/* Percentage of categories */}
      {isCheckCompare ? (
        <PercentageTagsCompare
          startDate={startDate}
          endDate={endDate}
          startDateCompare={startDateCompare}
          endDateCompare={endDateCompare}
          statisticTagsList={statisticTagsList}
          statisticTagsCompareList={statisticTagsListCompare}
          removeTag={removeTag}
          handleSelectOrganization={handleSelectOrganization}
          handleSelectLarge={handleSelectLarge}
          handleSelectMedium={handleSelectMedium}
          handleSelectSmall={handleSelectSmall}
        />
      ) : (
        <PercentageTags
          startDate={startDate}
          endDate={endDate}
          statisticTagsList={statisticTagsList}
          removeTag={removeTag}
          handleSelectOrganization={handleSelectOrganization}
          handleSelectLarge={handleSelectLarge}
          handleSelectSmall={handleSelectSmall}
          handleSelectMedium={handleSelectMedium}
        />
      )}

      {/* Task list */}
      <TaskListStatisticTags
        startDate={startDate}
        endDate={endDate}
        removeTag={removeTag}
        startDateCompare={startDateCompare}
        endDateCompare={endDateCompare}
        isCheckCompare={isCheckCompare}
        handleSelectOrganization={handleSelectOrganization}
        handleSelectLarge={handleSelectLarge}
        handleSelectMedium={handleSelectMedium}
        handleSelectSmall={handleSelectSmall}
        creationDataStatisticData={
          creationDataStatisticData?.organizations || []
        }
      />
    </div>
  );
};

export default StatisticTagBoard;
