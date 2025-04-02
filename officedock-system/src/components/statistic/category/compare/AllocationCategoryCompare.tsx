import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';

import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  totalDurationsForStatistic,
} from '@utils/date';
import { EventWorkCategory } from '@constants/enums';

import { StatisticStateContext } from '@providers/StatisticProvider';

import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ProgressBarStatistic from '../ProgressBarStatistic';
import { getRandomColor, lightenColor } from '@utils';
import { SkeletonElement } from '@components/common/SkeletonLoading';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticCategoryCompareList: StatisticsCategories | undefined;
  startDateCompare: Date;
  endDateCompare: Date | null;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

type ProgressDataType = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: string[];
  mergedItems?: {
    color: string;
    id: number;
    label: string;
    value: number;
    duration: string;
    optionData: string[];
  }[];
};

const AllocationCategoryCompare = memo(
  ({
    startDate,
    endDate,
    statisticCategoryList,
    startDateCompare,
    endDateCompare,
    statisticCategoryCompareList,
    removeTag,
    handleSelectOrganization,
    handleSelectLarge,
    handleSelectMedium,
    handleSelectSmall,
  }: Props) => {
    const [isExtendData, setIsExtendData] = useState(true);
    const [isShowModal, setIsShowModal] = useState(false);
    const [isShowModalCompare, setIsShowModalCompare] = useState(false);
    const [detailCategory, setDetailCategory] = useState<{
      id: number | null;
      type: string;
      totalDuration: string;
    } | null>(null);
    const [detailCategoryCompare, setDetailCategoryCompare] = useState<{
      id: number | null;
      type: string;
      totalDuration: string;
    } | null>(null);

    const [progressDataPairsLarge, setProgressDataPairsLarge] = useState<
      {
        main: ProgressDataType | null;
        compare: ProgressDataType | null;
      }[]
    >([]);

    const [progressDataPairsMedium, setProgressDataPairsMedium] = useState<
      {
        main: ProgressDataType | null;
        compare: ProgressDataType | null;
      }[]
    >([]);

    const [progressDataPairsSmall, setProgressDataPairsSmall] = useState<
      {
        main: ProgressDataType | null;
        compare: ProgressDataType | null;
      }[]
    >([]);

    const {
      totalDurationLarge,
      totalDurationMedium,
      totalDurationSmall,
      totalDurationLargeCompare,
      totalDurationMediumCompare,
      totalDurationSmallCompare,
      listOptionsOrganization,
      largeOptions,
      mediumOptions,
      smallOptions,
      selectedLarge,
      selectedMedium,
      selectedOrganization,
      selectedTags,
      selectedSmall,
      tagsOptions,
      isLoadingLargeCompare,
      isLoadingMediumCompare,
      isLoadingOrganizationCompare,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      setSelectedTags,
      setTotalDurationTask,
      setTotalDurationCategory,
      setTotalDurationTaskCompare,
    } = useContext(StatisticStateContext);

    useEffect(() => {
      if (statisticCategoryList && statisticCategoryCompareList) {
        const mergeCategories = (
          mainCategories: StatisticCategoryInfo[],
          compareCategories: StatisticCategoryInfo[],
          selectedLargeCategoryColor?: string,
          selectedLargeCompareCategoryColor?: string,
        ) => {
          const mergedMap = new Map<
            number | string,
            {
              main: ProgressDataType | null;
              compare: ProgressDataType | null;
            }
          >();

          const smallMainCategories: ProgressDataType[] = [];
          const smallCompareCategories: ProgressDataType[] = [];

          // Add main categories first
          mainCategories.forEach((item) => {
            const mainData: ProgressDataType = {
              id: item.categoryId,
              label: item.categoryName,
              value: item.percent,
              color:
                item.categoryColor ||
                (selectedLargeCategoryColor &&
                  lightenColor(selectedLargeCategoryColor, item.percent)) ||
                (selectedLargeCompareCategoryColor &&
                  lightenColor(
                    selectedLargeCompareCategoryColor,
                    item.percent,
                  )) ||
                getRandomColor(),
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
            };

            if (item.percent < 10) {
              smallMainCategories.push(mainData);
            } else {
              mergedMap.set(item.categoryId, { main: mainData, compare: null });
            }
          });

          // Add compare categories, updating existing ones or creating new entries
          compareCategories.forEach((compareItem) => {
            const compareData: ProgressDataType = {
              id: compareItem.categoryId,
              label: compareItem.categoryName,
              value: compareItem.percent,
              color:
                compareItem.categoryColor ||
                (selectedLargeCategoryColor &&
                  lightenColor(
                    selectedLargeCategoryColor,
                    compareItem.percent,
                  )) ||
                (selectedLargeCompareCategoryColor &&
                  lightenColor(
                    selectedLargeCompareCategoryColor,
                    compareItem.percent,
                  )) ||
                getRandomColor(),
              duration: compareItem.duration,
              optionData: compareItem.tasks
                .slice(0, 3)
                .map((task) => task.title),
            };

            if (compareItem.percent < 10) {
              smallCompareCategories.push(compareData);
            } else if (mergedMap.has(compareItem.categoryId)) {
              mergedMap.get(compareItem.categoryId)!.compare = compareData;
            } else {
              mergedMap.set(compareItem.categoryId, {
                main: null,
                compare: compareData,
              });
            }
          });

          // Merge small categories into "その他"
          if (
            smallMainCategories.length > 0 ||
            smallCompareCategories.length > 0
          ) {
            const smallMainCategoriesValue = smallMainCategories.reduce(
              (acc, item) => acc + item.value,
              0,
            );
            const smallCompareCategoriesValue = smallCompareCategories.reduce(
              (acc, item) => acc + item.value,
              0,
            );
            mergedMap.set('その他', {
              main:
                smallMainCategories.length > 0
                  ? {
                      id: -1,
                      label: 'その他',
                      value: smallMainCategoriesValue,
                      color:
                        (selectedLargeCategoryColor &&
                          lightenColor(
                            selectedLargeCategoryColor,
                            smallMainCategoriesValue,
                          )) ||
                        (selectedLargeCompareCategoryColor &&
                          lightenColor(
                            selectedLargeCompareCategoryColor,
                            smallMainCategoriesValue,
                          )) ||
                        getRandomColor(),
                      duration: totalDurationsForStatistic(
                        smallMainCategories.map((item) => item.duration),
                      ),
                      optionData: smallMainCategories
                        .flatMap((item) => item.optionData)
                        .slice(0, 3),
                      mergedItems: smallMainCategories.map((item) => ({
                        ...item,
                        color:
                          (selectedLargeCategoryColor &&
                            lightenColor(
                              selectedLargeCategoryColor,
                              smallMainCategoriesValue,
                            )) ||
                          (selectedLargeCompareCategoryColor &&
                            lightenColor(
                              selectedLargeCompareCategoryColor,
                              smallMainCategoriesValue,
                            )) ||
                          getRandomColor(),
                      })),
                    }
                  : null,
              compare:
                smallCompareCategories.length > 0
                  ? {
                      id: -1,
                      label: 'その他',
                      value: smallCompareCategoriesValue,
                      color:
                        (selectedLargeCategoryColor &&
                          lightenColor(
                            selectedLargeCategoryColor,
                            smallMainCategoriesValue,
                          )) ||
                        (selectedLargeCompareCategoryColor &&
                          lightenColor(
                            selectedLargeCompareCategoryColor,
                            smallMainCategoriesValue,
                          )) ||
                        getRandomColor(),
                      duration: totalDurationsForStatistic(
                        smallCompareCategories.map((item) => item.duration),
                      ),
                      optionData: smallCompareCategories
                        .flatMap((item) => item.optionData)
                        .slice(0, 3),
                      mergedItems: smallCompareCategories.map((item) => ({
                        ...item,
                        color:
                          (selectedLargeCategoryColor &&
                            lightenColor(
                              selectedLargeCategoryColor,
                              smallCompareCategoriesValue,
                            )) ||
                          (selectedLargeCompareCategoryColor &&
                            lightenColor(
                              selectedLargeCompareCategoryColor,
                              smallCompareCategoriesValue,
                            )) ||
                          getRandomColor(),
                      })),
                    }
                  : null,
            });
          }

          return Array.from(mergedMap.values());
        };

        const selectedLargeCategoryColor =
          statisticCategoryList.largeCategories &&
          statisticCategoryList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;

        const selectedLargeCompareCategoryColor =
          statisticCategoryCompareList.largeCategories &&
          statisticCategoryCompareList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;

        const largePairs = mergeCategories(
          statisticCategoryList.largeCategories || [],
          statisticCategoryCompareList.largeCategories || [],
        );

        const mediumPairs = mergeCategories(
          statisticCategoryList.mediumCategories || [],
          statisticCategoryCompareList.mediumCategories || [],
          selectedLargeCategoryColor,
          selectedLargeCompareCategoryColor,
        );

        const smallPairs = mergeCategories(
          statisticCategoryList.smallCategories || [],
          statisticCategoryCompareList.smallCategories || [],
          selectedLargeCategoryColor,
          selectedLargeCompareCategoryColor,
        );

        setProgressDataPairsLarge(largePairs);
        setProgressDataPairsMedium(mediumPairs);
        setProgressDataPairsSmall(smallPairs);
      }
    }, [statisticCategoryList, statisticCategoryCompareList]);

    const handleClickTooltip = (
      id: number | null,
      type: string,
      isCompare: boolean,
    ) => {
      let duration: string = '00:00:00';
      if (isCompare) {
        if (type === EventWorkCategory.ALL) {
          duration =
            statisticCategoryCompareList?.largeCategories.find(
              (item) => item.categoryId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.LARGE) {
          duration =
            statisticCategoryCompareList?.mediumCategories?.find(
              (item) => item.categoryId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.MEDIUM) {
          duration =
            statisticCategoryCompareList?.smallCategories?.find(
              (item) => item.categoryId == id,
            )?.duration || '00:00:00';
        }
        setDetailCategoryCompare({
          id: id,
          type: type,
          totalDuration: duration,
        });

        setIsShowModalCompare(true);
      } else {
        if (type === EventWorkCategory.ALL) {
          duration =
            statisticCategoryList?.largeCategories.find(
              (item) => item.categoryId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.LARGE) {
          duration =
            statisticCategoryList?.mediumCategories?.find(
              (item) => item.categoryId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.MEDIUM) {
          duration =
            statisticCategoryList?.smallCategories?.find(
              (item) => item.categoryId == id,
            )?.duration || '00:00:00';
        }
        setDetailCategory({
          id: id,
          type: type,
          totalDuration: duration,
        });

        setTimeout(() => {
          setIsShowModal(true);
        }, 500);
      }
    };

    const handleScroll = () => {
      if (detailCategory?.type === EventWorkCategory.ALL) {
        const item = largeOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectLarge(item);

        setTotalDurationTask(detailCategory.totalDuration);
        if (String(detailCategory?.id) == '未設定') {
          handleSelectLarge({
            label: '未設定',
            value: '未設定',
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.LARGE) {
        const item = mediumOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectMedium(item);
        setTotalDurationTask(detailCategory.totalDuration);
        if (String(detailCategory?.id) == '未設定') {
          handleSelectMedium({
            label: '未設定',
            value: '未設定',
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.MEDIUM) {
        const item = smallOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectSmall(item);
        setTotalDurationTask(detailCategory.totalDuration);
        if (String(detailCategory?.id) == '未設定') {
          handleSelectSmall({
            label: '未設定',
            value: '未設定',
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.SMALL) {
        const item = smallOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectSmall(item);
        if (String(detailCategory?.id) == '未設定') {
          handleSelectSmall({
            label: '未設定',
            value: '未設定',
          });
          setTotalDurationCategory(detailCategory.totalDuration);
        }
      }

      const element = document.getElementById('task-list-statistic');
      setIsShowModal(false);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    const handleScrollCompare = () => {
      if (detailCategoryCompare?.type === EventWorkCategory.ALL) {
        const item = largeOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectLarge(item);
        setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);

        if (String(detailCategoryCompare?.id) == '未設定') {
          handleSelectLarge({
            label: '未設定',
            value: '未設定',
          });
        }
      }
      if (detailCategoryCompare?.type === EventWorkCategory.LARGE) {
        const item = mediumOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectMedium(item);
        setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);

        if (String(detailCategoryCompare?.id) == '未設定') {
          handleSelectMedium({
            label: '未設定',
            value: '未設定',
          });
        }
      }

      if (detailCategoryCompare?.type === EventWorkCategory.MEDIUM) {
        const item = smallOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectSmall(item);
        setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);

        if (String(detailCategoryCompare?.id) == '未設定') {
          handleSelectSmall({
            label: '未設定',
            value: '未設定',
          });
        }
      }
      if (detailCategoryCompare?.type === EventWorkCategory.SMALL) {
        const item = smallOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectSmall(item);
        setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);
        if (String(detailCategoryCompare?.id) == '未設定') {
          handleSelectSmall({
            label: '未設定',
            value: '未設定',
          });
        }
      }

      const element = document.getElementById('task-list-statistic');
      setIsShowModalCompare(false);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });

        const url = new URL(window.location.href);

        url.searchParams.set('isCompare', 'true');
        window.history.pushState({}, '', url);
      }
    };

    return (
      <>
        <div
          style={{
            boxShadow: '0px 4px 10px 0px #0000000D',
          }}
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[14px]">
          {/* Header & sort */}
          <div className="flex justify-between">
            <div className="flex items-center gap-x-5">
              <div className="flex items-center gap-[10px] ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                  name="statistic-progress-bar icon"
                  src={`/icons/statistic-progress-bar.svg`}
                />
                <span className="text-black font-semibold text-[18px] relative top-[2px]">
                  各カテゴリーの時間配分
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[240px]  relative">
                  <MultiSelectDropdown
                    isShowIconFilter
                    options={tagsOptions}
                    labelOptionClass="break-all"
                    placeholder="集計対象のタグを選択"
                    optionClassName="!top-6"
                    className="!h-[14px] !py-0 text-sm font-normal !rounded-md"
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
                <div className="relative right-[224px] top-0">
                  <div className="flex gap-2 ">
                    {selectedTags.map((item) => {
                      return (
                        <div
                          key={item.value}
                          className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                          <span className="min-w-[32px]  truncate">
                            {item.label}
                          </span>
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
            <ImageRound
              src="/icons/extend-calendar.svg"
              name="Extend calendar"
              className={`!w-3 !h-3 hover:cursor-pointer ${
                isExtendData ? '-rotate-90' : 'rotate-90'
              }`}
              onClick={() => {
                setIsExtendData(!isExtendData);
              }}
            />
          </div>
          {isExtendData && (
            <>
              {/* Line */}
              <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
              <div>
                <div className="flex  justify-between px-[30px] text-sm font-medium">
                  {/* Column Chart 1 */}
                  <div className="w-[300px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                      大カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={listOptionsOrganization}
                        selectedOption={selectedOrganization || undefined}
                        onChange={(data) => handleSelectOrganization(data)}
                      />
                      <div className={`mt-[14px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                            基準
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                            <p>
                              {startDate && formatShowStatisticTask(startDate)}
                            </p>
                            ~
                            <p>{endDate && formatShowStatisticTask(endDate)}</p>
                          </div>
                        </div>
                        {progressDataPairsLarge.filter((pair) => pair.main)
                          .length ? (
                          <div className="font-medium text-sm text-black ">
                            合計{' '}
                            {totalDurationLarge &&
                              formatTimeToJapanese(totalDurationLarge)}
                          </div>
                        ) : (
                          <div>-</div>
                        )}
                      </div>

                      <div className={`mt-[10px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                            比較
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                            <p>
                              {startDateCompare &&
                                formatShowStatisticTask(startDateCompare)}
                            </p>
                            ~
                            <p>
                              {endDateCompare &&
                                formatShowStatisticTask(endDateCompare)}
                            </p>
                          </div>
                        </div>
                        {progressDataPairsLarge.filter((pair) => pair.compare)
                          .length ? (
                          <div className="font-medium text-sm text-black">
                            合計{' '}
                            {totalDurationLargeCompare &&
                              formatTimeToJapanese(totalDurationLargeCompare)}
                          </div>
                        ) : (
                          <div>-</div>
                        )}
                      </div>

                      {isLoadingOrganizationCompare || isLoadingOrganization ? (
                        <div className="flex flex-col mt-[50px]">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-12" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="mt-5 flex flex-col gap-4">
                          {progressDataPairsLarge.map((pair, index) => {
                            return (
                              <div key={index}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-40">
                                    {pair.main
                                      ? pair.main.label
                                      : pair.compare?.label || ''}
                                  </span>
                                  <span className="text-sm font-medium truncate max-w-24">
                                    {formatTimeToJapanese(
                                      totalDurationsForStatistic([
                                        pair.main?.duration || '00:00:00',
                                        pair.compare?.duration || '00:00:00',
                                      ]),
                                    )}
                                  </span>
                                </div>
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.ALL,
                                      false,
                                    );
                                  }}
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
                                      data.value !== '未設定' &&
                                      data.value != selectedLarge?.value
                                    ) {
                                      const select = largeOptions.find(
                                        (item) => item.value === data.value,
                                      );

                                      if (select) {
                                        handleSelectLarge(select);
                                      }
                                    }
                                  }}
                                  id={pair.main ? pair.main.id : 0}
                                  label={pair.main ? pair.main.label : ''}
                                  value={pair.main ? pair.main.value : 0}
                                  color={pair.main ? pair.main.color : ''}
                                  duration={
                                    pair.main ? String(pair.main.duration) : ''
                                  }
                                  optionData={
                                    pair.main ? pair.main.optionData : []
                                  }
                                  mergedItems={
                                    pair.main ? pair.main.mergedItems : []
                                  }
                                  showInfo={false}
                                  startDate={startDate}
                                  endDate={endDate}
                                />
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.ALL,
                                      true,
                                    );
                                  }}
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
                                      data.value !== '未設定' &&
                                      data.value != selectedLarge?.value
                                    ) {
                                      const select = largeOptions.find(
                                        (item) => item.value === data.value,
                                      );

                                      if (select) {
                                        handleSelectLarge(select);
                                      }
                                    }
                                  }}
                                  id={pair.compare ? pair.compare.id : 0}
                                  label={pair.compare ? pair.compare.label : ''}
                                  value={pair.compare ? pair.compare.value : 0}
                                  color={pair.compare ? pair.compare.color : ''}
                                  duration={
                                    pair.compare
                                      ? String(pair.compare.duration)
                                      : ''
                                  }
                                  optionData={
                                    pair.compare ? pair.compare.optionData : []
                                  }
                                  mergedItems={
                                    pair.compare ? pair.compare.mergedItems : []
                                  }
                                  showInfo={false}
                                  startDateCompare={startDateCompare}
                                  endDateCompare={endDateCompare}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="relative w-[18px] top-[6px]">
                      <ImageRound
                        className={`w-[18px] h-6 `}
                        src="/icons/drawer-blue.svg"
                        name="icon chevron right"
                      />
                    </div>
                  </div>
                  {/* Column Chart 2 */}
                  <div className="w-[300px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                      中カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="大カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md  text-sm font-normal !py-0 !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={largeOptions}
                        selectedOption={selectedLarge || undefined}
                        onChange={(data) => handleSelectLarge(data)}
                        disabled={!selectedOrganization}
                      />
                      <div className={`mt-[14px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                            基準
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                            <p>
                              {startDate && formatShowStatisticTask(startDate)}
                            </p>
                            ~
                            <p>{endDate && formatShowStatisticTask(endDate)}</p>
                          </div>
                        </div>
                        {progressDataPairsMedium.filter((pair) => pair.main)
                          .length ? (
                          <div className="font-medium text-sm text-black ">
                            合計{' '}
                            {totalDurationMedium &&
                              formatTimeToJapanese(totalDurationMedium)}
                          </div>
                        ) : (
                          <div>-</div>
                        )}
                      </div>

                      <div className={`mt-[10px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                            比較
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                            <p>
                              {startDateCompare &&
                                formatShowStatisticTask(startDateCompare)}
                            </p>
                            ~
                            <p>
                              {endDateCompare &&
                                formatShowStatisticTask(endDateCompare)}
                            </p>
                          </div>
                        </div>
                        {progressDataPairsMedium.filter((pair) => pair.compare)
                          .length ? (
                          <div className="font-medium text-sm text-black">
                            合計{' '}
                            {totalDurationMediumCompare &&
                              formatTimeToJapanese(totalDurationMediumCompare)}
                          </div>
                        ) : (
                          <div>-</div>
                        )}
                      </div>
                      {isLoadingLargeCompare || isLoadingLarge ? (
                        <div className="flex flex-col mt-[50px]">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-12" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="mt-5 flex flex-col gap-4">
                          {progressDataPairsMedium.map((pair, index) => {
                            return (
                              <div key={index}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-40">
                                    {pair.main
                                      ? pair.main.label
                                      : pair.compare?.label || ''}
                                  </span>
                                  <span className="text-sm font-medium truncate max-w-24">
                                    {formatTimeToJapanese(
                                      totalDurationsForStatistic([
                                        pair.main?.duration || '00:00:00',
                                        pair.compare?.duration || '00:00:00',
                                      ]),
                                    )}
                                  </span>
                                </div>
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.LARGE,
                                      false,
                                    );
                                  }}
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
                                      data.value !== '未設定' &&
                                      data.value != selectedMedium?.value
                                    ) {
                                      const select = mediumOptions.find(
                                        (item) => item.value === data.value,
                                      );

                                      if (select) {
                                        handleSelectMedium(select);
                                      }
                                    }
                                  }}
                                  id={pair.main ? pair.main.id : 0}
                                  label={pair.main ? pair.main.label : ''}
                                  value={pair.main ? pair.main.value : 0}
                                  color={pair.main ? pair.main.color : ''}
                                  duration={
                                    pair.main ? String(pair.main.duration) : ''
                                  }
                                  optionData={
                                    pair.main ? pair.main.optionData : []
                                  }
                                  mergedItems={
                                    pair.main ? pair.main.mergedItems : []
                                  }
                                  showInfo={false}
                                  startDate={startDate}
                                  endDate={endDate}
                                />
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.LARGE,
                                      true,
                                    );
                                  }}
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
                                      data.value !== '未設定' &&
                                      data.value != selectedMedium?.value
                                    ) {
                                      const select = mediumOptions.find(
                                        (item) => item.value === data.value,
                                      );

                                      if (select) {
                                        handleSelectMedium(select);
                                      }
                                    }
                                  }}
                                  id={pair.compare ? pair.compare.id : 0}
                                  label={pair.compare ? pair.compare.label : ''}
                                  value={pair.compare ? pair.compare.value : 0}
                                  color={pair.compare ? pair.compare.color : ''}
                                  duration={
                                    pair.compare
                                      ? String(pair.compare.duration)
                                      : ''
                                  }
                                  optionData={
                                    pair.compare ? pair.compare.optionData : []
                                  }
                                  mergedItems={
                                    pair.compare ? pair.compare.mergedItems : []
                                  }
                                  showInfo={false}
                                  startDateCompare={startDateCompare}
                                  endDateCompare={endDateCompare}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="relative w-[18px] top-[6px]">
                      <ImageRound
                        className={`w-[18px] h-6 `}
                        src="/icons/drawer-blue.svg"
                        name="icon chevron right"
                      />
                    </div>
                  </div>
                  {/* Column Chart 3 */}
                  <div className="w-[300px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                      小カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="中カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={mediumOptions}
                        selectedOption={selectedMedium || undefined}
                        onChange={(data) => handleSelectMedium(data)}
                        disabled={!selectedLarge}
                      />
                      <div className={`mt-[14px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                            基準
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                            <p>
                              {startDate && formatShowStatisticTask(startDate)}
                            </p>
                            ~
                            <p>{endDate && formatShowStatisticTask(endDate)}</p>
                          </div>
                        </div>
                        {progressDataPairsSmall.filter((pair) => pair.main)
                          .length ? (
                          <div className="font-medium text-sm text-black ">
                            合計{' '}
                            {totalDurationSmall &&
                              formatTimeToJapanese(totalDurationSmall)}
                          </div>
                        ) : (
                          <div>-</div>
                        )}
                      </div>

                      <div className={`mt-[10px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                            比較
                          </p>
                          <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                            <p>
                              {startDateCompare &&
                                formatShowStatisticTask(startDateCompare)}
                            </p>
                            ~
                            <p>
                              {endDateCompare &&
                                formatShowStatisticTask(endDateCompare)}
                            </p>
                          </div>
                        </div>
                        {progressDataPairsSmall.filter((pair) => pair.compare)
                          .length ? (
                          <div className="font-medium text-sm text-black">
                            合計{' '}
                            {totalDurationSmallCompare &&
                              formatTimeToJapanese(totalDurationSmallCompare)}
                          </div>
                        ) : (
                          <div>-</div>
                        )}
                      </div>
                      {isLoadingMediumCompare || isLoadingMedium ? (
                        <div className="flex flex-col mt-[50px]">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-12" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="mt-5 flex flex-col gap-4">
                          {progressDataPairsSmall.map((pair, index) => {
                            return (
                              <div key={index}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-40">
                                    {pair.main
                                      ? pair.main.label
                                      : pair.compare?.label || ''}
                                  </span>
                                  <span className="text-sm font-medium truncate max-w-24">
                                    {formatTimeToJapanese(
                                      totalDurationsForStatistic([
                                        pair.main?.duration || '00:00:00',
                                        pair.compare?.duration || '00:00:00',
                                      ]),
                                    )}
                                  </span>
                                </div>
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.MEDIUM,
                                      false,
                                    );
                                  }}
                                  id={pair.main ? pair.main.id : 0}
                                  label={pair.main ? pair.main.label : ''}
                                  value={pair.main ? pair.main.value : 0}
                                  color={pair.main ? pair.main.color : ''}
                                  duration={
                                    pair.main ? String(pair.main.duration) : ''
                                  }
                                  optionData={
                                    pair.main ? pair.main.optionData : []
                                  }
                                  mergedItems={
                                    pair.main ? pair.main.mergedItems : []
                                  }
                                  showInfo={false}
                                  startDate={startDate}
                                  endDate={endDate}
                                />
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.MEDIUM,
                                      true,
                                    );
                                  }}
                                  id={pair.compare ? pair.compare.id : 0}
                                  label={pair.compare ? pair.compare.label : ''}
                                  value={pair.compare ? pair.compare.value : 0}
                                  color={pair.compare ? pair.compare.color : ''}
                                  duration={
                                    pair.compare
                                      ? String(pair.compare.duration)
                                      : ''
                                  }
                                  optionData={
                                    pair.compare ? pair.compare.optionData : []
                                  }
                                  mergedItems={
                                    pair.compare ? pair.compare.mergedItems : []
                                  }
                                  showInfo={false}
                                  startDateCompare={startDateCompare}
                                  endDateCompare={endDateCompare}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {isShowModal && (
          <ListTaskDetailStatisticModal
            open={isShowModal}
            startDate={startDate}
            endDate={endDate}
            statisticCategoryList={statisticCategoryList}
            selectedLarge={selectedLarge}
            selectedMedium={selectedMedium}
            selectedSmall={selectedSmall}
            detailCategory={detailCategory}
            selectedOrganization={selectedOrganization}
            onClose={() => {
              setIsShowModal(false);
            }}
            selectedTags={selectedTags}
            handleScroll={handleScroll}
          />
        )}
        {isShowModalCompare && (
          <ListTaskDetailStatisticModal
            open={isShowModalCompare}
            selectedTags={selectedTags}
            startDate={startDateCompare}
            statisticCategoryList={statisticCategoryList}
            endDate={endDateCompare}
            selectedLarge={selectedLarge}
            selectedMedium={selectedMedium}
            selectedSmall={selectedSmall}
            detailCategory={detailCategoryCompare}
            selectedOrganization={selectedOrganization}
            onClose={() => {
              setIsShowModalCompare(false);
            }}
            handleScroll={handleScrollCompare}
          />
        )}
      </>
    );
  },
);

export default AllocationCategoryCompare;
