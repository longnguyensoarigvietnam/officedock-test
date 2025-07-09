import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import ProgressBarTeamStatisticCompare from './ProgressBarTeamStatistic';

import { EventWorkCategory } from '@constants/enums';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT, NO_SETTING } from '@constants';

import {
  StatisticCategoryInfo,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  sumDurationsChart,
} from '@utils/date';
import { lightenColor } from '@utils';

import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import FilterTeamStatistic from '../filter/FilterTeamStatistic';

type Props = {
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  statisticCategoryListTeamCompare: StatisticsCategories | undefined;
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
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataType[];
  organizationId?: string;
};
type ProgressDataCompareItem = {
  item: ProgressDataType;
  itemCompare?: ProgressDataType;
};

function transformAndMergeProgressData({
  data,
  mergeLabel = 'その他',
  mergeColor = '#83919E',
  threshold = 10,
  colorData,
}: {
  data: StatisticCategoryInfo[];
  mergeLabel?: string;
  mergeColor?: string;
  threshold?: number;
  colorData?: string;
}): ProgressDataType[] {
  const progressData: ProgressDataType[] = data.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.percent,
    color:
      item.categoryColor ||
      (colorData && lightenColor(colorData, item.percent)) ||
      '',
    duration: item.duration,
    optionData: item.users || [],
    organizationId: String(item.organizationId),
  }));

  const mergedItems = progressData.filter((item) => item.value < threshold);
  const mainItems = progressData.filter((item) => item.value >= threshold);

  if (mergedItems.length === 0) return mainItems;

  const totalMergedPercent = mergedItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const durations = mergedItems.map((item) => item.duration);

  const totalDuration = sumDurationsChart(durations);

  const mergedItem: ProgressDataType = {
    id: -1,
    label: mergeLabel,
    value: totalMergedPercent,
    color: mergeColor,
    duration: totalDuration,
    optionData: mergedItems.flatMap((item) => item.optionData),
    mergedItems,
  };

  return [...mainItems, mergedItem];
}
const buildKey = (item: ProgressDataType, isAllTeam: boolean) =>
  isAllTeam ? `${item.organizationId}-${item.id}` : `${item.id}`;

const parseKey = (key: string, isAllTeam: boolean) => {
  if (!isAllTeam) return { id: key, orgId: undefined };
  const [orgId, idStr] = key.split('-', 2);
  return { id: idStr, orgId };
};

export function buildProgressDataCompareWithMergedOthers({
  baseData,
  compareData,
  threshold = 10,
  colorData,
  isAllTeam = false,
}: {
  baseData: StatisticCategoryInfo[];
  compareData: StatisticCategoryInfo[];
  threshold?: number;
  colorData?: string;
  isAllTeam?: boolean;
}): ProgressDataCompareItem[] {
  const isBaseEmpty = baseData.length === 0;
  const isCompareEmpty = compareData.length === 0;

  const mergedBase = transformAndMergeProgressData({
    data: isBaseEmpty
      ? compareData.map((item) => ({
          ...item,
          percent: 0,
          duration: DEFAULT_TIME_TEXT,
          users: [],
        }))
      : baseData,
    threshold,
    colorData,
  });

  const mergedCompare = transformAndMergeProgressData({
    data: isCompareEmpty
      ? baseData.map((item) => ({
          ...item,
          percent: 0,
          duration: DEFAULT_TIME_TEXT,
          users: [],
        }))
      : compareData,
    threshold,
    colorData,
  });

  const allKeys = new Set<string>();
  const collectKeys = (arr: ProgressDataType[]) => {
    arr.forEach((item) => {
      allKeys.add(buildKey(item, isAllTeam));
      if (item.id === -1 && item.mergedItems) {
        item.mergedItems.forEach((sub) =>
          allKeys.add(buildKey(sub, isAllTeam)),
        );
      }
    });
  };
  collectKeys(mergedBase);
  collectKeys(mergedCompare);

  const findByKey = (
    key: string,
    arr: ProgressDataType[],
  ): ProgressDataType | undefined => {
    const { id, orgId } = parseKey(key, isAllTeam);
    const matcher = (el: ProgressDataType) =>
      String(el.id) == id && (!isAllTeam || el.organizationId == orgId);

    return (
      arr.find(matcher) ||
      arr
        .find((d) => d.id === -1 && d.mergedItems?.some(matcher))
        ?.mergedItems?.find(matcher)
    );
  };

  const result: ProgressDataCompareItem[] = Array.from(allKeys)
    .map((key) => {
      const baseItem = findByKey(key, mergedBase);
      const cmpItem = findByKey(key, mergedCompare);
      const { id, orgId } = parseKey(key, isAllTeam);

      const empty: ProgressDataType = {
        id,
        label: baseItem?.label ?? cmpItem?.label ?? '',
        value: 0,
        color: '#ccc',
        duration: DEFAULT_TIME_TEXT,
        optionData: [],
        organizationId: orgId,
      };

      return {
        item: baseItem ?? empty,
        itemCompare: cmpItem ?? empty,
      };
    })
    .filter(({ item, itemCompare }) => item.value > 0 || itemCompare.value > 0);

  result.sort((a, b) => {
    const aOther = a.item.id === -1;
    const bOther = b.item.id === -1;
    return aOther === bOther ? 0 : aOther ? 1 : -1;
  });

  return result;
}

const AllocationTeamCategoryCompare = memo(
  ({
    startDate,
    endDate,
    startDateCompare,
    endDateCompare,
    statisticTeamCategoryList,
    statisticCategoryListTeamCompare,
    handleSelectOrganization,
    handleSelectLarge,
    handleSelectMedium,
    handleSelectSmall,
  }: Props) => {
    const [isExtendData, setIsExtendData] = useState(true);
    const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
    const [isShowModal, setIsShowModal] = useState(false);
    const [isModalCompare, setIsModalCompare] = useState(false);

    const [detailCategory, setDetailCategory] = useState<{
      id: number | null;
      userId: number;
      type: string;
      totalDuration: string;
      userDuration: string;
      totalTask?: string;
      organizationId?: string;
    } | null>(null);

    const [progressDataLarge, setProgressDataLarge] = useState<
      ProgressDataCompareItem[]
    >([]);

    const [progressDataMedium, setProgressDataMedium] = useState<
      ProgressDataCompareItem[]
    >([]);
    const [progressDataSmall, setProgressDataSmall] = useState<
      ProgressDataCompareItem[]
    >([]);
    const {
      isDisableCalendar,
      isHasLoading,
      orderingOptions,
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
      selectedSmall,
      selectedOrganization,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      isLoadingLargeCompare,
      isLoadingMediumCompare,
      isLoadingOrganizationCompare,
      setTotalDurationTask,
    } = useContext(StatisticTeamStateContext);

    useEffect(() => {
      if (statisticTeamCategoryList && statisticCategoryListTeamCompare) {
        const compareResult = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTeamCategoryList.largeCategories || [],
          compareData: statisticCategoryListTeamCompare.largeCategories || [],
          isAllTeam: selectedOrganization?.label === ALL_TEAM_STATISTIC,
        });
        const color =
          statisticTeamCategoryList.largeCategories?.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor ||
          statisticCategoryListTeamCompare.largeCategories?.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;
        const compareResultMedium = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTeamCategoryList?.mediumCategories || [],
          compareData: statisticCategoryListTeamCompare?.mediumCategories || [],
          colorData: color,
        });

        const compareResultSmall = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTeamCategoryList?.smallCategories || [],
          compareData: statisticCategoryListTeamCompare?.smallCategories || [],
          colorData: color,
        });

        setProgressDataLarge(compareResult);
        setProgressDataMedium(compareResultMedium);
        setProgressDataSmall(compareResultSmall);
      }
    }, [
      statisticTeamCategoryList,
      statisticCategoryListTeamCompare,
      selectedLarge?.value,
      selectedOrganization?.label,
    ]);

    const handleClickTooltip = ({
      id,
      userId,
      duration,
      type,
      isCompare,
      userDuration,
      totalTask,
      organizationId,
    }: {
      id: number;
      userId: number;
      duration: string;
      type: string;
      isCompare?: boolean;
      userDuration: string;
      totalTask?: string;
      organizationId?: string;
    }) => {
      if (isCompare) {
        setIsModalCompare(true);
      } else {
        setIsModalCompare(false);
      }
      setDetailCategory({
        id: id,
        userId: userId,
        type: type,
        totalDuration: duration,
        userDuration,
        totalTask,
        organizationId,
      });

      setTimeout(() => {
        setIsShowModal(true);
      }, 1000);
    };

    const handleScroll = () => {
      if (detailCategory?.type === EventWorkCategory.ALL) {
        const item = largeOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectLarge(item);

        setTotalDurationTask(
          detailCategory.totalTask
            ? detailCategory.totalTask
            : detailCategory.totalDuration,
        );
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
        setTotalDurationTask(detailCategory.totalDuration);
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
        setTotalDurationTask(detailCategory.totalDuration);
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
      setDetailCategory(null);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
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
            <div className="flex items-center gap-x-0">
              <div className="flex items-center gap-[10px] ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                  name="statistic-active icon"
                  src={`/icons/statistic-active.svg`}
                />
                <span className="text-black w-[156px] flex-shrink-0 font-semibold text-[18px] relative top-[2px]">
                  カテゴリーの割合
                </span>
              </div>
              {/* Filter modal */}
              <FilterTeamStatistic
                open={isOpenModalFilter}
                onOpen={() => setIsOpenModalFilter(!isOpenModalFilter)}
              />
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
                        disabled={isHasLoading}
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={listOptionsOrganization}
                        selectedOption={selectedOrganization || undefined}
                        onChange={(data) => handleSelectOrganization(data)}
                      />

                      {isLoadingOrganization || isLoadingOrganizationCompare ? (
                        <div className="flex flex-col gap-8 mt-5">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="mt-8 my-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-[6px]">
                                <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                                  基準
                                </p>
                                <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                                  <p>
                                    {startDate &&
                                      formatShowStatisticTask(startDate)}
                                  </p>
                                  ~
                                  <p>
                                    {endDate &&
                                      formatShowStatisticTask(endDate)}
                                  </p>
                                </div>
                              </div>
                              <div className="font-medium text-sm">
                                合計
                                {totalDurationLarge &&
                                progressDataLarge.length > 0
                                  ? formatTimeToJapanese(totalDurationLarge)
                                  : '-'}
                              </div>
                            </div>
                            <div
                              className={`mt-[10px] flex justify-between items-center`}>
                              <div className="flex items-center gap-[6px]">
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
                              <div className="font-medium text-sm">
                                合計
                                {totalDurationLargeCompare &&
                                  formatTimeToJapanese(
                                    totalDurationLargeCompare,
                                  )}
                              </div>
                            </div>
                          </div>
                          {progressDataLarge.length > 0 &&
                            progressDataLarge.map((item, index) => (
                              <ProgressBarTeamStatisticCompare
                                key={index}
                                startDate={startDate}
                                endDate={endDate}
                                startDateCompare={startDateCompare}
                                endDateCompare={endDateCompare}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  categoryId,
                                  duration,
                                  isCompare,
                                  userDuration,
                                  totalTask,
                                  organizationId,
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  duration: string;
                                  isCompare?: boolean;
                                  userDuration: string;
                                  totalTask?: string;
                                  organizationId?: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.ALL,
                                    isCompare,
                                    userDuration,
                                    totalTask,
                                    organizationId,
                                  });
                                }}
                                handleClickChart={(
                                  data: OptionDropdownType,
                                ) => {
                                  if (
                                    data.value &&
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
                                {...item}
                              />
                            ))}
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
                        disabled={!selectedOrganization || isHasLoading}
                      />

                      {isLoadingLarge || isLoadingLargeCompare ? (
                        <div className="flex flex-col gap-8 mt-5">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="mt-8 my-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-[6px]">
                                <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                                  基準
                                </p>
                                <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                                  <p>
                                    {startDate &&
                                      formatShowStatisticTask(startDate)}
                                  </p>
                                  ~
                                  <p>
                                    {endDate &&
                                      formatShowStatisticTask(endDate)}
                                  </p>
                                </div>
                              </div>
                              {progressDataMedium.length > 0 ? (
                                <div className="font-medium text-sm">
                                  合計
                                  {totalDurationMedium &&
                                    formatTimeToJapanese(totalDurationMedium)}
                                </div>
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                            <div
                              className={`mt-[10px] flex justify-between items-center`}>
                              <div className="flex items-center gap-[6px]">
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
                              {progressDataMedium.length > 0 ? (
                                <div className="font-medium text-sm">
                                  合計
                                  {totalDurationMediumCompare &&
                                    formatTimeToJapanese(
                                      totalDurationMediumCompare,
                                    )}
                                </div>
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                          </div>
                          {progressDataMedium.length > 0 &&
                            progressDataMedium.map((item, index) => (
                              <>
                                <ProgressBarTeamStatisticCompare
                                  key={index}
                                  startDate={startDate}
                                  endDate={endDate}
                                  startDateCompare={startDateCompare}
                                  endDateCompare={endDateCompare}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={({
                                    userId,
                                    categoryId,
                                    duration,
                                    isCompare,
                                    userDuration,
                                    totalTask,
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    duration: string;
                                    isCompare?: boolean;
                                    userDuration: string;
                                    totalTask?: string;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      duration,
                                      type: EventWorkCategory.LARGE,
                                      isCompare,
                                      userDuration,
                                      totalTask,
                                    });
                                  }}
                                  handleClickChart={(
                                    data: OptionDropdownType,
                                  ) => {
                                    if (
                                      data.value &&
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
                                  {...item}
                                />
                              </>
                            ))}
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
                        disabled={
                          !selectedLarge || isHasLoading || isDisableCalendar
                        }
                      />

                      {isLoadingMedium || isLoadingMediumCompare ? (
                        <div className="flex flex-col gap-8 mt-5">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="mt-8 my-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-[6px]">
                                <p className="bg-[#EBF1F7]  w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                                  基準
                                </p>
                                <div className="text-black text-xs font-normal flex items-center gap-[2px]">
                                  <p>
                                    {startDate &&
                                      formatShowStatisticTask(startDate)}
                                  </p>
                                  ~
                                  <p>
                                    {endDate &&
                                      formatShowStatisticTask(endDate)}
                                  </p>
                                </div>
                              </div>
                              {progressDataSmall.length > 0 ? (
                                <div className="font-medium text-sm">
                                  合計
                                  {totalDurationSmall &&
                                    formatTimeToJapanese(totalDurationSmall)}
                                </div>
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                            <div
                              className={`mt-[10px] flex justify-between items-center`}>
                              <div className="flex items-center gap-[6px]">
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
                              {progressDataSmall.length > 0 ? (
                                <div className="font-medium text-sm">
                                  合計
                                  {totalDurationSmallCompare &&
                                    formatTimeToJapanese(
                                      totalDurationSmallCompare,
                                    )}
                                </div>
                              ) : (
                                <div>-</div>
                              )}
                            </div>
                          </div>
                          {progressDataSmall.length > 0 &&
                            progressDataSmall.map((item, index) => (
                              <ProgressBarTeamStatisticCompare
                                key={index}
                                startDate={startDate}
                                endDate={endDate}
                                startDateCompare={startDateCompare}
                                endDateCompare={endDateCompare}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  categoryId,
                                  duration,
                                  isCompare,
                                  userDuration,
                                  totalTask,
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  duration: string;
                                  isCompare?: boolean;
                                  userDuration: string;
                                  totalTask?: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.MEDIUM,
                                    isCompare,
                                    userDuration,
                                    totalTask,
                                  });
                                }}
                                {...item}
                              />
                            ))}
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
            selectedTags={
              orderingOptions && orderingOptions?.tag_ids.length > 0
                ? orderingOptions?.tag_ids
                : []
            }
            selectedLarge={selectedLarge}
            selectedMedium={selectedMedium}
            selectedSmall={selectedSmall}
            startDate={isModalCompare ? startDateCompare : startDate}
            endDate={isModalCompare ? endDateCompare : endDate}
            statisticCategoryList={
              isModalCompare
                ? statisticCategoryListTeamCompare
                : statisticTeamCategoryList
            }
            detailCategory={detailCategory}
            selectedOrganization={selectedOrganization}
            onClose={() => {
              setIsShowModal(false);
              setDetailCategory(null);
            }}
            handleScroll={handleScroll}
          />
        )}
      </>
    );
  },
);

export default AllocationTeamCategoryCompare;
