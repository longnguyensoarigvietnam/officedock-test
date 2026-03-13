import React, { useEffect, useState, useContext } from 'react';

import PieChartCustom from '@components/common/Chart/PieChartCustom';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import { ALL_TEAM_STATISTIC, NO_SETTING, SUB_TEAMS } from '@constants';
import { EventWorkCategory } from '@constants/enums';
import { DataChartType, OptionDropdownType } from '@interfaces/common';
import {
  DataTaskModalStatisticType,
  StatisticAllTeamInfo,
  StatisticCategoryInfo,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';
import { convertToJapaneseTime, formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';
import { StatisticStateContext } from '@providers/StatisticProvider';
import FilterStatistic from './filter/FilterStatistic';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectOrganizationCustom: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageCategory = ({
  startDate,
  endDate,
  statisticCategoryList,
  statisticAllTeamCategoryList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectOrganization,
  handleSelectSmall,
  handleSelectOrganizationCustom,
}: Props) => {
  const {
    isDisableCalendar,
    isHasLoading,
    largeOptions,
    mediumOptions,
    smallOptions,
    selectedSmall,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    selectedTags,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
  } = useContext(StatisticStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isShowModal, setIsShowModal] = useState(false);
  const [detailCategory, setDetailCategory] = useState<{
    id: number | null;
    type: string;
    organizationId?: string;
  } | null>(null);

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
    const categories = dataCategories.filter((item) => item.percent >= 0);
    const mergedItems: StatisticCategoryInfo[] = [];
    const mergedCategory: StatisticCategoryInfo = {
      categoryName: 'その他',
      categoryColor: colorData || getRandomColor(),
      percent: 0,
      duration: '',
      tasks: [] as DataTaskModalStatisticType[],
      categoryId: -1,
    };

    const filteredCategories = categories.filter((item) => {
      if (item.percent < 10) {
        mergedItems.push({
          ...item,
          categoryColor:
            item.categoryColor ||
            (colorData && lightenColor(colorData, item.percent)) ||
            getRandomColor(),
        });
        mergedCategory.percent += item.percent;
        mergedCategory.organizationId = item.organizationId;
        mergedCategory.duration += item.duration;
        mergedCategory.categoryColor =
          item.categoryColor !== null
            ? item.categoryColor
            : (colorData && lightenColor(colorData, item.percent)) ||
              getRandomColor();
        mergedCategory.tasks = mergedCategory.tasks.concat(item.tasks);
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
    const listColor = filteredCategories.map((color, index) =>
      color.categoryColor !== null
        ? color.categoryColor
        : lightenColor(colorData as string, listPercent[index]) ||
          getRandomColor(),
    );
    // Get list label
    const listLabel = filteredCategories.map((label) => label.categoryName);
    // Get list value
    const listValueActualChart = filteredCategories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = filteredCategories.map((item) =>
      item.tasks.slice(0, 6).map((task) => ({
        label: task.title,
      })),
    );

    // Get list Organization for all team
    const listDataOrganizations = filteredCategories.map((org) =>
      String(org.organizationId),
    );

    // Get list id
    const listDataIds = filteredCategories.map((item) => item.categoryId);
    // Get list duration
    const listDuration = filteredCategories.map((item) =>
      item.tasks.map((task) => task.totalDuration),
    );

    return {
      colors: listColor,
      labels: listLabel,
      data: listPercent,
      actualValue: listValueActualChart,
      optionData: listDataOptions,
      listId: listDataIds,
      listDuration: listDuration,
      dataOrganization: listDataOrganizations,
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
      statisticCategoryList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      if (statisticCategoryList.largeCategories) {
        const largeChartData = processChartData(
          statisticCategoryList.largeCategories,
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
      if (statisticCategoryList.mediumCategories) {
        const color = statisticCategoryList?.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
        const mediumChartData = processChartData(
          statisticCategoryList.mediumCategories,
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
      if (statisticCategoryList.smallCategories) {
        const color =
          statisticCategoryList.largeCategories &&
          statisticCategoryList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          );
        const smallChartData = processChartData(
          statisticCategoryList.smallCategories,
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
  }, [
    statisticCategoryList,
    selectedOrganization?.value,
    selectedLarge?.value,
  ]);

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

  const handleClickTooltip = ({
    id,
    type,
    organizationId,
  }: {
    id: number | null;
    type: string;
    organizationId?: string;
  }) => {
    if (isLoadingLarge || isLoadingMedium || isLoadingOrganization) return;

    setDetailCategory({
      id: id,
      type: type,
      organizationId: organizationId,
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
              <span className="text-black w-fit flex-shrink-0 font-semibold text-[18px]">
                カテゴリーの割合
              </span>
            </div>
            {/* Filter */}
            <FilterStatistic />
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
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
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
                    <div className="min-h-[280px] flex justify-center w-full">
                      {isLoadingOrganization ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : (
                        <>
                          {dataChartLarge.data.length > 0 ? (
                            <PieChartCustom
                              isClickTooltip
                              hasHover={hasHover != EventWorkCategory.LARGE}
                              onActionHover={() =>
                                setHasHover(EventWorkCategory.LARGE)
                              }
                              mergedItems={dataChartLarge?.mergedItems || []}
                              colors={dataChartLarge.colors}
                              data={dataChartLarge?.data}
                              labels={dataChartLarge?.labels}
                              actualValues={dataChartLarge?.actualValue}
                              className="w-[280px] h-[280px]"
                              optionsData={dataChartLarge.optionData}
                              listIdData={dataChartLarge.listId}
                              dataOrganization={dataChartLarge.dataOrganization}
                              isAllTeamOption={
                                selectedOrganization?.value ==
                                ALL_TEAM_STATISTIC
                              }
                              handleClickTooltip={(
                                id: number | null,
                                organizationId?: string,
                              ) => {
                                handleClickTooltip({
                                  id,
                                  type: EventWorkCategory.ALL,
                                  organizationId: organizationId,
                                });
                              }}
                              handleClickChart={(data: OptionDropdownType) => {
                                selectedOrganization &&
                                  handleSelectOrganizationCustom(
                                    selectedOrganization,
                                  );
                                handleSelectLarge(data);
                              }}
                            />
                          ) : (
                            <div className="w-[280px] h-[280px] rounded-full bg-[#EBF1F7] flex items-center justify-center">
                              {selectedOrganization?.value !== '' && (
                                <span className="text-sm text-[#77858F]">
                                  データがありません
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
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
                {/* Pie Chart 2 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                    中カテゴリー
                  </div>
                  <div className="mt-4">
                    <div className="w-[300px] mx-auto">
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationMedium &&
                          formatTimeToJapanese(totalDurationMedium)}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {isLoadingLarge ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : (
                        <>
                          {dataChartMedium.data.length > 0 ? (
                            <PieChartCustom
                              isClickTooltip
                              hasHover={hasHover != EventWorkCategory.MEDIUM}
                              onActionHover={() =>
                                setHasHover(EventWorkCategory.MEDIUM)
                              }
                              mergedItems={dataChartMedium?.mergedItems || []}
                              colors={dataChartMedium.colors}
                              data={dataChartMedium?.data}
                              labels={dataChartMedium?.labels}
                              actualValues={dataChartMedium?.actualValue}
                              optionsData={dataChartMedium.optionData}
                              className="w-[280px] h-[280px] "
                              listIdData={dataChartMedium.listId}
                              isAllTeamOption={
                                selectedOrganization?.value ==
                                ALL_TEAM_STATISTIC
                              }
                              handleClickTooltip={(
                                id: number | null,
                                organizationId?: string,
                              ) => {
                                handleClickTooltip({
                                  id,
                                  type: EventWorkCategory.LARGE,
                                  organizationId,
                                });
                              }}
                              handleClickChart={(data: OptionDropdownType) => {
                                handleSelectMedium(data);
                              }}
                            />
                          ) : (
                            <div className="w-[280px] h-[280px] ml-5 rounded-full bg-[#EBF1F7] flex items-center justify-center">
                              {selectedLarge?.value !== '' && (
                                <span className="text-sm text-[#77858F]">
                                  データがありません
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
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
                {/* Pie Chart 3 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                    小カテゴリー
                  </div>
                  <div className="mt-4">
                    <div className="w-[300px] mx-auto">
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationSmall &&
                          formatTimeToJapanese(totalDurationSmall)}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {isLoadingMedium ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : (
                        <>
                          {dataChartSmall.data.length > 0 ? (
                            <PieChartCustom
                              colors={dataChartSmall.colors}
                              data={dataChartSmall?.data}
                              isLast
                              hasHover={hasHover != EventWorkCategory.SMALL}
                              onActionHover={() =>
                                setHasHover(EventWorkCategory.SMALL)
                              }
                              labels={dataChartSmall?.labels}
                              mergedItems={dataChartSmall?.mergedItems || []}
                              actualValues={dataChartSmall?.actualValue}
                              className="w-[280px] h-[280px]"
                              optionsData={dataChartSmall.optionData}
                              listIdData={dataChartSmall.listId}
                              isAllTeamOption={
                                selectedOrganization?.value ==
                                ALL_TEAM_STATISTIC
                              }
                              handleClickTooltip={(
                                id: number | null,
                                organizationId?: string,
                              ) => {
                                handleClickTooltip({
                                  id,
                                  type: EventWorkCategory.MEDIUM,
                                  organizationId,
                                });
                              }}
                              isClickTooltip
                            />
                          ) : (
                            <div className="w-[280px] h-[280px] rounded-full bg-[#EBF1F7] flex items-center justify-center">
                              {selectedMedium?.value !== '' && (
                                <span className="text-sm text-[#77858F]">
                                  データがありません
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
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
          selectedTags={selectedTags}
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
};

export default PercentageCategory;
