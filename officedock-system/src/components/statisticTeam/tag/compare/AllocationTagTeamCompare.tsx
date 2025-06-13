import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import {
  StatisticCategoryInfo,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatShowStatisticTask, formatTimeToJapanese } from '@utils/date';
import { lightenColor } from '@utils';

import { EventWorkCategory } from '@constants/enums';

import ProgressBarTeamTagCompare from './ProgressBarTeamTag';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  statisticTagsCompareList: StatisticsCategories | undefined;
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
}: {
  data: StatisticCategoryInfo[];
  mergeLabel?: string;
  mergeColor?: string;
  threshold?: number;
}): ProgressDataType[] {
  const progressData: ProgressDataType[] = data.map((item) => ({
    id: item.tagId as number,
    label: item.tagName || '',
    value: item.percent,
    color: lightenColor('#2E9267' as string, item.percent) || '',
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

  const mergedItem: ProgressDataType = {
    id: -1,
    label: mergeLabel,
    value: totalMergedPercent,
    color: mergeColor,
    duration: '',
    optionData: mergedItems.flatMap((item) => item.optionData),
    mergedItems,
  };

  return [...mainItems, mergedItem];
}

export function buildProgressDataCompareWithMergedOthers({
  baseData,
  compareData,
  threshold = 10,
}: {
  baseData: StatisticCategoryInfo[];
  compareData: StatisticCategoryInfo[];
  threshold?: number;
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
  });

  return mergedBase.map((item) => {
    const matched = mergedCompare.find((c) => c.id === item.id);
    return {
      item,
      itemCompare: matched,
    };
  });
}

const AllocationTagTeamCompare = memo(
  ({
    startDate,
    endDate,
    statisticTagsList,
    startDateCompare,
    endDateCompare,
    statisticTagsCompareList,
    removeTag,
    handleSelectOrganization,
    handleSelectLarge,
    handleSelectMedium,
    handleSelectSmall,
  }: Props) => {
    const [isExtendData, setIsExtendData] = useState(true);
    const [isShowModal, setIsShowModal] = useState(false);
    const [detailCategory, setDetailCategory] = useState<{
      id: number | null;
      userId: number;
      type: string;
      totalDuration: string;
    } | null>(null);

    const [isModalCompare, setIsModalCompare] = useState(false);

    const [progressDataPairsLarge, setProgressDataPairsLarge] = useState<
      ProgressDataCompareItem[]
    >([]);

    const [progressDataPairsMedium, setProgressDataPairsMedium] = useState<
      ProgressDataCompareItem[]
    >([]);

    const [progressDataPairsSmall, setProgressDataPairsSmall] = useState<
      ProgressDataCompareItem[]
    >([]);
    const [progressDataPairsCategory, setProgressDataPairsCategory] = useState<
      ProgressDataCompareItem[]
    >([]);

    const {
      totalDurationLarge,
      totalDurationMedium,
      totalDurationSmall,
      totalDurationCategory,
      totalDurationLargeCompare,
      totalDurationMediumCompare,
      totalDurationSmallCompare,
      totalDurationCategoryCompare,
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
      isLoadingSmall,
      isLoadingSmallCompare,
      setSelectedTags,
    } = useContext(StatisticTeamTagsStateContext);

    useEffect(() => {
      if (statisticTagsList && statisticTagsCompareList) {
        const compareResult = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.largeCategories || [],
          compareData: statisticTagsCompareList.largeCategories || [],
        });
        const compareResultMedium = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.mediumCategories || [],
          compareData: statisticTagsCompareList.mediumCategories || [],
        });
        const compareResultSmall = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.smallCategories || [],
          compareData: statisticTagsCompareList.smallCategories || [],
        });

        const compareResultCategory = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.category || [],
          compareData: statisticTagsCompareList.category || [],
        });

        setProgressDataPairsLarge(compareResult);
        setProgressDataPairsMedium(compareResultMedium);
        setProgressDataPairsSmall(compareResultSmall);
        setProgressDataPairsCategory(compareResultCategory);
      }
    }, [statisticTagsList, statisticTagsCompareList]);

    const handleClickTooltip = ({
      id,
      userId,
      duration,
      type,
      isCompare,
    }: {
      id: number;
      userId: number;
      duration: string;
      type: string;
      isCompare?: boolean;
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
      });

      setTimeout(() => {
        setIsShowModal(true);
      }, 1000);
    };

    const handleScroll = () => {
      const item = largeOptions.find(
        (item) => item.value === detailCategory?.id,
      );
      item && handleSelectLarge(item);
      const element = document.getElementById('task-list-statistic');
      setIsShowModal(false);

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
            <div className="flex items-center gap-x-5">
              <div className="flex items-center gap-[10px] ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                  name="statistic-progress-bar icon"
                  src={`/icons/statistic-progress-bar.svg`}
                />
                <span className="text-black font-semibold text-[18px] relative top-[2px]">
                  カテゴリーごとのタグの時間配分
                </span>
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
                {/* List tags  */}
                <div>
                  <div className="flex justify-between w-full my-8 px-[30px]">
                    <div className="flex items-center gap-2">
                      <div className="w-[240px]">
                        <MultiSelectDropdown
                          options={tagsOptions}
                          placeholder="集計対象のタグを選択"
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
                        <div className="flex gap-2 flex-wrap ">
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
                <div className="flex  justify-between px-[30px] text-sm font-medium">
                  {/* Column Chart 1 */}
                  <div className="w-[220px]">
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
                      <div className={`mt-[14px]`}>
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
                        <div className="font-medium text-sm flex gap-1 mt-[10px]">
                          合計
                          <span>
                            {totalDurationLarge &&
                            progressDataPairsLarge.length > 0
                              ? formatTimeToJapanese(totalDurationLarge)
                              : '-'}
                          </span>
                        </div>
                      </div>

                      <div className={`mt-[10px]`}>
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
                        <div className="font-medium text-sm flex gap-1 mt-[10px]">
                          合計
                          <span>
                            {totalDurationLargeCompare &&
                            progressDataPairsLarge.length > 0
                              ? formatTimeToJapanese(totalDurationLargeCompare)
                              : '-'}
                          </span>
                        </div>
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
                          {progressDataPairsLarge.map((item, index) => {
                            return (
                              <div key={index}>
                                <ProgressBarTeamTagCompare
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
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    duration: string;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      duration,
                                      type: EventWorkCategory.ALL,
                                      isCompare,
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
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-[18px]">
                    <ImageRound
                      className={`w-fit h-fit relative top-9 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 2 */}
                  <div className="w-[220px]">
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
                      <div className={`mt-[14px]`}>
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
                        {progressDataPairsMedium.length > 0 ? (
                          <div className="font-medium text-sm flex gap-1 mt-[10px]">
                            合計
                            <span>
                              {totalDurationMedium &&
                                formatTimeToJapanese(totalDurationMedium)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-[10px]">-</div>
                        )}
                      </div>

                      <div className={`mt-[10px]`}>
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
                        {progressDataPairsMedium.length > 0 ? (
                          <div className="font-medium text-sm flex gap-1 mt-[10px]">
                            合計
                            <span>
                              {totalDurationMediumCompare &&
                                formatTimeToJapanese(
                                  totalDurationMediumCompare,
                                )}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-[10px]">-</div>
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
                          {progressDataPairsMedium.map((item, index) => {
                            return (
                              <div key={index}>
                                <ProgressBarTeamTagCompare
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
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    duration: string;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      duration,
                                      type: EventWorkCategory.LARGE,
                                      isCompare,
                                    });
                                  }}
                                  {...item}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-[18px]">
                    <ImageRound
                      className={`w-fit h-fit relative top-9 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 3 */}
                  <div className="w-[220px]">
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
                      <div className={`mt-[14px]`}>
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
                        {progressDataPairsSmall.length > 0 ? (
                          <div className="font-medium text-sm flex gap-1 mt-[10px]">
                            合計
                            <span>
                              {totalDurationSmall &&
                                formatTimeToJapanese(totalDurationSmall)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-[10px]">-</div>
                        )}
                      </div>

                      <div className={`mt-[10px]`}>
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
                        {progressDataPairsSmall.length > 0 ? (
                          <div className="font-medium text-sm flex gap-1 mt-[10px]">
                            合計
                            <span>
                              {totalDurationSmallCompare &&
                                formatTimeToJapanese(totalDurationSmallCompare)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-[10px]">-</div>
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
                          {progressDataPairsSmall.map((item, index) => {
                            return (
                              <div key={index}>
                                <ProgressBarTeamTagCompare
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
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    duration: string;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      duration,
                                      type: EventWorkCategory.MEDIUM,
                                      isCompare,
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
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-[18px]">
                    <ImageRound
                      className={`w-fit h-fit relative top-9 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 4 */}
                  <div className="w-[220px]">
                    <div className="mt-4">
                      <Dropdown
                        label="小カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={smallOptions}
                        selectedOption={selectedSmall || undefined}
                        onChange={(data) => handleSelectSmall(data)}
                        disabled={!selectedLarge}
                      />
                      <div className={`mt-[14px]`}>
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
                        {progressDataPairsCategory.length > 0 ? (
                          <div className="font-medium text-sm flex gap-1 mt-[10px]">
                            合計
                            <span>
                              {totalDurationCategory &&
                                formatTimeToJapanese(totalDurationCategory)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-[10px]">-</div>
                        )}
                      </div>

                      <div className={`mt-[10px]`}>
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
                        {progressDataPairsCategory.length > 0 ? (
                          <div className="font-medium text-sm flex gap-1 mt-[10px]">
                            合計
                            <span>
                              {totalDurationCategoryCompare &&
                                formatTimeToJapanese(
                                  totalDurationCategoryCompare,
                                )}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-[10px]">-</div>
                        )}
                      </div>
                      {isLoadingSmallCompare || isLoadingSmall ? (
                        <div className="flex flex-col mt-[50px]">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-12" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-2" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="mt-5 flex flex-col gap-4">
                          {progressDataPairsCategory.map((item, index) => {
                            return (
                              <div key={index}>
                                <ProgressBarTeamTagCompare
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
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    duration: string;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      duration,
                                      type: EventWorkCategory.SMALL,
                                      isCompare,
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
          <ListTaskDetailStatisticTagModal
            open={isShowModal}
            selectedLarge={selectedLarge}
            selectedMedium={selectedMedium}
            detailCategory={detailCategory}
            selectedSmall={selectedSmall}
            startDate={isModalCompare ? startDateCompare : startDate}
            endDate={isModalCompare ? endDateCompare : endDate}
            selectedOrganization={selectedOrganization}
            statisticTagsListTeam={
              isModalCompare ? statisticTagsCompareList : statisticTagsList
            }
            onClose={() => {
              setIsShowModal(false);
            }}
            handleScroll={handleScroll}
          />
        )}
      </>
    );
  },
);

export default AllocationTagTeamCompare;
