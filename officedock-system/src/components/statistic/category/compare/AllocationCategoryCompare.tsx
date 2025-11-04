import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';

import {
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  totalDurationsForStatistic,
} from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';

import {
  ALL_TEAM_STATISTIC,
  DEFAULT_TIME_TEXT,
  NO_SETTING,
  SUB_TEAMS,
} from '@constants';
import { EventWorkCategory } from '@constants/enums';

import { StatisticStateContext } from '@providers/StatisticProvider';

import ProgressBarStatistic from '../ProgressBarStatistic';
import FilterStatistic from '../filter/FilterStatistic';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticCategoryCompareList: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  statisticAllTeamCategoryCompareList: StatisticsAllTeams | undefined;
  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

type ProgressDataType = {
  id: number | string;
  label: string;
  value: number;
  color: string;
  duration: string;
  organizationId?: string;
  dataOrganizationId?: string[];
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
    statisticAllTeamCategoryList,
    statisticAllTeamCategoryCompareList,
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
      organizationId?: string;
    } | null>(null);
    const [detailCategoryCompare, setDetailCategoryCompare] = useState<{
      id: number | null;
      type: string;
      organizationId?: string;
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
      isDisableCalendar,
      isHasLoading,
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
      isLoadingLargeCompare,
      isLoadingMediumCompare,
      isLoadingOrganizationCompare,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
    } = useContext(StatisticStateContext);

    useEffect(() => {
      if (
        statisticCategoryList &&
        statisticCategoryCompareList &&
        selectedOrganization?.value != ALL_TEAM_STATISTIC
      ) {
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
              organizationId: String(item.organizationId),

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
              mergedMap.set(`${item.categoryId}-${item.organizationId}`, {
                main: mainData,
                compare: null,
              });
            }
          });

          // Add compare categories, updating existing ones or creating new entries
          compareCategories.forEach((compareItem) => {
            const compareData: ProgressDataType = {
              id: compareItem.categoryId,
              label: compareItem.categoryName,
              value: compareItem.percent,
              organizationId: String(compareItem.organizationId),

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
            } else if (
              mergedMap.has(
                `${compareItem.categoryId}-${compareItem.organizationId}`,
              )
            ) {
              mergedMap.get(
                `${compareItem.categoryId}-${compareItem.organizationId}`,
              )!.compare = compareData;
            } else {
              mergedMap.set(
                `${compareItem.categoryId}-${compareItem.organizationId}`,
                {
                  main: null,
                  compare: compareData,
                },
              );
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
                        id: item.id as number,
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
                        id: item.id as number,
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      statisticCategoryList,
      statisticCategoryCompareList,
      selectedOrganization?.value,
    ]);

    useEffect(() => {
      if (
        statisticAllTeamCategoryList &&
        statisticAllTeamCategoryCompareList &&
        selectedOrganization?.value == ALL_TEAM_STATISTIC
      ) {
        const mergeCategories = (
          mainCategories: StatisticAllTeamInfo[],
          compareCategories: StatisticAllTeamInfo[],
        ) => {
          const mergedMap = new Map<
            number | string,
            {
              main: ProgressDataType | null;
              compare: ProgressDataType | null;
            }
          >();

          // Add main categories first
          mainCategories.forEach((item) => {
            const mainData: ProgressDataType = {
              id: item.organizationId,
              label: item?.organizationName || '',
              value: item.percent,
              organizationId: String(item.organizationId),

              color: item.color || getRandomColor(),
              duration: item.duration,
              optionData:
                item.organizationId == SUB_TEAMS
                  ? item?.subTeams
                      ?.slice(0, 3)
                      .map((team) => team?.organizationName || '') || []
                  : item?.data
                      ?.slice(0, 3)
                      .map((category) => category?.categoryName || '') || [],
            };

            mergedMap.set(`${item.organizationId}`, {
              main: mainData,
              compare: null,
            });
          });

          // Add compare categories, updating existing ones or creating new entries
          compareCategories.forEach((compareItem) => {
            const compareData: ProgressDataType = {
              id: compareItem.organizationId,
              label: compareItem?.organizationName || '',
              value: compareItem.percent,
              organizationId: String(compareItem.organizationId),

              color: compareItem.color || getRandomColor(),
              duration: compareItem.duration,
              optionData:
                compareItem.organizationId == SUB_TEAMS
                  ? compareItem?.subTeams
                      ?.slice(0, 3)
                      .map((team) => team?.organizationName || '') || []
                  : compareItem?.data
                      ?.slice(0, 3)
                      .map((category) => category?.categoryName || '') || [],
            };

            if (mergedMap.has(`${compareItem.organizationId}`)) {
              mergedMap.get(`${compareItem.organizationId}`)!.compare =
                compareData;
            } else {
              mergedMap.set(`${compareItem.organizationId}`, {
                main: null,
                compare: compareData,
              });
            }
          });

          return Array.from(mergedMap.values());
        };

        const largePairs = mergeCategories(
          statisticAllTeamCategoryList.largeCategories || [],
          statisticAllTeamCategoryCompareList.largeCategories || [],
        );

        setProgressDataPairsLarge(largePairs);
        setProgressDataPairsMedium([]);
        setProgressDataPairsSmall([]);
      }
    }, [
      statisticAllTeamCategoryList,
      statisticAllTeamCategoryCompareList,
      selectedOrganization?.value,
    ]);

    const handleClickTooltip = (
      id: number | null,
      type: string,
      isCompare: boolean,
      organizationId?: string,
    ) => {
      if (isCompare) {
        if (
          isLoadingLargeCompare ||
          isLoadingMediumCompare ||
          isLoadingOrganizationCompare
        )
          return;
        setDetailCategoryCompare({
          id: id,
          type: type,
          organizationId,
        });

        setIsShowModalCompare(true);
      } else {
        if (isLoadingLarge || isLoadingMedium || isLoadingOrganization) return;

        setDetailCategory({
          id: id,
          type: type,
          organizationId,
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

        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectLarge({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.LARGE) {
        const item = mediumOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectMedium(item);
        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectMedium({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.MEDIUM) {
        const item = smallOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectSmall(item);
        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectSmall({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.SMALL) {
        const item = smallOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectSmall(item);
        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectSmall({
            label: NO_SETTING,
            value: NO_SETTING,
          });
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

        if (String(detailCategoryCompare?.id) == NO_SETTING) {
          handleSelectLarge({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategoryCompare?.type === EventWorkCategory.LARGE) {
        const item = mediumOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectMedium(item);

        if (String(detailCategoryCompare?.id) == NO_SETTING) {
          handleSelectMedium({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }

      if (detailCategoryCompare?.type === EventWorkCategory.MEDIUM) {
        const item = smallOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectSmall(item);

        if (String(detailCategoryCompare?.id) == NO_SETTING) {
          handleSelectSmall({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategoryCompare?.type === EventWorkCategory.SMALL) {
        const item = smallOptions.find(
          (item) => item.value === detailCategoryCompare?.id,
        );
        item && handleSelectSmall(item);
        if (String(detailCategoryCompare?.id) == NO_SETTING) {
          handleSelectSmall({
            label: NO_SETTING,
            value: NO_SETTING,
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
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
          {/* Header & sort */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-x-5">
              <div className="flex items-center gap-[10px] w-fit flex-shrink-0">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer`}
                  name="statistic-progress-bar icon"
                  src={`/icons/statistic-progress-bar.svg`}
                />
                <span className="text-black w-fit flex-shrink-0 font-semibold text-[18px]">
                  各カテゴリーの時間配分
                </span>
              </div>
              {/* Filter */}
              <FilterStatistic />
            </div>
            <ImageRound
              src="/icons/extend-calendar.svg"
              name="Extend calendar"
              className={`!w-[14px] !h-[14px] hover:cursor-pointer ${
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
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                      大カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        disabled={isHasLoading}
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
                          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
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
                          <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
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
                                      pair.main?.duration || DEFAULT_TIME_TEXT,
                                    )}
                                  </span>
                                </div>
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(
                                    id: number | null,
                                    organizationId?: string,
                                  ) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.ALL,
                                      false,
                                      organizationId,
                                    );
                                  }}
                                  isAllTeam={
                                    selectedOrganization?.value ==
                                    ALL_TEAM_STATISTIC
                                  }
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
                                      data.value != selectedLarge?.value
                                    ) {
                                      handleSelectLarge(data);
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
                                  organizationId={
                                    pair.main?.organizationId ||
                                    pair.compare?.organizationId
                                  }
                                />
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(
                                    id: number | null,
                                    organizationId?: string,
                                  ) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.ALL,
                                      true,
                                      organizationId,
                                    );
                                  }}
                                  isAllTeam={
                                    selectedOrganization?.value ==
                                    ALL_TEAM_STATISTIC
                                  }
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
                                      data.value != selectedLarge?.value
                                    ) {
                                      handleSelectLarge(data);
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
                                  organizationId={
                                    pair.main?.organizationId ||
                                    pair.compare?.organizationId
                                  }
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
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
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
                        disabled={
                          selectedOrganization?.value == '' || isHasLoading
                        }
                      />
                      <div className={`mt-[14px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
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
                          <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
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
                                      pair.main?.duration || DEFAULT_TIME_TEXT,
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
                                      data.value != selectedMedium?.value
                                    ) {
                                      handleSelectMedium(data);
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
                                      data.value != selectedMedium?.value
                                    ) {
                                      handleSelectMedium(data);
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
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
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
                        disabled={
                          selectedLarge?.value == '' ||
                          isHasLoading ||
                          isDisableCalendar
                        }
                      />
                      <div className={`mt-[14px] flex justify-between`}>
                        <div className="flex items-center">
                          <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-primary rounded-sm text-xs font-medium flex items-center justify-center">
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
                          <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#E95062] rounded-sm text-xs font-medium flex items-center justify-center">
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
                                      pair.main?.duration || DEFAULT_TIME_TEXT,
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
                                  isLast
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
                                  isLast
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
