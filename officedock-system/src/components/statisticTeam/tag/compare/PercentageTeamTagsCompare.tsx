import React, { useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompareTeam from '@components/common/ProgressBar/ProgressBarCompareTeam';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

import { EventWorkCategory } from '@constants/enums';

import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';
import { getRandomColor, lightenColor } from '@utils';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { ALL_TEAM_STATISTIC, SUB_TEAMS } from '@constants';
import FilterTagTeam from '../filter/FilterTagTeam';
import FilterTagUserTeam from '../filter/FilterTagUserTeam';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsListTeam: StatisticsCategories | undefined;
  statisticTagsListTeamCompare: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  statisticAllTeamCategoryCompareList: StatisticsAllTeams | undefined;
  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageTeamTagsCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticTagsListTeamCompare,
  statisticTagsListTeam,
  statisticAllTeamCategoryList,
  statisticAllTeamCategoryCompareList,
  handleSelectSmall,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectOrganization,
}: Props) => {
  const {
    isDisableCalendar,
    isHasLoading,
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationCategory,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationCategoryCompare,
    smallOptions,
    selectedSmall,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingSmall,
    isLoadingOrganizationCompare,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingSmallCompare,
  } = useContext(StatisticTeamTagsStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isShowModal, setIsShowModal] = useState(false);
  const [isShowModalCompare, setIsShowModalCompare] = useState(false);

  const [detailCategory, setDetailCategory] = useState<{
    id: number | null;
    type: string;
  } | null>(null);

  const [detailCategoryCompare, setDetailCategoryCompare] = useState<{
    id: number | null;
    type: string;
  } | null>(null);

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
  const [dataChartCategory, setDataChartCategory] = useState<
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
  const [dataChartCategoryCompare, setDataChartCategoryCompare] = useState<
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
      color:
        colorData ||
        lightenColor(
          colorData as string,
          otherItems.reduce((sum, item) => sum + item.percent, 0),
        ),
      totalDuration: '',
      mergedItems: otherItems.map((item) => ({
        ...item,
        categoryColor: lightenColor(colorData as string, item.percent),
      })),
      optionData: otherItems
        .flatMap((item) =>
          item.users?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: user.percent,
                avatarColor: user.user.avatarColor,
              };
            }
            return undefined;
          }),
        )
        .filter(
          (
            item,
          ): item is { label: string; percent: number; avatarColor: string } =>
            !!item,
        ),
    };

    const mappedMainItems = mainItems.map((item) => ({
      id: item.tagId as number,
      label: item.tagName || '',
      percentage: item.percent,
      color:
        lightenColor(colorData as string, item.percent) || getRandomColor(),
      totalDuration: item.duration,
      optionData:
        item.users
          ?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: user.percent,
                avatarColor: user.user.avatarColor,
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
      color: item.color || getRandomColor(),
      totalDuration: item.duration,
      optionData:
        item.organizationId == SUB_TEAMS
          ? item?.subTeams?.slice(0, 3).map((team) => {
              return { label: team?.organizationName || '' };
            }) || []
          : item?.data?.slice(0, 3).map((category) => {
              return { label: category?.tagName || '' };
            }) || [],
      mergedItems: [],
    }));

    return [...mappedMainItems];
  };

  // Set data from category list
  useEffect(() => {
    if (
      statisticTagsListTeam &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      const color =
        statisticTagsListTeam.largeCategories &&
        statisticTagsListTeam.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      const colorMedium =
        statisticTagsListTeam.mediumCategories &&
        statisticTagsListTeam.mediumCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      setDataChartLarge(
        mapCategoryData(statisticTagsListTeam.largeCategories || []),
      );
      setDataChartMedium(
        mapCategoryData(
          statisticTagsListTeam.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmall(
        mapCategoryData(
          statisticTagsListTeam.smallCategories || [],
          colorMedium?.categoryColor,
        ),
      );
      setDataChartCategory(
        mapCategoryData(statisticTagsListTeam.category || [], '#2E9267'),
      );
    }
  }, [
    selectedLarge?.value,
    selectedOrganization?.value,
    statisticTagsListTeam,
  ]);

  // Set data from category compare list
  useEffect(() => {
    if (
      statisticTagsListTeamCompare &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      setDataChartLargeCompare(
        mapCategoryData(statisticTagsListTeamCompare.largeCategories || []),
      );
      setDataChartMediumCompare(
        mapCategoryData(
          statisticTagsListTeamCompare.mediumCategories || [],
          '#2E9267',
        ),
      );
      setDataChartSmallCompare(
        mapCategoryData(
          statisticTagsListTeamCompare.smallCategories || [],
          '#2E9267',
        ),
      );
      setDataChartCategoryCompare(
        mapCategoryData(statisticTagsListTeamCompare.category || [], '#2E9267'),
      );
    }
  }, [selectedOrganization?.value, statisticTagsListTeamCompare]);

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
      setDataChartCategory([]);
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
      setDataChartCategoryCompare([]);
    }
  }, [statisticAllTeamCategoryCompareList, selectedOrganization?.value]);

  const handleClickTooltip = (
    id: number | null,
    type: string,
    isCompare: boolean,
  ) => {
    if (isCompare) {
      setDetailCategoryCompare({
        id: id,
        type: type,
      });

      setIsShowModalCompare(true);
    } else {
      setDetailCategory({
        id: id,
        type: type,
      });

      setIsShowModal(true);
    }
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
        className="p-[30px] bg-[#F8FAFC] rounded-[30px]">
        {/* Header & sort */}
        <div className="flex justify-between">
          <div className="flex items-center gap-x-5">
            <div className="flex items-center gap-[10px] ">
              <ImageRound
                className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                name="statistic-active icon"
                src={`/icons/statistic-active.svg`}
              />
              <span className="text-black font-semibold text-[18px] relative top-[2px]">
                カテゴリーごとのタグの割合
              </span>
            </div>
            <div className="flex items-center gap-1 ">
              <FilterTagUserTeam />
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
                <div className="flex justify-between w-full">
                  {/* Filter tag */}
                  <FilterTagTeam />
                </div>
                <div className="flex items-center mt-8  gap-1 mb-[30px]">
                  <ImageRound
                    className={`w-[14px] h-[14px]  hover:cursor-pointer relative top-[2px]`}
                    name="Sort icon"
                    src={`/icons/sort.svg`}
                  />
                  <span className="text-xs text-[#77858F] relative top-[2px]">
                    タグの絞り込み
                  </span>
                </div>
              </div>
              <div className="flex justify-between px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[220px]">
                  <div className="mt-4 ">
                    <Dropdown
                      label="チーム選択"
                      placeholder="-"
                      disabled={isHasLoading}
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={listOptionsOrganization}
                      selectedOption={selectedOrganization || undefined}
                      onChange={(data) => handleSelectOrganization(data)}
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-centers">
                      <PercentageBarCompareTeam
                        isTag
                        data={dataChartLarge}
                        startDate={startDate}
                        endDate={endDate}
                        isAllTeam
                        isLoading={isLoadingOrganization}
                        isLoadingCompare={isLoadingOrganizationCompare}
                        totalDuration={totalDurationLarge}
                        totalDurationCompare={totalDurationLargeCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartLargeCompare}
                        handleClickChart={(_data: string) => {}}
                        handleClickTooltip={(
                          id: number | null,
                          isCompare: boolean,
                        ) => {
                          handleClickTooltip(
                            id,
                            EventWorkCategory.ALL,
                            isCompare,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <ImageRound
                    className={`w-fit h-fit relative top-9 `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 2 */}
                <div className="w-[220px]">
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
                        isTag
                        data={dataChartMedium}
                        startDate={startDate}
                        endDate={endDate}
                        isLoading={isLoadingLarge}
                        isLoadingCompare={isLoadingLargeCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartMediumCompare}
                        totalDuration={totalDurationMedium}
                        totalDurationCompare={totalDurationMediumCompare}
                        handleClickChart={(_data: string) => {}}
                        handleClickTooltip={(
                          id: number | null,
                          isCompare: boolean,
                        ) => {
                          handleClickTooltip(
                            id,
                            EventWorkCategory.LARGE,
                            isCompare,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <ImageRound
                    className={`w-fit h-fit relative top-9 `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 3 */}
                <div className="w-[220px]">
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
                        !selectedLarge || isHasLoading || isDisableCalendar
                      }
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        isTag
                        data={dataChartSmall}
                        startDate={startDate}
                        endDate={endDate}
                        isLoading={isLoadingMedium}
                        isLoadingCompare={isLoadingMediumCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartSmallCompare}
                        totalDuration={totalDurationSmall}
                        totalDurationCompare={totalDurationSmallCompare}
                        handleClickChart={(_data: string) => {}}
                        handleClickTooltip={(
                          id: number | null,
                          isCompare: boolean,
                        ) => {
                          handleClickTooltip(
                            id,
                            EventWorkCategory.MEDIUM,
                            isCompare,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <ImageRound
                    className={`w-fit h-fit relative top-9 `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 4 */}
                <div className="w-[220px]">
                  <div className="mt-4">
                    <Dropdown
                      label="小カテゴリー選択"
                      placeholder="-"
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm !py-0 font-normal !border-[#77858F]"
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
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        isTag
                        isLast
                        data={dataChartCategory}
                        startDate={startDate}
                        endDate={endDate}
                        isLoading={isLoadingSmall}
                        isLoadingCompare={isLoadingSmallCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartCategoryCompare}
                        totalDuration={totalDurationCategory}
                        totalDurationCompare={totalDurationCategoryCompare}
                        handleClickChart={(_data: string) => {}}
                        handleClickTooltip={(
                          id: number | null,
                          isCompare: boolean,
                        ) => {
                          handleClickTooltip(
                            id,
                            EventWorkCategory.SMALL,
                            isCompare,
                          );
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
      {isShowModal && (
        <ListTaskDetailStatisticTagModal
          open={isShowModal}
          selectedLarge={selectedLarge}
          selectedMedium={selectedMedium}
          selectedSmall={selectedSmall}
          startDate={startDate}
          endDate={endDate}
          detailCategory={detailCategory}
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
          handleScroll={handleScroll}
        />
      )}
    </>
  );
};

export default PercentageTeamTagsCompare;
