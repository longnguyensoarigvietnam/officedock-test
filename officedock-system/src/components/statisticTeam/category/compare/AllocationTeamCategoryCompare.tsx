import React, { Fragment, memo, useContext, useEffect, useState } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ActionFilterStatisticTeam from '@components/modals/ActionFilterTeamStatistic';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import ProgressBarTeamStatisticCompare from './ProgressBarTeamStatistic';

import { EventWorkCategory } from '@constants/enums';

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

type Props = {
  startDate: Date;
  endDate: Date | null;
  startDateCompare: Date;
  endDateCompare: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  statisticCategoryListTeamCompare: StatisticsCategories | undefined;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
  removeUser: (selected: OptionDropdownType) => void;
};

type ProgressDataType = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataType[];
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

export function buildProgressDataCompareWithMergedOthers({
  baseData,
  compareData,
  threshold = 10,
  colorData,
}: {
  baseData: StatisticCategoryInfo[];
  compareData: StatisticCategoryInfo[];
  threshold?: number;
  colorData?: string;
}): ProgressDataCompareItem[] {
  const isBaseEmpty = baseData.length === 0;
  const isCompareEmpty = compareData.length === 0;

  const mergedBase = transformAndMergeProgressData({
    data: isBaseEmpty
      ? compareData.map((item) => ({
          ...item,
          percent: 0,
          duration: '00:00:00',
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
          duration: '00:00:00',
          users: [],
        }))
      : compareData,
    threshold,
    colorData,
  });

  // Collect all IDs from both lists
  const allIds = new Set<number>();
  mergedBase.forEach((item) => allIds.add(item.id));
  mergedCompare.forEach((item) => allIds.add(item.id));

  // Map data with label assignment logic from the other side if missing
  const result: ProgressDataCompareItem[] = Array.from(allIds).map((id) => {
    const item = mergedBase.find((b) => b.id === id);
    const itemCompare = mergedCompare.find((c) => c.id === id);

    const finalItem: ProgressDataType = item ?? {
      id,
      label: itemCompare?.label ?? '',
      value: 0,
      color: '#ccc',
      duration: '00:00:00',
      optionData: [],
    };

    const finalItemCompare: ProgressDataType = itemCompare ?? {
      id,
      label: item?.label ?? '',
      value: 0,
      color: '#ccc',
      duration: '00:00:00',
      optionData: [],
    };

    return {
      item: finalItem,
      itemCompare: finalItemCompare,
    };
  });
  result.sort((a, b) => {
    const isAOther = a.item.id === -1;
    const isBOther = b.item.id === -1;

    if (isAOther && !isBOther) return 1;
    if (!isAOther && isBOther) return -1;
    return 0;
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
    removeTag,
    removeUser,
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
      listMemberTeam,
      tagsOptions,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      isLoadingLargeCompare,
      isLoadingMediumCompare,
      isLoadingOrganizationCompare,
      firstThreeUser,
      allLabelUser,
      allLabelTag,
      firstThreeTag,
      remainingCountUser,
      remainingCountTag,
      setTotalDurationTask,
    } = useContext(StatisticTeamStateContext);

    useEffect(() => {
      if (statisticTeamCategoryList && statisticCategoryListTeamCompare) {
        const compareResult = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTeamCategoryList.largeCategories || [],
          compareData: statisticCategoryListTeamCompare.largeCategories || [],
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
    ]);

    const handleClickTooltip = ({
      id,
      userId,
      duration,
      type,
      isCompare,
      userDuration,
    }: {
      id: number;
      userId: number;
      duration: string;
      type: string;
      isCompare?: boolean;
      userDuration: string;
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
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 h-6 relative">
                  {/* Filter option modal */}
                  <Popover className="relative">
                    {() => (
                      <>
                        <div className="flex items-center gap-2 relative top-[5px]">
                          <PopoverButton
                            onClick={() =>
                              setIsOpenModalFilter(!isOpenModalFilter)
                            }
                            className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                            <ImageRound
                              src="/icons/filter.svg"
                              name="Filter icon"
                              className="w-[14px] h-[14px]"
                            />
                          </PopoverButton>
                        </div>
                        <Transition
                          as={Fragment}
                          show={isOpenModalFilter}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1">
                          <PopoverPanel className="absolute left-[30px] top-[-5px] z-[1] w-[400px] transform">
                            <ActionFilterStatisticTeam
                              tagsOptions={tagsOptions}
                              handleClose={() => setIsOpenModalFilter(false)}
                              listMemberTeam={listMemberTeam}
                            />
                          </PopoverPanel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </div>
                <div className=" flex-grow flex-shrink-0">
                  <div className="flex gap-2 flex-wrap  flex-shrink-0 ">
                    <>
                      {firstThreeUser.map((item, index) => {
                        return (
                          <div
                            key={item.value}
                            className="flex gap-[6px] items-center">
                            {index === 0 && (
                              <ImageRound
                                src={`/icons/user-white.svg`}
                                name="close"
                                className="w-fit h-fit cursor-pointer"
                              />
                            )}
                            <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                              <span className="min-w-[32px] max-w-[118px]  truncate">
                                {item.label}
                              </span>
                              <ImageRound
                                onClick={() => {
                                  removeUser(item);
                                }}
                                src={`/icons/close-white.svg`}
                                name="close"
                                className="w-fit h-fit cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                      {allLabelUser.length > 3 && (
                        <p className=" h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                          +{remainingCountUser}
                        </p>
                      )}
                    </>
                    <>
                      {firstThreeTag.map((item, index) => {
                        return (
                          <div
                            key={item.value}
                            className="flex gap-[6px] items-center">
                            {index === 0 && (
                              <ImageRound
                                src={`/icons/tag-white.svg`}
                                name="close"
                                className="w-fit h-fit cursor-pointer"
                              />
                            )}
                            <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                              <span className="min-w-[32px] max-w-[118px]  truncate">
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
                          </div>
                        );
                      })}
                      {allLabelTag.length > 3 && (
                        <p className="pr-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                          +{remainingCountTag}
                        </p>
                      )}
                    </>
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
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  duration: string;
                                  isCompare?: boolean;
                                  userDuration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.ALL,
                                    isCompare,
                                    userDuration,
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
                        disabled={!selectedOrganization}
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
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    duration: string;
                                    isCompare?: boolean;
                                    userDuration: string;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      duration,
                                      type: EventWorkCategory.LARGE,
                                      isCompare,
                                      userDuration,
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
                        disabled={!selectedLarge}
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
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  duration: string;
                                  isCompare?: boolean;
                                  userDuration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.MEDIUM,
                                    isCompare,
                                    userDuration,
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
