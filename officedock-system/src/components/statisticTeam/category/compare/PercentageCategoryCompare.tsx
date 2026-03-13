import React, { useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompareTeam from '@components/common/ProgressBar/ProgressBarCompareTeam';
// Currently using for ALL TEAM taken from my dock
import PercentageBarCompare from '@components/common/ProgressBar/ProgressBarCompare';

import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';

import { lightenColor } from '@utils';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import FilterTeamStatistic from '../filter/FilterTeamStatistic';
import { ALL_TEAM_STATISTIC, SUB_TEAMS } from '@constants';
import { EventWorkCategory } from '@constants/enums';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  statisticCategoryListTeamCompare: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  statisticAllTeamCategoryCompareList: StatisticsAllTeams | undefined;
  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectOrganizationCustom: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageTeamCategoryCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticCategoryListTeamCompare,
  statisticTeamCategoryList,
  statisticAllTeamCategoryList,
  statisticAllTeamCategoryCompareList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
  handleSelectOrganizationCustom,
}: Props) => {
  const {
    isDisableCalendar,
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    isHasLoading,
  } = useContext(StatisticTeamStateContext);

  const [isExtendData, setIsExtendData] = useState(true);

  // Data value
  const [dataChartLarge, setDataChartLarge] = useState<
    DataPercentCompareType[]
  >([]);
  const [dataChartMedium, setDataChartMedium] = useState<
    DataPercentCompareType[]
  >([]);
  const [dataChartSmall, setDataChartSmall] = useState<
    DataPercentCompareType[]
  >([]);
  // Data value compare
  const [dataChartLargeCompare, setDataChartLargeCompare] = useState<
    DataPercentCompareType[]
  >([]);
  const [dataChartMediumCompare, setDataChartMediumCompare] = useState<
    DataPercentCompareType[]
  >([]);
  const [dataChartSmallCompare, setDataChartSmallCompare] = useState<
    DataPercentCompareType[]
  >([]);

  const mapCategoryData = (
    dataCategories: StatisticCategoryInfo[],
    colorData?: string,
  ) => {
    if (!dataCategories) return [];
    const categories = dataCategories.filter((item) => item.percent > 0);

    const otherItems = categories.filter((item) => item.percent < 10);
    const mainItems = categories.filter((item) => item.percent >= 10);

    const otherItem = {
      id: -1,
      label: 'その他',
      percentage: otherItems.reduce((sum, item) => sum + item.percent, 0),
      mergedItems: otherItems.map((item) => ({
        ...item,
        categoryColor:
          item.categoryColor ||
          (colorData && lightenColor(colorData, item.percent)) ||
          '#83919e',
      })),
      color: colorData || '#83919e',
      totalDuration: '',
      optionData: otherItems
        .flatMap((item) =>
          item.users?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: item.percent,
                avatarColor: user.user.avatarColor,
                avatarUrl: user.user?.avatar || '',
              };
            }
            return undefined;
          }),
        )
        .filter(
          (
            item,
          ): item is {
            label: string;
            percent: number;
            avatarColor: string;
            avatarUrl: string;
          } => !!item,
        ),
    };

    const mappedMainItems = mainItems.map((item) => ({
      id: item.categoryId,
      label: item.categoryName,
      percentage: item.percent,
      color:
        item.categoryColor ||
        (colorData && lightenColor(colorData as string, item.percent)) ||
        '#83919e',
      totalDuration: item.duration,
      optionData:
        item.users
          ?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: user.percent,
                avatarColor: user.user.avatarColor,
                avatarUrl: user.user?.avatar || '',
              };
            }
            return undefined;
          })
          .filter(
            (
              user,
            ): user is {
              label: string;
              percent: number;
              avatarColor: string;
              avatarUrl: string;
            } => !!user,
          ) || [],
      mergedItems: [],
    }));

    return [
      ...mappedMainItems,
      ...(otherItem.percentage > 0 ? [otherItem] : []),
    ];
  };
  const mapCategoryDataWithAllTeamOption = (
    dataCategories: StatisticAllTeamInfo[],
  ) => {
    if (!dataCategories) return [];
    const categories = dataCategories.filter((item) => item.percent >= 0);

    const mappedMainItems = categories.map((item) => ({
      id: item.organizationId,
      label: item?.organizationName || '',
      percentage: item.percent,
      organizationId: item.organizationId,
      color: item.color || '#83919e',
      totalDuration: item.duration,
      optionData:
        item.organizationId == SUB_TEAMS
          ? item?.subTeams?.slice(0, 3).map((team) => {
              return { label: team?.organizationName || '' };
            }) || []
          : item?.data?.slice(0, 3).map((category) => {
              return { label: category?.categoryName || '' };
            }) || [],
      mergedItems: [],
    }));

    return [...mappedMainItems];
  };

  // Set data from category list
  useEffect(() => {
    if (
      statisticTeamCategoryList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      const color =
        statisticTeamCategoryList.largeCategories &&
        statisticTeamCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );

      setDataChartLarge(
        mapCategoryData(statisticTeamCategoryList.largeCategories || []),
      );
      setDataChartMedium(
        mapCategoryData(
          statisticTeamCategoryList.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmall(
        mapCategoryData(
          statisticTeamCategoryList.smallCategories || [],
          color?.categoryColor,
        ),
      );
    }
  }, [selectedLarge?.value, selectedOrganization, statisticTeamCategoryList]);

  // Set data from category compare list
  useEffect(() => {
    if (
      statisticCategoryListTeamCompare &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      const color =
        statisticCategoryListTeamCompare &&
        statisticCategoryListTeamCompare.largeCategories?.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      setDataChartLargeCompare(
        mapCategoryData(statisticCategoryListTeamCompare.largeCategories || []),
      );
      setDataChartMediumCompare(
        mapCategoryData(
          statisticCategoryListTeamCompare.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmallCompare(
        mapCategoryData(
          statisticCategoryListTeamCompare.smallCategories || [],
          color?.categoryColor,
        ),
      );
    }
  }, [
    selectedLarge?.value,
    selectedOrganization,
    statisticCategoryListTeamCompare,
  ]);

  // With ALL TEM

  useEffect(() => {
    if (
      statisticAllTeamCategoryList &&
      selectedOrganization?.value == ALL_TEAM_STATISTIC
    ) {
      setDataChartLarge(
        mapCategoryDataWithAllTeamOption(
          statisticAllTeamCategoryList.largeCategories || [],
        ),
      );
      setDataChartMedium([]);
      setDataChartSmall([]);
    }
  }, [statisticAllTeamCategoryList, selectedOrganization?.value]);

  useEffect(() => {
    if (
      statisticAllTeamCategoryCompareList &&
      selectedOrganization?.value == ALL_TEAM_STATISTIC
    ) {
      setDataChartLargeCompare(
        mapCategoryDataWithAllTeamOption(
          statisticAllTeamCategoryCompareList.largeCategories || [],
        ),
      );
      setDataChartMediumCompare([]);
      setDataChartSmallCompare([]);
    }
  }, [statisticAllTeamCategoryCompareList, selectedOrganization?.value]);

  const [hasHover, setHasHover] = useState<string>('');

  return (
    <>
      <div
        style={{
          boxShadow: '0px 4px 10px 0px #0000000D',
        }}
        className="p-[30px] bg-[#F8FAFC] rounded-[30px]">
        {/* Header & sort */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-x-5">
            <div className="flex items-center gap-[10px] w-fit flex-shrink-0 ">
              <ImageRound
                className={`w-5 h-5  hover:cursor-pointer`}
                name="statistic-active icon"
                src={`/icons/statistic-active.svg`}
              />
              <span className="text-black w-fit flex-shrink-0w-fit flex-shrink-0 font-semibold text-[18px]">
                カテゴリーの割合
              </span>
            </div>
            {/* Filter modal */}
            <FilterTeamStatistic />
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
              <div className="flex justify-between px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                    大カテゴリー
                  </div>
                  <div className="mt-4 ">
                    <Dropdown
                      label="チーム選択"
                      placeholder="-"
                      disabled={isHasLoading}
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      classNameOption="!text-sm"
                      options={listOptionsOrganization}
                      selectedOption={selectedOrganization || undefined}
                      onChange={(data) => handleSelectOrganization(data)}
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      {selectedOrganization?.value == ALL_TEAM_STATISTIC ? (
                        <PercentageBarCompare
                          showNoDataText
                          data={dataChartLarge}
                          startDate={startDate}
                          endDate={endDate}
                          hasHover={hasHover != EventWorkCategory.LARGE}
                          onActionHover={() =>
                            setHasHover(EventWorkCategory.LARGE)
                          }
                          totalDuration={totalDurationLarge}
                          isLoading={isLoadingOrganization}
                          isLoadingCompare={isLoadingOrganizationCompare}
                          totalDurationCompare={totalDurationLargeCompare}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartLargeCompare}
                          isAllTeamOption={
                            selectedOrganization?.value == ALL_TEAM_STATISTIC
                          }
                          handleClickChart={() => {}}
                          handleClickTooltip={() => {}}
                        />
                      ) : (
                        <PercentageBarCompareTeam
                          showNoDataText
                          data={dataChartLarge}
                          startDate={startDate}
                          endDate={endDate}
                          hasHover={hasHover != EventWorkCategory.LARGE}
                          onActionHover={() =>
                            setHasHover(EventWorkCategory.LARGE)
                          }
                          isLoading={isLoadingOrganization}
                          isLoadingCompare={isLoadingOrganizationCompare}
                          totalDuration={totalDurationLarge}
                          totalDurationCompare={totalDurationLargeCompare}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartLargeCompare}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: OptionDropdownType) => {
                            selectedOrganization &&
                              handleSelectOrganizationCustom(
                                selectedOrganization,
                              );
                            handleSelectLarge(data);
                          }}
                          tooltipDelay={0}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <ImageRound
                    className={`w-fit h-fit `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 2 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                    中カテゴリー
                  </div>
                  <div className="mt-4">
                    <Dropdown
                      label="大カテゴリー選択"
                      placeholder="-"
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      classNameOption="!text-sm"
                      options={largeOptions}
                      selectedOption={selectedLarge || undefined}
                      onChange={(data) => handleSelectLarge(data)}
                      disabled={!selectedOrganization || isHasLoading}
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        showNoDataText={selectedLarge?.value !== ''}
                        data={dataChartMedium}
                        startDate={startDate}
                        endDate={endDate}
                        hasHover={hasHover != EventWorkCategory.MEDIUM}
                        onActionHover={() =>
                          setHasHover(EventWorkCategory.MEDIUM)
                        }
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        isLoading={isLoadingLarge}
                        isLoadingCompare={isLoadingLargeCompare}
                        dataCompare={dataChartMediumCompare}
                        totalDuration={totalDurationMedium}
                        totalDurationCompare={totalDurationMediumCompare}
                        handleClickTooltip={() => {}}
                        handleClickChart={(data: OptionDropdownType) => {
                          handleSelectMedium(data);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <ImageRound
                    className={`w-fit h-fit `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 3 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                    小カテゴリー
                  </div>
                  <div className="mt-4">
                    <Dropdown
                      label="中カテゴリー選択"
                      placeholder="-"
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm !py-0 font-normal !border-[#77858F]"
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
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        showNoDataText={selectedMedium?.value !== ''}
                        isLast
                        data={dataChartSmall}
                        startDate={startDate}
                        endDate={endDate}
                        hasHover={hasHover != EventWorkCategory.SMALL}
                        onActionHover={() =>
                          setHasHover(EventWorkCategory.SMALL)
                        }
                        isLoading={isLoadingMedium}
                        isLoadingCompare={isLoadingMediumCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartSmallCompare}
                        totalDuration={totalDurationSmall}
                        totalDurationCompare={totalDurationSmallCompare}
                        handleClickTooltip={() => {}}
                        handleClickChart={(data: OptionDropdownType) => {
                          handleSelectSmall(data);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PercentageTeamCategoryCompare;
