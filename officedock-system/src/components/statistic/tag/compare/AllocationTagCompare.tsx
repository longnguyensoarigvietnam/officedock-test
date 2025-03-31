import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatShowStatisticTask, formatTimeToJapanese } from '@utils/date';
import { EventWorkCategory } from '@constants/enums';

import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import ProgressBarStatistic from '../ProgressBarStatistic';
import { getRandomColor, lightenColor } from '@utils';
import { SkeletonElement } from '@components/common/SkeletonLoading';

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
  optionData: string[];
};

const AllocationTagCompare = memo(
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
    const [progressDataPairsCategory, setProgressDataPairsCategory] = useState<
      {
        main: ProgressDataType | null;
        compare: ProgressDataType | null;
      }[]
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
    } = useContext(StatisticTagStateContext);

    useEffect(() => {
      if (statisticTagsList && statisticTagsCompareList) {
        const mergeCategories = (
          mainCategories: StatisticCategoryInfo[],
          compareCategories: StatisticCategoryInfo[],
          colorData?: string,
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
            mergedMap.set(item.tagId as number, {
              main: {
                id: item.tagId as number,
                label: item.tagName as string,
                value: item.percent,
                color:
                  lightenColor(colorData as string, item.percent) ||
                  getRandomColor(),
                duration: item.duration,
                optionData: item.tasks.slice(0, 3).map((task) => task.title),
              },
              compare: null,
            });
          });

          // Add compare categories, updating existing ones or creating new entries
          compareCategories.forEach((compareItem) => {
            if (mergedMap.has(compareItem.tagId as number)) {
              mergedMap.get(compareItem.tagId as number)!.compare = {
                id: compareItem.tagId as number,
                label: compareItem.tagName as string,
                value: compareItem.percent,
                color:
                  lightenColor(colorData as string, compareItem.percent) ||
                  getRandomColor(),
                duration: compareItem.duration,
                optionData: compareItem.tasks
                  .slice(0, 3)
                  .map((task) => task.title),
              };
            } else {
              mergedMap.set(compareItem.tagId as number, {
                main: null,
                compare: {
                  id: compareItem.tagId as number,
                  label: compareItem.tagName as string,
                  value: compareItem.percent,
                  color:
                    lightenColor(colorData as string, compareItem.percent) ||
                    getRandomColor(),
                  duration: compareItem.duration,
                  optionData: compareItem.tasks
                    .slice(0, 3)
                    .map((task) => task.title),
                },
              });
            }
          });

          return Array.from(mergedMap.values());
        };

        const largePairs = mergeCategories(
          statisticTagsList.largeCategories || [],
          statisticTagsCompareList.largeCategories || [],
          '#2E9267',
        );

        const mediumPairs = mergeCategories(
          statisticTagsList.mediumCategories || [],
          statisticTagsCompareList.mediumCategories || [],
          '#2E9267',
        );

        const smallPairs = mergeCategories(
          statisticTagsList.smallCategories || [],
          statisticTagsCompareList.smallCategories || [],
          '#2E9267',
        );

        const categoryPairs = mergeCategories(
          statisticTagsList.category || [],
          statisticTagsCompareList.category || [],
          '#2E9267',
        );

        setProgressDataPairsLarge(largePairs);
        setProgressDataPairsMedium(mediumPairs);
        setProgressDataPairsSmall(smallPairs);
        setProgressDataPairsCategory(categoryPairs);
      }
    }, [statisticTagsList, statisticTagsCompareList]);

    const handleClickTooltip = (
      id: number | null,
      type: string,
      isCompare: boolean,
    ) => {
      let duration: string = '00:00:00';
      if (isCompare) {
        if (type === EventWorkCategory.ALL) {
          duration =
            statisticTagsCompareList?.largeCategories.find(
              (item) => item.tagId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.LARGE) {
          duration =
            statisticTagsCompareList?.mediumCategories?.find(
              (item) => item.tagId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.MEDIUM) {
          duration =
            statisticTagsCompareList?.smallCategories?.find(
              (item) => item.tagId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.SMALL) {
          duration =
            statisticTagsCompareList?.category?.find((item) => item.tagId == id)
              ?.duration || '00:00:00';
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
            statisticTagsList?.largeCategories.find((item) => item.tagId == id)
              ?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.LARGE) {
          duration =
            statisticTagsList?.mediumCategories?.find(
              (item) => item.tagId == id,
            )?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.MEDIUM) {
          duration =
            statisticTagsList?.smallCategories?.find((item) => item.tagId == id)
              ?.duration || '00:00:00';
        }
        if (type === EventWorkCategory.SMALL) {
          duration =
            statisticTagsList?.category?.find((item) => item.tagId == id)
              ?.duration || '00:00:00';
        }
        setDetailCategory({
          id: id,
          type: type,
          totalDuration: duration,
        });

        setIsShowModal(true);
      }
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
    const handleScrollCompare = () => {
      const item = largeOptions.find(
        (item) => item.value === detailCategoryCompare?.id,
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
                                className="w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                                <span className="w-[32px] truncate">
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
                                    {pair.main?.duration
                                      ? formatTimeToJapanese(
                                          pair.main?.duration,
                                        )
                                      : formatTimeToJapanese(
                                          pair.compare?.duration || '',
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
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                    {pair.main?.duration
                                      ? formatTimeToJapanese(
                                          pair.main?.duration,
                                        )
                                      : formatTimeToJapanese(
                                          pair.compare?.duration || '',
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
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                    {pair.main?.duration
                                      ? formatTimeToJapanese(
                                          pair.main?.duration,
                                        )
                                      : formatTimeToJapanese(
                                          pair.compare?.duration || '',
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
                                  handleClickChart={(
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                  handleClickChart={(
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                  showInfo={false}
                                  startDateCompare={startDateCompare}
                                  endDateCompare={endDateCompare}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
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
                                  {pair.main?.duration
                                    ? formatTimeToJapanese(pair.main?.duration)
                                    : formatTimeToJapanese(
                                        pair.compare?.duration || '',
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
                                handleClickChart={(
                                  _data: OptionDropdownType,
                                ) => {}}
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
                                handleClickChart={(
                                  _data: OptionDropdownType,
                                ) => {}}
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
                                showInfo={false}
                                startDateCompare={startDateCompare}
                                endDateCompare={endDateCompare}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                        {progressDataPairsCategory.filter((pair) => pair.main)
                          .length ? (
                          <div className="font-medium text-sm text-black ">
                            合計{' '}
                            {totalDurationCategory &&
                              formatTimeToJapanese(totalDurationCategory)}
                          </div>
                        ) : (
                          <div>-</div>
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
                        {progressDataPairsCategory.filter(
                          (pair) => pair.compare,
                        ).length ? (
                          <div className="font-medium text-sm text-black">
                            合計{' '}
                            {totalDurationCategoryCompare &&
                              formatTimeToJapanese(
                                totalDurationCategoryCompare,
                              )}
                          </div>
                        ) : (
                          <div>-</div>
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
                          {progressDataPairsCategory.map((pair, index) => {
                            return (
                              <div key={index}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium truncate max-w-40">
                                    {pair.main
                                      ? pair.main.label
                                      : pair.compare?.label || ''}
                                  </span>
                                  <span className="text-sm font-medium truncate max-w-24">
                                    {pair.main?.duration
                                      ? formatTimeToJapanese(
                                          pair.main?.duration,
                                        )
                                      : formatTimeToJapanese(
                                          pair.compare?.duration || '',
                                        )}
                                  </span>
                                </div>
                                <ProgressBarStatistic
                                  key={index}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={(id: number | null) => {
                                    handleClickTooltip(
                                      id,
                                      EventWorkCategory.SMALL,
                                      false,
                                    );
                                  }}
                                  handleClickChart={(
                                    _data: OptionDropdownType,
                                  ) => {}}
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
                                      EventWorkCategory.SMALL,
                                      true,
                                    );
                                  }}
                                  handleClickChart={(
                                    _data: OptionDropdownType,
                                  ) => {}}
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
          <ListTaskDetailStatisticTagModal
            open={isShowModal}
            selectedLarge={selectedLarge}
            selectedMedium={selectedMedium}
            detailCategory={detailCategory}
            selectedSmall={selectedSmall}
            startDate={startDate}
            endDate={endDate}
            selectedOrganization={selectedOrganization}
            statisticTagsListTeam={statisticTagsList}
            onClose={() => {
              setIsShowModal(false);
            }}
            handleScroll={handleScroll}
          />
        )}
        {isShowModalCompare && (
          <ListTaskDetailStatisticTagModal
            open={isShowModalCompare}
            selectedLarge={selectedLarge}
            selectedMedium={selectedMedium}
            selectedSmall={selectedSmall}
            startDate={startDateCompare}
            endDate={endDateCompare}
            detailCategory={detailCategoryCompare}
            selectedOrganization={selectedOrganization}
            statisticTagsListTeam={statisticTagsList}
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

export default AllocationTagCompare;
