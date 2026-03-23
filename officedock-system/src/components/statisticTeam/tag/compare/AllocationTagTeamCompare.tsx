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

// NOTE: Compare view uses a custom merge rule (both sides < threshold),
// so we no longer use the old per-side merge helper here.
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
  const mergeUsers = (
    users: UserListStatisticType[],
  ): UserListStatisticType[] => {
    const byUserId = new Map<number, UserListStatisticType>();

    users.forEach((u) => {
      const id = u.user.id;
      const existing = byUserId.get(id);
      if (!existing) {
        byUserId.set(id, {
          user: u.user,
          percent: Number(u.percent) || 0,
          duration: u.duration,
          tasks: u.tasks ?? [],
        });
        return;
      }

      const mergedTasks = [...(existing.tasks ?? []), ...(u.tasks ?? [])];
      const taskMap = new Map<number, (typeof mergedTasks)[number]>();
      mergedTasks.forEach((t) => taskMap.set(t.id, t));

      byUserId.set(id, {
        user: existing.user,
        percent: (Number(existing.percent) || 0) + (Number(u.percent) || 0),
        duration: sumDurationsChart([existing.duration, u.duration]),
        tasks: Array.from(taskMap.values()),
      });
    });

    return Array.from(byUserId.values());
  };

  const buildTeamItem = (
    info: StatisticCategoryInfo | null,
    fallback: Partial<ProgressDataTypeTeam>,
  ): ProgressDataTypeTeam => {
    const id = (info?.tagId as number | undefined) ?? (fallback.id as any);
    const percent = info?.percent ?? fallback.value ?? 0;

    return {
      id,
      label: info?.tagName || fallback.label || '',
      value: percent,
      color: lightenColor('#2E9267' as string, percent) || fallback.color || '',
      duration: info?.duration ?? fallback.duration ?? DEFAULT_TIME_TEXT,
      optionData: mergeUsers(info?.users ?? fallback.optionData ?? []),
      organizationId: String(
        info?.organizationId ?? fallback.organizationId ?? '',
      ),
    };
  };

  // Map by unique key (orgId-tagId for all-team, else tagId)
  const baseMap = new Map<string, StatisticCategoryInfo>();
  const cmpMap = new Map<string, StatisticCategoryInfo>();

  baseData.forEach((info) => {
    const k = buildKey(
      {
        id: info.tagId as number,
        label: info.tagName || '',
        value: info.percent,
        color: '',
        duration: info.duration,
        optionData: info.users || [],
        organizationId: String(info.organizationId),
      },
      isAllTeam,
    );
    baseMap.set(k, info);
  });

  compareData.forEach((info) => {
    const k = buildKey(
      {
        id: info.tagId as number,
        label: info.tagName || '',
        value: info.percent,
        color: '',
        duration: info.duration,
        optionData: info.users || [],
        organizationId: String(info.organizationId),
      },
      isAllTeam,
    );
    cmpMap.set(k, info);
  });

  const allKeys = new Set<string>([
    ...Array.from(baseMap.keys()),
    ...Array.from(cmpMap.keys()),
  ]);

  const mainRows: ProgressDataCompareItem[] = [];
  const mergedBaseItems: ProgressDataTypeTeam[] = [];
  const mergedCompareItems: ProgressDataTypeTeam[] = [];

  allKeys.forEach((key) => {
    const baseInfo = baseMap.get(key) ?? null;
    const cmpInfo = cmpMap.get(key) ?? null;
    const { id, orgId } = parseKey(key, isAllTeam);

    const baseItem = buildTeamItem(baseInfo, {
      id,
      label: cmpInfo?.tagName || '',
      value: 0,
      duration: DEFAULT_TIME_TEXT,
      optionData: [],
      organizationId: orgId,
    });
    const cmpItem = buildTeamItem(cmpInfo, {
      id,
      label: baseInfo?.tagName || '',
      value: 0,
      duration: DEFAULT_TIME_TEXT,
      optionData: [],
      organizationId: orgId,
    });

    // New rule:
    // - If BOTH base and compare are below threshold → merge into "その他"
    // - Else → show as standalone row
    if (baseItem.value < threshold && cmpItem.value < threshold) {
      if (baseItem.value > 0) mergedBaseItems.push(baseItem);
      if (cmpItem.value > 0) mergedCompareItems.push(cmpItem);
      return;
    }

    if (baseItem.value > 0 || cmpItem.value > 0) {
      mainRows.push({ item: baseItem, itemCompare: cmpItem });
    }
  });

  // Append "その他" only if it has at least one side
  if (mergedBaseItems.length > 0 || mergedCompareItems.length > 0) {
    const otherBasePercent = mergedBaseItems.reduce(
      (sum, it) => sum + it.value,
      0,
    );
    const otherCmpPercent = mergedCompareItems.reduce(
      (sum, it) => sum + it.value,
      0,
    );

    const otherBaseDuration = sumDurationsChart(
      mergedBaseItems.map((it) => it.duration),
    );
    const otherCmpDuration = sumDurationsChart(
      mergedCompareItems.map((it) => it.duration),
    );

    const otherBase: ProgressDataTypeTeam = {
      id: -1,
      label: 'その他',
      value: otherBasePercent,
      color: '#83919E',
      duration: otherBaseDuration,
      optionData: mergeUsers(mergedBaseItems.flatMap((it) => it.optionData)),
      mergedItems: mergedBaseItems,
    };

    const otherCmp: ProgressDataTypeTeam = {
      id: -1,
      label: 'その他',
      value: otherCmpPercent,
      color: '#83919E',
      duration: otherCmpDuration,
      optionData: mergeUsers(mergedCompareItems.flatMap((it) => it.optionData)),
      mergedItems: mergedCompareItems,
    };

    mainRows.push({ item: otherBase, itemCompare: otherCmp });
  }

  // Move "その他" to the end
  mainRows.sort((a, b) => {
    const aOther = a.item.id === -1;
    const bOther = b.item.id === -1;
    return aOther === bOther ? 0 : aOther ? 1 : -1;
  });

  return mainRows;
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
        selectedOrganization?.value != ALL_TEAM_STATISTIC
      ) {
        const compareResult = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.largeCategories || [],
          compareData: statisticTagsCompareList?.largeCategories || [],
          isAllTeam: selectedOrganization?.label === ALL_TEAM_STATISTIC,
        });
        const compareResultMedium = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.mediumCategories || [],
          compareData: statisticTagsCompareList?.mediumCategories || [],
        });
        const compareResultSmall = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.smallCategories || [],
          compareData: statisticTagsCompareList?.smallCategories || [],
        });

        const compareResultCategory = buildProgressDataCompareWithMergedOthers({
          baseData: statisticTagsList.category || [],
          compareData: statisticTagsCompareList?.category || [],
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
          statisticAllTeamCategoryCompareList?.largeCategories || [],
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
      }, 0);
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
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-8" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : progressDataPairsLarge.length === 0 ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <span className="text-sm text-[#77858F]">
                            データがありません
                          </span>
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
                                    tooltipDelay={0}
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
                                    tooltipDelay={0}
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
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-8" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : progressDataPairsMedium.length === 0 &&
                        selectedLarge?.value !== '' ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <span className="text-sm text-[#77858F]">
                            データがありません
                          </span>
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
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-8" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : progressDataPairsSmall.length === 0 &&
                        selectedMedium?.value !== '' ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <span className="text-sm text-[#77858F]">
                            データがありません
                          </span>
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
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-8" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px] mb-[6px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : progressDataPairsCategory.length === 0 &&
                        selectedSmall?.value !== '' ? (
                        <div className="flex items-center justify-center h-[100px]">
                          <span className="text-sm text-[#77858F]">
                            データがありません
                          </span>
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
