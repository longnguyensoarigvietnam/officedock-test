import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import {
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatShowStatisticTask, formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';

import { EventWorkCategory } from '@constants/enums';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT, SUB_TEAMS } from '@constants';

import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

import ProgressBarStatistic from '../ProgressBarStatistic';
import FilterTag from '../filter/FilterTag';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  statisticTagsCompareList: StatisticsCategories | undefined;
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
  optionData: string[];
  organizationId?: string;
};

const AllocationTagCompare = memo(
  ({
    startDate,
    endDate,
    statisticTagsList,
    statisticTagsCompareList,
    statisticAllTeamCategoryList,
    statisticAllTeamCategoryCompareList,
    startDateCompare,
    endDateCompare,
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
    const [progressDataPairsCategory, setProgressDataPairsCategory] = useState<
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
      selectedSmall,
      isLoadingLargeCompare,
      isLoadingMediumCompare,
      isLoadingOrganizationCompare,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      isLoadingSmall,
      isLoadingSmallCompare,
    } = useContext(StatisticTagStateContext);

    useEffect(() => {
      if (
        statisticTagsList &&
        statisticTagsCompareList &&
        selectedOrganization?.value != ALL_TEAM_STATISTIC
      ) {
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
                organizationId: String(item.organizationId),
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
                organizationId: String(compareItem.organizationId),

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
    }, [
      statisticTagsList,
      statisticTagsCompareList,
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
            mergedMap.set(item.organizationId, {
              main: {
                id: item.organizationId,
                label: item.organizationName as string,
                value: item.percent,
                organizationId: String(item.organizationId),
                color:
                  item.color ||
                  lightenColor(colorData as string, item.percent) ||
                  getRandomColor(),
                duration: item.duration,
                optionData:
                  item.organizationId == SUB_TEAMS
                    ? item?.subTeams
                        ?.slice(0, 3)
                        .map((team) => team?.organizationName || '') || []
                    : item?.data
                        ?.slice(0, 3)
                        .map((tag) => tag?.tagName || '') || [],
              },
              compare: null,
            });
          });

          // Add compare categories, updating existing ones or creating new entries
          compareCategories.forEach((compareItem) => {
            if (mergedMap.has(compareItem.organizationId)) {
              mergedMap.get(compareItem.organizationId)!.compare = {
                id: compareItem.organizationId,
                label: compareItem.organizationName as string,
                value: compareItem.percent,
                organizationId: String(compareItem.organizationId),

                color:
                  compareItem.color ||
                  lightenColor(colorData as string, compareItem.percent) ||
                  getRandomColor(),
                duration: compareItem.duration,
                optionData:
                  compareItem.organizationId == SUB_TEAMS
                    ? compareItem?.subTeams
                        ?.slice(0, 3)
                        .map((team) => team?.organizationName || '') || []
                    : compareItem?.data
                        ?.slice(0, 3)
                        .map((tag) => tag?.tagName || '') || [],
              };
            } else {
              mergedMap.set(compareItem.organizationId, {
                main: null,
                compare: {
                  id: compareItem.organizationId,
                  label: compareItem.organizationName as string,
                  value: compareItem.percent,
                  color:
                    lightenColor(colorData as string, compareItem.percent) ||
                    getRandomColor(),
                  duration: compareItem.duration,
                  optionData:
                    compareItem.organizationId == SUB_TEAMS
                      ? compareItem?.subTeams
                          ?.slice(0, 3)
                          .map((team) => team?.organizationName || '') || []
                      : compareItem?.data
                          ?.slice(0, 3)
                          .map((tag) => tag?.tagName || '') || [],
                },
              });
            }
          });

          return Array.from(mergedMap.values());
        };

        const largePairs = mergeCategories(
          statisticAllTeamCategoryList.largeCategories || [],
          statisticAllTeamCategoryCompareList.largeCategories || [],
          '#2E9267',
        );

        setProgressDataPairsLarge(largePairs);
        setProgressDataPairsMedium([]);
        setProgressDataPairsSmall([]);
        setProgressDataPairsCategory([]);
      }
    }, [
      statisticAllTeamCategoryList,
      statisticAllTeamCategoryCompareList,
      selectedOrganization?.value,
    ]);

    const handleClickTooltip = (
      id: number | null,
      type: EventWorkCategory,
      isCompare: boolean,
      organizationId?: string,
    ) => {
      const detailData = {
        id,
        type,
        organizationId,
      };

      if (isCompare) {
        setDetailCategoryCompare(detailData);
        setIsShowModalCompare(true);
      } else {
        setDetailCategory(detailData);
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
      setIsShowModalCompare(false);

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
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
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
                    {/* Filter tag */}
                    <FilterTag />
                  </div>
                </div>
                <div className="flex  justify-between px-[30px] text-sm font-medium">
                  {/* Column Chart 1 */}
                  <div className="w-[220px]">
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
                      <div className={`mt-[14px]`}>
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

                      <div className={`mt-[10px]`}>
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
                        disabled={
                          selectedOrganization?.value == '' || isHasLoading
                        }
                      />
                      <div className={`mt-[14px]`}>
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

                      <div className={`mt-[10px]`}>
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
                                  organizationId={
                                    pair.main?.organizationId ||
                                    pair.compare?.organizationId
                                  }
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
                        disabled={
                          selectedLarge?.value == '' ||
                          isHasLoading ||
                          isDisableCalendar
                        }
                      />
                      <div className={`mt-[14px]`}>
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

                      <div className={`mt-[10px]`}>
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
                        disabled={
                          selectedMedium?.value == '' ||
                          isHasLoading ||
                          isDisableCalendar
                        }
                      />
                      <div className={`mt-[14px]`}>
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
                                      EventWorkCategory.SMALL,
                                      false,
                                    );
                                  }}
                                  isLast
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
                                  isLast
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
