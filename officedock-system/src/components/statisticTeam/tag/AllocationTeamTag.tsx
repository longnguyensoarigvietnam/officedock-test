import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';
// Currently using for ALL TEAM taken from my dock
import ProgressBarStatistic from '@components/statistic/category/ProgressBarStatistic';
import FilterTagTeam from './filter/FilterTagTeam';
import FilterTagUserTeam from './filter/FilterTagUserTeam';

import {
  ProgressDataType,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatTimeToJapanese, sumDurationsChart } from '@utils/date';
import {
  lightenColor,
  mapStatisticAllTeamCategoryInfoToProgressData,
} from '@utils';

import { EventWorkCategory } from '@constants/enums';

import ProgressBarTeamTagStatistic from './ProgressBarTeamTagStatistic';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { ALL_TEAM_STATISTIC } from '@constants';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

type ProgressDataTypeTeam = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataTypeTeam[];
  organizationId?: string;
};
export function transformStatisticCategoryInfoToProgressData({
  data,
  mergeLabel = 'その他',
  mergeColor = '#83919E',
  threshold = 10,
}: {
  data: StatisticCategoryInfo[];
  mergeLabel?: string;
  mergeColor?: string;
  threshold?: number;
}): {
  finalData: ProgressDataTypeTeam[];
  mergedItem?: ProgressDataTypeTeam;
} {
  const progressData: ProgressDataTypeTeam[] = data.map((item) => ({
    id: item.tagId as number,
    label: item.tagName || '',
    value: item.percent,
    color: lightenColor('#2E9267' as string, item.percent) || '',
    duration: item.duration,
    optionData: item.users || [],
    organizationId: String(item.organizationId),
  }));

  const mergedItems = progressData
    .filter((item) => item.value < threshold)
    .filter((item) => item.value >= 0);
  const mainItems = progressData
    .filter((item) => item.value >= threshold)
    .filter((item) => item.value >= 0);
  if (mergedItems.length === 0) {
    return {
      finalData: mainItems,
    };
  }

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

  return {
    finalData: [...mainItems, mergedItem],
    mergedItem,
  };
}

const AllocationTeamTag = memo(
  ({
    startDate,
    endDate,
    statisticTagsList,
    statisticAllTeamCategoryList,
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
    const [progressDataAllTeam, setProgressDataAllTeam] = useState<
      ProgressDataType[]
    >([]);

    const [progressDataLarge, setProgressDataLarge] = useState<
      ProgressDataTypeTeam[]
    >([]);
    const [progressDataMedium, setProgressDataMedium] = useState<
      ProgressDataTypeTeam[]
    >([]);
    const [progressDataSmall, setProgressDataSmall] = useState<
      ProgressDataTypeTeam[]
    >([]);
    const [progressDataCategory, setProgressDataCategory] = useState<
      ProgressDataTypeTeam[]
    >([]);
    const {
      isDisableCalendar,
      isHasLoading,
      totalDurationLarge,
      totalDurationMedium,
      totalDurationSmall,
      totalDurationCategory,
      listOptionsOrganization,
      largeOptions,
      mediumOptions,
      smallOptions,
      selectedLarge,
      selectedMedium,
      selectedOrganization,
      selectedSmall,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      isLoadingSmall,
    } = useContext(StatisticTeamTagsStateContext);

    useEffect(() => {
      if (
        statisticTagsList &&
        selectedOrganization?.value !== ALL_TEAM_STATISTIC
      ) {
        if (statisticTagsList.largeCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.largeCategories,
          });
          setProgressDataLarge(finalData);
        } else {
          setProgressDataLarge([]);
        }
        if (statisticTagsList.mediumCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.mediumCategories,
          });
          setProgressDataMedium(finalData);
        } else {
          setProgressDataMedium([]);
        }
        if (statisticTagsList.smallCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.smallCategories,
          });
          setProgressDataSmall(finalData);
        } else {
          setProgressDataSmall([]);
        }
        if (statisticTagsList.category) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.category,
          });
          setProgressDataCategory(finalData);
        } else {
          setProgressDataCategory([]);
        }
      }
    }, [statisticTagsList]);
    useEffect(() => {
      if (
        statisticAllTeamCategoryList &&
        selectedOrganization?.value == ALL_TEAM_STATISTIC
      ) {
        if (statisticAllTeamCategoryList.largeCategories) {
          const { finalData } = mapStatisticAllTeamCategoryInfoToProgressData({
            data: statisticAllTeamCategoryList.largeCategories,
          });
          setProgressDataAllTeam(finalData);
        } else {
          setProgressDataAllTeam([]);
        }
        setProgressDataCategory([]);
        setProgressDataSmall([]);
        setProgressDataMedium([]);
        setProgressDataLarge([]);
      }
    }, [statisticAllTeamCategoryList, selectedOrganization?.value]);

    const handleClickTooltip = ({
      id,
      userId,
      type,
      organizationId,
    }: {
      id: number;
      userId: number;
      type: string;
      organizationId?: string;
    }) => {
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationLarge &&
                          formatTimeToJapanese(totalDurationLarge)}
                      </p>

                      {isLoadingOrganization ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {selectedOrganization?.value == ALL_TEAM_STATISTIC &&
                            progressDataAllTeam.length > 0 &&
                            progressDataAllTeam.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={() => {}}
                                isAllTeam
                                organizationId={item.organizationId}
                                handleClickChart={() => {}}
                                {...item}
                              />
                            ))}
                          {selectedOrganization?.value != ALL_TEAM_STATISTIC &&
                            progressDataLarge.length > 0 &&
                            progressDataLarge.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                organizationId={item.organizationId}
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                  organizationId,
                                }: {
                                  userId: number;
                                  tagId: number;
                                  organizationId?: string;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    type: EventWorkCategory.ALL,
                                    organizationId,
                                  });
                                }}
                                handleClickChart={(
                                  _data: OptionDropdownType,
                                ) => {}}
                                {...item}
                              />
                            ))}
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
                      {progressDataMedium.length > 0 && (
                        <p className="text-sm text-black my-[26px]">
                          合計{' '}
                          {totalDurationMedium &&
                            formatTimeToJapanese(totalDurationMedium)}
                        </p>
                      )}
                      {isLoadingLarge ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataMedium.length > 0 &&
                            progressDataMedium.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                }: {
                                  userId: number;
                                  tagId: number;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    type: EventWorkCategory.LARGE,
                                  });
                                }}
                                handleClickChart={(
                                  _data: OptionDropdownType,
                                ) => {}}
                                {...item}
                              />
                            ))}
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
                      {progressDataSmall.length > 0 && (
                        <p className="text-sm text-black my-[26px]">
                          合計{' '}
                          {totalDurationSmall &&
                            formatTimeToJapanese(totalDurationSmall)}
                        </p>
                      )}
                      {isLoadingMedium ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataSmall.length > 0 &&
                            progressDataSmall.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                }: {
                                  userId: number;
                                  tagId: number;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    type: EventWorkCategory.MEDIUM,
                                  });
                                }}
                                {...item}
                              />
                            ))}
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
                      {progressDataCategory.length > 0 && (
                        <p className="text-sm text-black my-[26px]">
                          合計{' '}
                          {totalDurationCategory &&
                            formatTimeToJapanese(totalDurationCategory)}
                        </p>
                      )}
                      {isLoadingSmall ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataCategory.length > 0 &&
                            progressDataCategory.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                isLast
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                }: {
                                  userId: number;
                                  tagId: number;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    type: EventWorkCategory.SMALL,
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
          <ListTaskDetailStatisticTagModal
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
            handleScroll={handleScroll}
          />
        )}
      </>
    );
  },
);

export default AllocationTeamTag;
