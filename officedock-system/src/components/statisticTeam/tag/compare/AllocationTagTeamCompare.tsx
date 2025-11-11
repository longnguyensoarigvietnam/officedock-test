import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';
import { SkeletonElement } from '@components/common/SkeletonLoading';
// Currently using for ALL TEAM taken from my dock
import ProgressBarStatistic from '@components/statistic/category/ProgressBarStatistic';

import {
  ProgressDataType,
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import {
  formatShowStatisticTask,
  formatTimeToJapanese,
  sumDurationsChart,
} from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';

import { EventWorkCategory } from '@constants/enums';

import ProgressBarTeamTagCompare from './ProgressBarTeamTag';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT, SUB_TEAMS } from '@constants';
import FilterTagUserTeam from '../filter/FilterTagUserTeam';
import FilterTagTeam from '../filter/FilterTagTeam';

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

type ProgressDataTypeTeam = {
  id: number | string; // Allow string for merged items
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataTypeTeam[];
  organizationId?: string;
};
type ProgressDataCompareItem = {
  item: ProgressDataTypeTeam;
  itemCompare?: ProgressDataTypeTeam;
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
}): ProgressDataTypeTeam[] {
  const progressData: ProgressDataTypeTeam[] = data.map((item) => ({
    id: item.tagId as number,
    label: item.tagName || '',
    value: item.percent,
    color: lightenColor('#2E9267' as string, item.percent) || '',
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

  const mergedItem: ProgressDataTypeTeam = {
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
const buildKey = (item: ProgressDataTypeTeam, isAll: boolean) =>
  isAll ? `${item.organizationId}-${item.id}` : `${item.id}`;

const parseKey = (key: string, isAll: boolean) => {
  if (!isAll) return { id: key, orgId: undefined };
  const [orgId, idStr] = key.split('-', 2);
  return { id: idStr, orgId };
};

export function buildProgressDataCompareWithMergedOthers({
  baseData,
  compareData,
  threshold = 10,
  isAllTeam = false,
}: {
  baseData: StatisticCategoryInfo[];
  compareData: StatisticCategoryInfo[];
  threshold?: number;
  isAllTeam?: boolean;
}): ProgressDataCompareItem[] {
  /* Step A – normalize & merge (<threshold) */
  const mergedBase = transformAndMergeProgressData({
    data:
      baseData.length === 0
        ? compareData.map((i) => ({
            ...i,
            percent: 0,
            duration: DEFAULT_TIME_TEXT,
            users: [],
          }))
        : baseData,
    threshold,
  });

  const mergedCompare = transformAndMergeProgressData({
    data:
      compareData.length === 0
        ? baseData.map((i) => ({
            ...i,
            percent: 0,
            duration: DEFAULT_TIME_TEXT,
            users: [],
          }))
        : compareData,
    threshold,
  });

  /* Step B – get the unique “key” (id or org‑id) */
  const allKeys = new Set<string>();
  const collectKeys = (arr: ProgressDataTypeTeam[]) => {
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

  /* Step C – function to find item by key */
  const findByKey = (
    key: string,
    arr: ProgressDataTypeTeam[],
  ): ProgressDataTypeTeam | undefined => {
    const { id, orgId } = parseKey(key, isAllTeam);
    const match = (el: ProgressDataTypeTeam) =>
      String(el.id) == id && (!isAllTeam || el.organizationId == orgId);

    return (
      arr.find(match) ||
      arr
        .find((d) => d.id === -1 && d.mergedItems?.some(match))
        ?.mergedItems?.find(match)
    );
  };

  /* Step D – concatenate results for each key */
  const result: ProgressDataCompareItem[] = Array.from(allKeys)
    .map((key) => {
      const baseItem = findByKey(key, mergedBase);
      const cmpItem = findByKey(key, mergedCompare);
      const { id, orgId } = parseKey(key, isAllTeam);

      const empty: ProgressDataTypeTeam = {
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

  /* Step E – move “その他” (id = -1) to the end */
  result.sort((a, b) => {
    const aOther = a.item.id === -1;
    const bOther = b.item.id === -1;
    return aOther === bOther ? 0 : aOther ? 1 : -1;
  });

  return result;
}
const AllocationTagTeamCompare = memo(
  ({
    startDate,
    endDate,
    statisticTagsList,
    startDateCompare,
    endDateCompare,
    statisticTagsCompareList,
    statisticAllTeamCategoryList,
    statisticAllTeamCategoryCompareList,
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
      organizationId?: string;
    } | null>(null);

    const [isModalCompare, setIsModalCompare] = useState(false);
    const [progressDataAllTeam, setProgressDataAllTeam] = useState<
      {
        main: ProgressDataType | null;
        compare: ProgressDataType | null;
      }[]
    >([]);

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
    } = useContext(StatisticTeamTagsStateContext);

    useEffect(() => {
      if (
        statisticTagsList &&
        statisticTagsCompareList &&
        selectedOrganization?.value != ALL_TEAM_STATISTIC
      ) {
        const compareResult = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.largeCategories || [],
          compareData: statisticTagsCompareList.largeCategories || [],
          isAllTeam: selectedOrganization?.label === ALL_TEAM_STATISTIC,
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
    }, [
      statisticTagsList,
      statisticTagsCompareList,
      selectedOrganization?.label,
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
                      .map((category) => category?.tagName || '') || [],
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
                      .map((category) => category?.tagName || '') || [],
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

        setProgressDataAllTeam(largePairs);
        setProgressDataPairsLarge([]);
        setProgressDataPairsMedium([]);
        setProgressDataPairsSmall([]);
        setProgressDataPairsCategory([]);
      }
    }, [
      statisticAllTeamCategoryList,
      statisticAllTeamCategoryCompareList,
      selectedOrganization?.value,
    ]);

    const handleClickTooltip = ({
      id,
      userId,
      type,
      isCompare,
      organizationId,
    }: {
      id: number;
      userId: number;
      type: string;
      isCompare?: boolean;
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
        organizationId,
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

    const [hasHoverLarge, setHasHoverLarge] = useState<number | null>(null);
    const [hasHoverMedium, setHasHoverMedium] = useState<number | null>(null);
    const [hasHoverSmall, setHasHoverSmall] = useState<number | null>(null);
    const [hasHoverCategory, setHasHoverCategory] = useState<number | null>(
      null,
    );

    // All team
    const [activeBarLargeId, setActiveBarLargeId] = useState<number | null>(
      null,
    );
    const [activeBarLargeCompareId, setActiveBarLargeCompareId] = useState<
      number | null
    >(null);

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
              <div className="flex flex-shrink-0 items-center gap-[10px] ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer`}
                  name="statistic-progress-bar icon"
                  src={`/icons/statistic-progress-bar.svg`}
                />
                <span className="text-black font-semibold text-[18px]">
                  カテゴリーごとのタグの時間配分
                </span>
              </div>
              <div>
                {' '}
                <FilterTagUserTeam />
              </div>
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
                {/* List tags  */}
                <div>
                  <div className="flex justify-between w-full my-8 px-[30px]">
                    {/* Filter tag */}
                    <FilterTagTeam />
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
                        <div className="font-medium text-sm flex gap-1 mt-[10px]">
                          合計
                          <span>
                            {selectedOrganization?.value == ALL_TEAM_STATISTIC
                              ? totalDurationLarge &&
                                progressDataAllTeam.length > 0
                                ? formatTimeToJapanese(totalDurationLarge)
                                : '-'
                              : totalDurationLarge &&
                                  progressDataPairsLarge.length > 0
                                ? formatTimeToJapanese(totalDurationLarge)
                                : '-'}
                          </span>
                        </div>
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
                        <div className="font-medium text-sm flex gap-1 mt-[10px]">
                          合計
                          <span>
                            {selectedOrganization?.value == ALL_TEAM_STATISTIC
                              ? totalDurationLargeCompare &&
                                progressDataAllTeam.length > 0
                                ? formatTimeToJapanese(
                                    totalDurationLargeCompare,
                                  )
                                : '-'
                              : totalDurationLargeCompare &&
                                  progressDataPairsLarge.length > 0
                                ? formatTimeToJapanese(
                                    totalDurationLargeCompare,
                                  )
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
                          {selectedOrganization?.value == ALL_TEAM_STATISTIC &&
                            progressDataAllTeam.map((pair, index) => {
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
                                        pair.main?.duration ||
                                          DEFAULT_TIME_TEXT,
                                      )}
                                    </span>
                                  </div>
                                  <ProgressBarStatistic
                                    key={index}
                                    isAllTeam
                                    isActive={
                                      activeBarLargeId === pair.main?.id
                                    }
                                    onActivate={(id: number) => {
                                      setActiveBarLargeId(id);
                                      setActiveBarLargeCompareId(null);
                                      setHasHoverLarge(index);
                                      setHasHoverMedium(null);
                                      setHasHoverSmall(null);
                                    }}
                                    onDeactivate={(id: number) => {
                                      if (activeBarLargeId === id)
                                        setActiveBarLargeId(null);
                                    }}
                                    classProgressClass="h-[20px] rounded-[4px]"
                                    handleClickTooltip={() => {}}
                                    handleClickChart={() => {}}
                                    id={pair.main ? pair.main.id : 0}
                                    label={pair.main ? pair.main.label : ''}
                                    value={pair.main ? pair.main.value : 0}
                                    color={pair.main ? pair.main.color : ''}
                                    duration={
                                      pair.main
                                        ? String(pair.main.duration)
                                        : ''
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
                                    isAllTeam
                                    isActive={
                                      activeBarLargeCompareId ===
                                      pair.compare?.id
                                    }
                                    onActivate={(id: number) => {
                                      setActiveBarLargeId(null);

                                      setActiveBarLargeCompareId(id);
                                    }}
                                    onDeactivate={(id: number) => {
                                      if (activeBarLargeCompareId === id)
                                        setActiveBarLargeCompareId(null);
                                    }}
                                    classProgressClass="h-[20px] rounded-[4px]"
                                    handleClickTooltip={() => {}}
                                    handleClickChart={() => {}}
                                    id={pair.compare ? pair.compare.id : 0}
                                    label={
                                      pair.compare ? pair.compare.label : ''
                                    }
                                    value={
                                      pair.compare ? pair.compare.value : 0
                                    }
                                    color={
                                      pair.compare ? pair.compare.color : ''
                                    }
                                    duration={
                                      pair.compare
                                        ? String(pair.compare.duration)
                                        : ''
                                    }
                                    optionData={
                                      pair.compare
                                        ? pair.compare.optionData
                                        : []
                                    }
                                    mergedItems={
                                      pair.compare
                                        ? pair.compare.mergedItems
                                        : []
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
                          {selectedOrganization?.value != ALL_TEAM_STATISTIC &&
                            progressDataPairsLarge.map((item, index) => {
                              return (
                                <div key={index}>
                                  <ProgressBarTeamTagCompare
                                    key={index}
                                    startDate={startDate}
                                    endDate={endDate}
                                    startDateCompare={startDateCompare}
                                    endDateCompare={endDateCompare}
                                    classProgressClass="h-[20px] rounded-[4px]"
                                    organizationId={
                                      item.item.organizationId ||
                                      item.itemCompare?.organizationId
                                    }
                                    handleClickTooltip={({
                                      userId,
                                      categoryId,
                                      isCompare,
                                      organizationId,
                                    }: {
                                      userId: number;
                                      categoryId: number;
                                      isCompare?: boolean;
                                      organizationId?: string;
                                    }) => {
                                      handleClickTooltip({
                                        id: categoryId,
                                        userId,
                                        type: EventWorkCategory.ALL,
                                        isCompare,
                                        organizationId,
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
                                    hasHover={hasHoverLarge !== index}
                                    onActionHover={() => {
                                      setHasHoverCategory(null);
                                      setHasHoverLarge(index);
                                      setHasHoverMedium(null);
                                      setHasHoverSmall(null);
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
                        disabled={!selectedOrganization || isHasLoading}
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
                                    isCompare,
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
                                      type: EventWorkCategory.LARGE,
                                      isCompare,
                                    });
                                  }}
                                  hasHover={hasHoverMedium !== index}
                                  onActionHover={() => {
                                    setHasHoverCategory(null);
                                    setHasHoverLarge(null);
                                    setHasHoverMedium(index);
                                    setHasHoverSmall(null);
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
                                    isCompare,
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
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
                                  hasHover={hasHoverSmall !== index}
                                  onActionHover={() => {
                                    setHasHoverCategory(null);
                                    setHasHoverLarge(null);
                                    setHasHoverMedium(null);
                                    setHasHoverSmall(index);
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
                                  isLast
                                  startDate={startDate}
                                  endDate={endDate}
                                  startDateCompare={startDateCompare}
                                  endDateCompare={endDateCompare}
                                  classProgressClass="h-[20px] rounded-[4px]"
                                  handleClickTooltip={({
                                    userId,
                                    categoryId,
                                    isCompare,
                                  }: {
                                    userId: number;
                                    categoryId: number;
                                    isCompare?: boolean;
                                  }) => {
                                    handleClickTooltip({
                                      id: categoryId,
                                      userId,
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
                                  hasHover={hasHoverCategory !== index}
                                  onActionHover={() => {
                                    setHasHoverLarge(null);
                                    setHasHoverMedium(null);

                                    setHasHoverCategory(index);
                                    setHasHoverSmall(null);
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
