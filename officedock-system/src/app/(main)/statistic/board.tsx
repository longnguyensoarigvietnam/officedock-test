'use client';
import { useRouter } from 'next/navigation';
import React, { useContext, useState } from 'react';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import StatisticCalendar from '@components/statistic/category/StatisticCalendar';
import PercentageCategory from '@components/statistic/category/PercentageCategory';
import TaskListStatistic from '@components/statistic/category/TaskList';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import AllocationCategory from '@components/statistic/category/AllocationCategory';
import PercentageCategoryCompare from '@components/statistic/category/compare/PercentageCategoryCompare';
import AllocationCategoryCompare from '@components/statistic/category/compare/AllocationCategoryCompare';
import LineChart from '@components/statistic/category/LineChart';
import StackedAreaChart from '@components/statistic/category/StackedAreaChart';
import LineChartCompare from '@components/statistic/category/compare/LineChartCompare';

import { pageRouters } from '@constants/routers';
import useCreationDataStatistic from '@hooks/useCreationDataStatistic';
import useStatisticCategoriesCompare from '@hooks/useStatisticCategoriesCompare';
import useStatisticCategories from '@hooks/useStatisticCategories';
import useTeamList from '@hooks/useListTeam';

import { OptionDropdownType } from '@interfaces/common';
import { formatDateToYMD, sumDurations } from '@utils/date';
import { StatisticStateContext } from '@providers/StatisticProvider';

const StatisticBoard = () => {
  const {
    startDate,
    endDate,
    isCheckCompare,
    startDateCompare,
    endDateCompare,
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    tagsOptions,
    selectedSmall,
    setSelectedTags,
    setSelectedLarge,
    setSelectedMedium,
    setSelectedOrganization,
    setSelectedSmall,
    setLargeOptions,
    setMediumOptions,
    setSmallOptions,
    setListOptionsOrganization,
    setTotalDurationSmall,
    setTotalDurationLarge,
    setTotalDurationMedium,
    setTotalDurationLargeCompare,
    setTotalDurationMediumCompare,
    setTotalDurationSmallCompare,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
    setIsLoadingOrganization,
    setIsLoadingLarge,
    setIsLoadingMedium,
    setIsLoadingOrganizationCompare,
    setIsLoadingLargeCompare,
    setIsLoadingMediumCompare,
    setTagsOptions,
    setCurrentPage,
  } = useContext(StatisticStateContext);
  const [isMyTask, setIsMyTask] = useState(true);
  const router = useRouter();

  const { statisticCategoryList } = useStatisticCategories({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      tagIds: selectedTags,
    },
    onSuccess: (data) => {
      const organization = creationDataStatisticData?.organizations?.find(
        (org) => org.id === selectedOrganization?.value,
      );
      if (organization && organization.statisticCategories) {
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
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (selectedSmall && selectedSmall.value && data.smallCategories) {
              const itemMap = data.smallCategories.find(
                (item) =>
                  String(item.categoryId) === String(selectedSmall.value),
              );
              if (itemMap) {
                setTotalDurationTask(itemMap.duration);
              } else {
                setTotalDurationTask('00:00:00');
              }
            } else {
              setTotalDurationTask(data.smallTotalDuration);
            }
          } else {
            if (selectedSmall && selectedSmall.value) return;

            setTotalDurationTask(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value) return;
          setTotalDurationTask(data.largeTotalDuration);
        }
      } else {
        setTotalDurationTask('00:00:00');
      }
    },
  });

  const { statisticCategoryCompareList } = useStatisticCategoriesCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value as number,
      mediumCategoryId: selectedMedium?.value as number,
      smallCategoryId: selectedSmall?.value as number,
      isCompare: isCheckCompare,
      tagIds: selectedTags,
    },
    onSuccess: (data) => {
      setTotalDurationLargeCompare(sumDurations(data.largeCategories ?? []));
      setTotalDurationMediumCompare(sumDurations(data.mediumCategories ?? []));
      setTotalDurationSmallCompare(sumDurations(data.smallCategories ?? []));
      if (data.largeTotalDuration) {
        if (data.mediumTotalDuration) {
          if (data.smallTotalDuration) {
            if (selectedSmall && selectedSmall.value && data.smallCategories) {
              const itemMap = data.smallCategories.find(
                (item) =>
                  String(item.categoryId) === String(selectedSmall.value),
              );
              if (itemMap) {
                setTotalDurationTaskCompare(itemMap.duration);
              } else {
                setTotalDurationTaskCompare('00:00:00');
              }
            } else {
              setTotalDurationTaskCompare(data.smallTotalDuration);
            }
          } else {
            if (selectedSmall && selectedSmall.value) return;

            setTotalDurationTaskCompare(data.mediumTotalDuration);
          }
        } else {
          if (selectedLarge && selectedLarge.value) return;
          setTotalDurationTaskCompare(data.largeTotalDuration);
        }
      } else {
        setTotalDurationTaskCompare('00:00:00');
      }
    },
  });

  const { creationDataStatisticData } = useCreationDataStatistic({
    is_statistic: true,
    onSuccess: (data) => {
      const result = (() => {
        if (data.organizations.length === 0) {
          return { label: '', value: '' };
        }

        const mainItem =
          data.organizations.find((item) => item.isMain) ||
          data.organizations[0];
        const optionsTagList = mainItem.tags.map((item) => ({
          label: item.name,
          value: item.id,
        }));
        setTagsOptions(optionsTagList);
        return {
          label: mainItem.name,
          value: mainItem.id,
        };
      })();

      setSelectedOrganization(result);

      setListOptionsOrganization([
        ...data.organizations.map((org) => ({
          value: org.id || '',
          label: org.name,
        })),
      ]);
    },
  });

  useTeamList({
    onSuccess: () => {},
  });

  // Handle Choose organization
  const handleSelectOrganization = (data: OptionDropdownType) => {
    if (data.value !== selectedOrganization?.value) {
      setIsLoadingOrganization(true);
      if (isCheckCompare) {
        setIsLoadingOrganizationCompare(true);
      }
    }
    setTotalDurationTask('');
    setCurrentPage(1);
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
      const optionsTagList = organization.tags.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setCurrentPage(1);

      setSelectedTags([]);
      setTagsOptions(optionsTagList);
      setLargeOptions(largeCategories);
    } else {
      setLargeOptions([]);
    }
    setMediumOptions([]);
  };
  // Handle Choose organization with setup options medium
  const handleSelectOrganizationCustom = (data: OptionDropdownType) => {
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
      const optionsTagList = organization.tags.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setCurrentPage(1);

      setSelectedTags([]);
      setTagsOptions(optionsTagList);
      setLargeOptions(largeCategories);
    } else {
      setLargeOptions([]);
    }
    setMediumOptions([]);
  };

  // Handle Choose LARGE
  const handleSelectLarge = (data: OptionDropdownType) => {
    if (data.value !== selectedLarge?.value) {
      setIsLoadingLarge(true);

      if (isCheckCompare) {
        setIsLoadingLargeCompare(true);
      }
    }
    setCurrentPage(1);

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
    if (data.value !== selectedMedium?.value) {
      setIsLoadingMedium(true);
      if (isCheckCompare) {
        setIsLoadingMediumCompare(true);
      }
    }
    setCurrentPage(1);

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
    setCurrentPage(1);

    setSelectedSmall(data);
  };

  // Remove tags
  const removeTag = (selected: OptionDropdownType) => {
    const currentTagIds = selectedTags || [];
    const updatedTagIds = currentTagIds.filter(
      (tag) => tag.value !== selected.value,
    );
    setCurrentPage(1);

    setSelectedTags(updatedTagIds);
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
              if (!isMyTask) {
                setIsMyTask(true);
              }
            }}
            variant={isMyTask ? 'primary' : 'outline'}
            className={`!py-0 !px-0 font-bold w-[80px] h-7 
              !rounded-[20px] text-xs  ${isMyTask ? '' : '!text-[#77858F] !bg-transparent !border-[#77858F]'}`}>
            カテゴリー
          </Button>
          <Button
            onClick={() => {
              router.push(pageRouters.STATISTIC_TAG_MANAGEMENT.href);
            }}
            variant={!isMyTask ? 'primary' : 'outline'}
            className={`${!isMyTask ? '' : '!text-[#77858F] !bg-transparent !border-[#77858F]'} !py-0 !px-0 font-bold w-[80px] h-7 !rounded-[20px] text-xs`}>
            タグ
          </Button>
        </div>{' '}
      </div>
      <div>
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <Dropdown
                options={listOptionsOrganization}
                placeholder="-"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                selectedOption={selectedOrganization || undefined}
                onChange={(data) => {
                  handleSelectOrganization(data);
                }}
              />
            </div>
            <div className="flex items-center  w-fit h-[30px]">
              <ImageRound
                className={`w-fit h-fit `}
                src="/icons/play-statistic.svg"
                name="icon chevron right"
              />
            </div>
            <div className="w-[220px]">
              <Dropdown
                options={largeOptions}
                placeholder="-"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                selectedOption={selectedLarge || undefined}
                onChange={(data) => handleSelectLarge(data)}
                disabled={!selectedOrganization}
              />
            </div>
            <div className="flex items-center  w-fit h-[30px]">
              <ImageRound
                className={`w-fit h-fit `}
                src="/icons/play-statistic.svg"
                name="icon chevron right"
              />
            </div>
            <div className="w-[220px]">
              <Dropdown
                placeholder="-"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                options={mediumOptions}
                selectedOption={selectedMedium || undefined}
                onChange={(data) => handleSelectMedium(data)}
                disabled={!selectedLarge}
              />
            </div>
          </div>
          <div>
            <StatisticCalendar />
          </div>
        </div>
        <div className="flex items-center mt-8  gap-1 mb-[30px]">
          <div className="flex items-center gap-2">
            <div className="w-[240px]  relative flex-shrink-0">
              <MultiSelectDropdown
                isShowIconFilter
                options={tagsOptions}
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
        </div>
      </div>

      {isCheckCompare ? (
        <>
          {/* Percentage of categories */}
          <PercentageCategoryCompare
            startDate={startDate}
            endDate={endDate}
            removeTag={removeTag}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticCategoryList={statisticCategoryList}
            statisticCategoryCompareList={statisticCategoryCompareList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectOrganizationCustom={handleSelectOrganizationCustom}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Progress bar */}
          <AllocationCategoryCompare
            startDate={startDate}
            endDate={endDate}
            removeTag={removeTag}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            statisticCategoryList={statisticCategoryList}
            statisticCategoryCompareList={statisticCategoryCompareList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Line chart */}
          <LineChartCompare
            startDate={startDate}
            endDate={endDate}
            startDateCompare={startDateCompare}
            endDateCompare={endDateCompare}
            removeTag={removeTag}
            statisticCategoryList={statisticCategoryList}
            statisticCategoryCompareList={statisticCategoryCompareList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
        </>
      ) : (
        <>
          {/* Percentage of categories */}
          <PercentageCategory
            startDate={startDate}
            endDate={endDate}
            removeTag={removeTag}
            statisticCategoryList={statisticCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectOrganizationCustom={handleSelectOrganizationCustom}
            handleSelectSmall={handleSelectSmall}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
          {/* Progress bar */}
          <AllocationCategory
            startDate={startDate}
            endDate={endDate}
            statisticCategoryList={statisticCategoryList}
            removeTag={removeTag}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
            handleSelectSmall={handleSelectSmall}
          />
          {/* Line chart */}
          <LineChart
            startDate={startDate}
            endDate={endDate}
            removeTag={removeTag}
            statisticCategoryList={statisticCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
          {/* Stack area chart */}

          <StackedAreaChart
            startDate={startDate}
            endDate={endDate}
            removeTag={removeTag}
            statisticCategoryList={statisticCategoryList}
            handleSelectOrganization={handleSelectOrganization}
            handleSelectLarge={handleSelectLarge}
            handleSelectMedium={handleSelectMedium}
          />
        </>
      )}

      {/* Task list */}
      <TaskListStatistic
        startDate={startDate}
        endDate={endDate}
        startDateCompare={startDateCompare}
        endDateCompare={endDateCompare}
        isCheckCompare={isCheckCompare}
        statisticCategoryList={statisticCategoryList}
        handleSelectOrganization={handleSelectOrganization}
        handleSelectLarge={handleSelectLarge}
        handleSelectMedium={handleSelectMedium}
        handleSelectSmall={handleSelectSmall}
        removeTag={removeTag}
        creationDataStatisticData={
          creationDataStatisticData?.organizations || []
        }
      />
    </div>
  );
};

export default StatisticBoard;
