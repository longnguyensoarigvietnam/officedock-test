import React, { useEffect, useState, useContext } from 'react';
import PieChart from '@components/common/Chart/PieChartCustom';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import { DataChartType, OptionDropdownType } from '@interfaces/common';
import {
  DataTaskModalStatisticType,
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';

import { convertToJapaneseTime, formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import FilterTeamStatistic from './filter/FilterTeamStatistic';
import { ALL_TEAM_STATISTIC, SUB_TEAMS } from '@constants';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;

  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectOrganizationCustom: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const PercentageCategoryTeam = ({
  statisticTeamCategoryList,
  statisticAllTeamCategoryList,
  handleSelectLarge,
  handleSelectMedium,
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
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isHasLoading,
  } = useContext(StatisticTeamStateContext);

  const [isExtendData, setIsExtendData] = useState(true);

  const [dataChartLarge, setDataChartLarge] = useState<DataChartType>({
    actualValue: [],
    colors: [],
    data: [],
    labels: [],
    optionData: [],
    listId: [],
    listDuration: [],
    mergedItems: [],
  });

  const [dataChartMedium, setDataChartMedium] = useState<DataChartType>({
    actualValue: [],
    colors: [],
    data: [],
    labels: [],
    optionData: [],
    listId: [],
    listDuration: [],
    mergedItems: [],
  });
  const [dataChartSmall, setDataChartSmall] = useState<DataChartType>({
    actualValue: [],
    colors: [],
    data: [],
    labels: [],
    optionData: [],
    listId: [],
    listDuration: [],
    mergedItems: [],
  });

  const processChartData = (
    dataCategories: StatisticCategoryInfo[],
    colorData?: string,
  ) => {
    const categories = dataCategories.filter((item) => item.percent > 0);
    const mergedItems: StatisticCategoryInfo[] = [];
    const mergedCategory: StatisticCategoryInfo = {
      categoryName: 'その他',
      categoryColor: colorData || '#83919e',
      percent: 0,
      duration: '',
      tasks: [] as DataTaskModalStatisticType[],
      users: [] as UserListStatisticType[],
      categoryId: -1,
    };

    const filteredCategories = categories.filter((item) => {
      if (item.percent < 10) {
        mergedItems.push({
          ...item,
          categoryColor:
            item.categoryColor ||
            (colorData && lightenColor(colorData, item.percent)) ||
            '#83919e',
        });

        mergedCategory.percent += item.percent;
        mergedCategory.duration += item.duration;
        mergedCategory.categoryColor =
          item.categoryColor ||
          (colorData && lightenColor(colorData, item.percent)) ||
          '#83919e';
        mergedCategory.tasks = mergedCategory.tasks.concat(item.tasks);
        mergedCategory.users = mergedCategory.users?.concat(item.users || []);

        return false;
      }
      return true;
    });

    if (mergedCategory.percent > 0) {
      filteredCategories.push(mergedCategory);
    }

    // Get list percent
    const listPercent = filteredCategories.map((percent) => percent.percent);

    // Get list color
    const listColor = filteredCategories.map(
      (color, index) =>
        color.categoryColor ||
        (colorData && lightenColor(colorData as string, listPercent[index])) ||
        '#83919e',
    );
    // Get list label
    const listLabel = filteredCategories.map((label) => label.categoryName);
    // Get list value
    const listValueActualChart = filteredCategories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = filteredCategories.map(
      (item) =>
        item.users?.map((user) => ({
          label: user.user.fullName,
          avatarColor: user.user.avatarColor,
          percent: user.percent,
          avatarUrl: user.user?.avatar || '',
        })) || [],
    );
    // Get list id
    const listDataIds = filteredCategories.map((item) => item.categoryId);
    // Get list duration
    const listDuration = filteredCategories.map(
      (item) => item.users?.map((user) => user.duration) || [],
    );

    return {
      colors: listColor,
      labels: listLabel,
      data: listPercent,
      actualValue: listValueActualChart,
      optionData: listDataOptions,
      listId: listDataIds,
      listDuration: listDuration,
      mergedItems: mergedItems,
    };
  };
  const processChartDataWithAllTeamOption = (
    dataCategories: StatisticAllTeamInfo[],
    colorData?: string,
  ) => {
    const categories = dataCategories.filter((item) => item.percent >= 0);

    // Get list percent
    const listPercent = categories.map((percent) => percent.percent);

    // Get list color
    const listColor = categories.map((color, index) =>
      color.color !== null
        ? color.color
        : lightenColor(colorData as string, listPercent[index]) ||
          getRandomColor(),
    );
    // Get list label
    const listLabel = categories.map((label) => label?.organizationName || '');
    // Get list value
    const listValueActualChart = categories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = categories.map((item) =>
      item.organizationId == SUB_TEAMS
        ? item?.subTeams?.slice(0, 3).map((team) => {
            return { label: team?.organizationName || '' };
          }) || []
        : item?.data?.slice(0, 3).map((category) => {
            return { label: category?.categoryName || '' };
          }) || [],
    );

    // Get list Organization for all team
    const listDataOrganizations = categories.map((org) =>
      String(org.organizationId),
    );

    // Get list id
    const listDataIds = categories.map((item) => item.organizationId);

    return {
      colors: listColor,
      labels: listLabel,
      data: listPercent,
      actualValue: listValueActualChart,
      optionData: listDataOptions,
      listId: listDataIds,
      dataOrganization: listDataOrganizations,
    };
  };

  useEffect(() => {
    if (
      statisticTeamCategoryList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      if (statisticTeamCategoryList.largeCategories) {
        const largeChartData = processChartData(
          statisticTeamCategoryList.largeCategories,
        );
        setDataChartLarge(largeChartData);
      } else {
        setDataChartLarge({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
      }
      if (statisticTeamCategoryList.mediumCategories) {
        const color = statisticTeamCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
        const mediumChartData = processChartData(
          statisticTeamCategoryList.mediumCategories,
          color?.categoryColor,
        );
        setDataChartMedium(mediumChartData);
      } else {
        setDataChartMedium({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
      }
      if (statisticTeamCategoryList.smallCategories) {
        const color = statisticTeamCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
        const smallChartData = processChartData(
          statisticTeamCategoryList.smallCategories,
          color?.categoryColor,
        );
        setDataChartSmall(smallChartData);
      } else {
        setDataChartSmall({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
      }
    }
  }, [selectedLarge, selectedOrganization, statisticTeamCategoryList]);

  // With ALL TEAM
  useEffect(() => {
    if (
      statisticAllTeamCategoryList &&
      selectedOrganization?.value == ALL_TEAM_STATISTIC
    ) {
      if (statisticAllTeamCategoryList.largeCategories) {
        const largeChartData = processChartDataWithAllTeamOption(
          statisticAllTeamCategoryList.largeCategories,
        );
        setDataChartLarge(largeChartData);
        setDataChartMedium({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
        setDataChartSmall({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
      } else {
        setDataChartLarge({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
        });
        setDataChartMedium({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
        setDataChartSmall({
          actualValue: [],
          colors: [],
          data: [],
          labels: [],
          optionData: [],
          listId: [],
          listDuration: [],
          mergedItems: [],
        });
      }
    }
  }, [statisticAllTeamCategoryList, selectedOrganization?.value]);

  return (
    <>
      <div
        style={{
          boxShadow: '0px 4px 10px 0px #0000000D',
        }}
        className="p-[30px] bg-[#F8FAFC] rounded-[30px]">
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
            <FilterTeamStatistic />
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
                {/* Pie Chart 1 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                    大カテゴリー
                  </div>
                  <div className="mt-4">
                    <div className="w-[300px] mx-auto">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        disabled={isHasLoading}
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
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
                    </div>
                    <div className="min-h-[280px] flex justify-center">
                      {isLoadingOrganization ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : dataChartLarge.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          mergedItems={dataChartLarge.mergedItems || []}
                          colors={dataChartLarge.colors}
                          data={dataChartLarge?.data}
                          labels={dataChartLarge?.labels}
                          actualValues={dataChartLarge?.actualValue}
                          className="w-[280px] h-[280px]"
                          optionsData={dataChartLarge.optionData}
                          listIdData={dataChartLarge.listId}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: OptionDropdownType) => {
                            selectedOrganization &&
                              handleSelectOrganizationCustom(
                                selectedOrganization,
                              );
                            handleSelectLarge(data);
                          }}
                          isAllTeamOption={
                            selectedOrganization?.value == ALL_TEAM_STATISTIC
                          }
                        />
                      ) : (
                        <div className="w-[280px] h-[280px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-[18px]">
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
                      className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
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
                    <div className="flex justify-center">
                      {isLoadingLarge ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : dataChartMedium.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          mergedItems={dataChartMedium.mergedItems || []}
                          colors={dataChartMedium.colors}
                          data={dataChartMedium?.data}
                          labels={dataChartMedium?.labels}
                          actualValues={dataChartMedium?.actualValue}
                          optionsData={dataChartMedium.optionData}
                          className="w-[280px] h-[280px] "
                          listIdData={dataChartMedium.listId}
                          handleClickChart={(data: OptionDropdownType) => {
                            handleSelectMedium(data);
                          }}
                        />
                      ) : (
                        <div className="w-[280px] h-[280px] rounded-full bg-[#EBF1F7]"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-[18px]">
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
                      className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
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
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationSmall &&
                        formatTimeToJapanese(totalDurationSmall)}
                    </p>
                    <div className="flex justify-center">
                      {isLoadingMedium ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : dataChartSmall.data.length > 0 ? (
                        <PieChart
                          isTeam
                          isLast
                          mergedItems={dataChartSmall.mergedItems || []}
                          colors={dataChartSmall.colors}
                          data={dataChartSmall?.data}
                          labels={dataChartSmall?.labels}
                          actualValues={dataChartSmall?.actualValue}
                          className="w-[280px] h-[280px] "
                          optionsData={dataChartSmall.optionData}
                          listIdData={dataChartSmall.listId}
                          isClickTooltip
                        />
                      ) : (
                        <div className="w-[280px] h-[280px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
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

export default PercentageCategoryTeam;
