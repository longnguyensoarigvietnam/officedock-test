import React, { useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompare from '@components/common/ProgressBar/ProgressBarCompare';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';

import { EventWorkCategory } from '@constants/enums';
import { getRandomColor, lightenColor } from '@utils';
import { LoadingContext } from '@providers/LoadingProvider';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import FilterTag from '../filter/FilterTag';
import { ALL_TEAM_STATISTIC, SUB_TEAMS } from '@constants';

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

const PercentageTagsCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticTagsCompareList,
  statisticTagsList,
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
  } = useContext(StatisticTagStateContext);
  const { setIsLoading } = useContext(LoadingContext);

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
    const categories = dataCategories.filter((item) => item.percent >= 0);

    const otherItems = categories.filter((item) => item.percent < 0);
    const mainItems = categories.filter((item) => item.percent >= 0);

    const otherItem = {
      id: -1,
      label: 'その他',
      percentage: otherItems.reduce((sum, item) => sum + item.percent, 0),
      color: colorData || getRandomColor(),
      totalDuration: '',
      optionData: otherItems.flatMap((item) =>
        item.tasks.map((task) => ({
          label: task.title,
        })),
      ),
      mergedItems: otherItems.map((item) => ({ ...item })),
    };

    const mappedMainItems = mainItems.map((item) => ({
      id: item.tagId as number,
      label: item.tagName || '',
      percentage: item.percent,
      color:
        lightenColor(colorData as string, item.percent) || getRandomColor(),
      totalDuration: item.duration,
      optionData: item.tasks.map((task) => ({
        label: task.title,
      })),
      mergedItems: [],
      organizationId: item.organizationId,
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
      statisticTagsList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      setDataChartLarge(
        mapCategoryData(statisticTagsList.largeCategories || []),
      );
      setDataChartMedium(
        mapCategoryData(statisticTagsList.mediumCategories || [], '#2E9267'),
      );
      setDataChartSmall(
        mapCategoryData(statisticTagsList.smallCategories || [], '#2E9267'),
      );
      setDataChartCategory(
        mapCategoryData(statisticTagsList.category || [], '#2E9267'),
      );
      setIsLoading(false);
    }
  }, [selectedOrganization?.value, statisticTagsList]);

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

  // Set data from category compare list
  useEffect(() => {
    if (
      statisticTagsCompareList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      setDataChartLargeCompare(
        mapCategoryData(statisticTagsCompareList.largeCategories || []),
      );
      setDataChartMediumCompare(
        mapCategoryData(
          statisticTagsCompareList.mediumCategories || [],
          '#2E9267',
        ),
      );
      setDataChartSmallCompare(
        mapCategoryData(
          statisticTagsCompareList.smallCategories || [],
          '#2E9267',
        ),
      );
      setDataChartCategoryCompare(
        mapCategoryData(statisticTagsCompareList.category || [], '#2E9267'),
      );
      setIsLoading(false);
    }
  }, [selectedOrganization?.value, statisticTagsCompareList]);

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
    const item = largeOptions.find((item) => item.value === detailCategory?.id);
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
              <div className="flex gap-[10px] justify-between px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[220px]">
                  <div className="mt-4 ">
                    <div className="w-[220px]">
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
                    </div>
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompare
                        isTag
                        isAllTeamOption={
                          selectedOrganization?.value == ALL_TEAM_STATISTIC
                        }
                        data={dataChartLarge}
                        startDate={startDate}
                        endDate={endDate}
                        isLoading={isLoadingOrganization}
                        isLoadingCompare={isLoadingOrganizationCompare}
                        totalDuration={totalDurationLarge}
                        totalDurationCompare={totalDurationLargeCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartLargeCompare}
                        handleClickChart={() => {}}
                        handleClickTooltip={(
                          id: number | null,
                          isCompare: boolean,
                          organizationId?: string,
                        ) => {
                          handleClickTooltip(
                            id,
                            EventWorkCategory.ALL,
                            isCompare,
                            organizationId,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="w-[18px]">
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
                      <PercentageBarCompare
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
                        handleClickChart={() => {}}
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
                      <PercentageBarCompare
                        isTag
                        data={dataChartSmall}
                        startDate={startDate}
                        endDate={endDate}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartSmallCompare}
                        totalDuration={totalDurationSmall}
                        totalDurationCompare={totalDurationSmallCompare}
                        isLoading={isLoadingMedium}
                        isLoadingCompare={isLoadingMediumCompare}
                        handleClickChart={() => {}}
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
                <div className="w-[18px]">
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
                      <PercentageBarCompare
                        isTag
                        isLast
                        data={dataChartCategory}
                        startDate={startDate}
                        endDate={endDate}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartCategoryCompare}
                        totalDuration={totalDurationCategory}
                        totalDurationCompare={totalDurationCategoryCompare}
                        isLoading={isLoadingSmall}
                        isLoadingCompare={isLoadingSmallCompare}
                        handleClickChart={() => {}}
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
};

export default PercentageTagsCompare;
