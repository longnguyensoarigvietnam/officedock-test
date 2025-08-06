import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import ProgressBarTeamStatistic from './ProgressBarTeamStatistic';
// Currently using for ALL TEAM taken from my dock
import ProgressBarStatistic from '@components/statistic/category/ProgressBarStatistic';

import { EventWorkCategory } from '@constants/enums';
import { ALL_TEAM_STATISTIC, NO_SETTING } from '@constants';

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

import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import FilterTeamStatistic from './filter/FilterTeamStatistic';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
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
  colorData,
}: {
  data: StatisticCategoryInfo[];
  mergeLabel?: string;
  mergeColor?: string;
  threshold?: number;
  colorData?: string;
}): {
  finalData: ProgressDataTypeTeam[];
  mergedItem?: ProgressDataTypeTeam;
} {
  const progressData: ProgressDataTypeTeam[] = data.map((item) => ({
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

const AllocationTeamCategory = memo(
  ({
    startDate,
    endDate,
    statisticTeamCategoryList,
    statisticAllTeamCategoryList,
    handleSelectOrganization,
    handleSelectLarge,
    handleSelectMedium,
    handleSelectSmall,
  }: Props) => {
    const [isExtendData, setIsExtendData] = useState(true);
    const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
    const [isShowModal, setIsShowModal] = useState(false);

    const [detailCategory, setDetailCategory] = useState<{
      id: number | null;
      userId: number;
      type: string;
      userDuration: string;
      organizationId?: string;
    } | null>(null);

    const [progressDataLarge, setProgressDataLarge] = useState<
      ProgressDataTypeTeam[]
    >([]);
    const [progressDataLargeAllTeam, setProgressDataLargeAllTeam] = useState<
      ProgressDataType[]
    >([]);

    const [progressDataMedium, setProgressDataMedium] = useState<
      ProgressDataTypeTeam[]
    >([]);
    const [progressDataSmall, setProgressDataSmall] = useState<
      ProgressDataTypeTeam[]
    >([]);

    const {
      isDisableCalendar,
      isHasLoading,
      orderingOptions,
      totalDurationLarge,
      totalDurationMedium,
      totalDurationSmall,
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
    } = useContext(StatisticTeamStateContext);

    useEffect(() => {
      if (
        statisticTeamCategoryList &&
        selectedOrganization?.value != ALL_TEAM_STATISTIC
      ) {
        if (statisticTeamCategoryList.largeCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTeamCategoryList.largeCategories,
          });
          setProgressDataLarge(finalData);
        } else {
          setProgressDataLarge([]);
        }
        if (statisticTeamCategoryList.mediumCategories) {
          const color = statisticTeamCategoryList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTeamCategoryList.mediumCategories,
            colorData: color,
          });
          setProgressDataMedium(finalData);
        } else {
          setProgressDataMedium([]);
        }
        if (statisticTeamCategoryList.smallCategories) {
          const color = statisticTeamCategoryList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;

          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTeamCategoryList.smallCategories,
            colorData: color,
          });

          setProgressDataSmall(finalData);
        } else {
          setProgressDataSmall([]);
        }
      }
    }, [
      selectedLarge?.value,
      selectedOrganization?.value,
      statisticTeamCategoryList,
    ]);
    useEffect(() => {
      if (
        statisticAllTeamCategoryList &&
        selectedOrganization?.value == ALL_TEAM_STATISTIC
      ) {
        if (statisticAllTeamCategoryList.largeCategories) {
          const { finalData } = mapStatisticAllTeamCategoryInfoToProgressData({
            data: statisticAllTeamCategoryList.largeCategories,
          });
          setProgressDataLargeAllTeam(finalData);
        } else {
          setProgressDataLargeAllTeam([]);
        }
        setProgressDataLarge([]);
        setProgressDataMedium([]);
        setProgressDataSmall([]);
      }
    }, [statisticAllTeamCategoryList, selectedOrganization?.value]);

    const handleClickTooltip = ({
      id,
      userId,
      userDuration,
      type,
      organizationId,
    }: {
      id: number;
      userId: number;
      userDuration: string;
      type: string;
      organizationId?: string;
    }) => {
      setDetailCategory({
        id: id,
        userId: userId,
        type: type,
        userDuration,
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
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationLarge &&
                          formatTimeToJapanese(totalDurationLarge)}
                      </p>

                      {isLoadingOrganization ? (
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {selectedOrganization?.value == ALL_TEAM_STATISTIC &&
                            progressDataLargeAllTeam.length > 0 &&
                            progressDataLargeAllTeam.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                isAllTeam={
                                  selectedOrganization?.value ==
                                  ALL_TEAM_STATISTIC
                                }
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={() => {}}
                                organizationId={item.organizationId}
                                handleClickChart={() => {}}
                                {...item}
                              />
                            ))}

                          {progressDataLarge.length > 0 &&
                            selectedOrganization?.value != ALL_TEAM_STATISTIC &&
                            progressDataLarge.map((item, index) => (
                              <ProgressBarTeamStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
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
                                handleClickTooltip={({
                                  userId,
                                  categoryId,
                                  userDuration,
                                  organizationId,
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  userDuration: string;
                                  organizationId?: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    type: EventWorkCategory.ALL,
                                    userDuration,
                                    organizationId,
                                  });
                                }}
                                startDate={startDate}
                                endDate={endDate}
                                organizationId={item.organizationId}
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
                        disabled={!selectedOrganization || isHasLoading}
                      />
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationMedium &&
                          formatTimeToJapanese(totalDurationMedium)}
                      </p>
                      {isLoadingLarge ? (
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataMedium.length > 0 &&
                            progressDataMedium.map((item, index) => (
                              <ProgressBarTeamStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  categoryId,
                                  userDuration,
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  userDuration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    type: EventWorkCategory.LARGE,
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
                                startDate={startDate}
                                endDate={endDate}
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
                          !selectedLarge || isHasLoading || isDisableCalendar
                        }
                      />
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationSmall &&
                          formatTimeToJapanese(totalDurationSmall)}
                      </p>
                      {isLoadingMedium ? (
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataSmall.length > 0 &&
                            progressDataSmall.map((item, index) => (
                              <ProgressBarTeamStatistic
                                key={index}
                                startDate={startDate}
                                endDate={endDate}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  categoryId,
                                  userDuration,
                                }: {
                                  userId: number;
                                  categoryId: number;
                                  userDuration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: categoryId,
                                    userId,
                                    type: EventWorkCategory.MEDIUM,
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
            startDate={startDate}
            endDate={endDate}
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

export default AllocationTeamCategory;
