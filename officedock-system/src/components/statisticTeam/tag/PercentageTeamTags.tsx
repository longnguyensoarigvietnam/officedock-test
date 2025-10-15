import React, { useEffect, useState, useContext } from 'react';

import PieChart from '@components/common/Chart/PieChartCustom';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import { EventWorkCategory } from '@constants/enums';

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
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { ALL_TEAM_STATISTIC, SUB_TEAMS } from '@constants';
import FilterTagTeam from './filter/FilterTagTeam';
import FilterTagUserTeam from './filter/FilterTagUserTeam';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsListTeam: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;

  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageTeamTags = ({
  startDate,
  endDate,
  statisticTagsListTeam,
  statisticAllTeamCategoryList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
}: Props) => {
  const {
    isDisableCalendar,
    isHasLoading,
    largeOptions,
    mediumOptions,
    smallOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationCategory,
    selectedSmall,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingSmall,
  } = useContext(StatisticTeamTagsStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isShowModal, setIsShowModal] = useState(false);
  const [detailCategory, setDetailCategory] = useState<{
    id: number | null;
    type: string;
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
  const [dataChartCategory, setDataChartCategory] = useState<DataChartType>({
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
      tagName: 'その他',
      categoryName: 'その他',
      categoryColor: colorData || getRandomColor(),
      percent: 0,
      duration: '',
      tasks: [] as DataTaskModalStatisticType[],
      users: [] as UserListStatisticType[],
      tagId: -1,
      categoryId: -1,
    };

    const filteredCategories = categories.filter((item) => {
      if (item.percent < 10) {
        mergedItems.push({
          ...item,
          categoryColor:
            (colorData && lightenColor(colorData, item.percent)) || '',
        });
        mergedCategory.percent += item.percent;
        mergedCategory.duration += item.duration;
        mergedCategory.categoryColor =
          (colorData && lightenColor(colorData, item.percent)) ||
          getRandomColor();
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
        lightenColor(colorData as string, listPercent[index]) ||
        getRandomColor(),
    );
    // Get list label
    const listLabel = filteredCategories.map((label) => label.tagName || '');
    // Get list value
    const listValueActualChart = filteredCategories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = filteredCategories.map(
      (item) =>
        item.users?.map((user) => ({
          label: user.user.fullName,
          percent: user.percent,
          avatarColor: user.user.avatarColor,
        })) || [],
    );
    // Get list id
    const listDataIds = filteredCategories.map((item) => item.tagId as number);
    // Get list duration
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
        : item?.data?.slice(0, 3).map((tag) => {
            return { label: tag?.tagName || '' };
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
      statisticTagsListTeam &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      if (statisticTagsListTeam.largeCategories) {
        const largeChartData = processChartData(
          statisticTagsListTeam.largeCategories,
          '#2E9267',
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
      if (statisticTagsListTeam.mediumCategories) {
        const mediumChartData = processChartData(
          statisticTagsListTeam.mediumCategories,
          '#2E9267',
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
      if (statisticTagsListTeam.smallCategories) {
        const smallChartData = processChartData(
          statisticTagsListTeam.smallCategories,
          '#2E9267',
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
      if (statisticTagsListTeam.category) {
        const categoryChartData = processChartData(
          statisticTagsListTeam.category,
          '#2E9267',
        );
        setDataChartCategory(categoryChartData);
      } else {
        setDataChartCategory({
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
  }, [statisticTagsListTeam]);

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
        setDataChartCategory({
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
          listDuration: [],
          mergedItems: [],
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
        setDataChartCategory({
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
  }, [selectedOrganization?.value, statisticAllTeamCategoryList]);

  const handleClickTooltip = (id: number | null, type: string) => {
    setDetailCategory({
      id: id,
      type: type,
    });

    setIsShowModal(true);
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-x-5">
            <div className="flex flex-shrink-0 items-center gap-[10px] ">
              <ImageRound
                className={`w-5 h-5  hover:cursor-pointer`}
                name="statistic-active icon"
                src={`/icons/statistic-active.svg`}
              />
              <span className="text-black font-semibold text-[18px]">
                カテゴリーごとのタグの割合
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
                <div className="flex justify-between w-full mb-[30px] px-[30px]">
                  {/* Filter tag */}
                  <FilterTagTeam />
                </div>
              </div>
              <div className="flex justify-between px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[220px]">
                  <div className="mt-4">
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
                    <div className="min-h-[220px] flex justify-center">
                      {isLoadingOrganization ? (
                        <SkeletonElement className="!w-[220px] !h-[220px] !rounded-full" />
                      ) : dataChartLarge.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          isAllTeamOption={
                            selectedOrganization?.value == ALL_TEAM_STATISTIC
                          }
                          mergedItems={dataChartLarge.mergedItems || []}
                          colors={dataChartLarge.colors}
                          data={dataChartLarge?.data}
                          labels={dataChartLarge?.labels}
                          actualValues={dataChartLarge?.actualValue}
                          className="w-[220px] h-[220px] "
                          optionsData={dataChartLarge.optionData}
                          listIdData={dataChartLarge.listId}
                          handleClickTooltip={(id: number | null) => {
                            handleClickTooltip(id, EventWorkCategory.ALL);
                          }}
                          handleClickChart={(_data: OptionDropdownType) => {}}
                        />
                      ) : (
                        <div className="w-[220px] h-[220px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
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
                      className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      classNameOption="!text-sm"
                      options={largeOptions}
                      selectedOption={selectedLarge || undefined}
                      onChange={(data) => handleSelectLarge(data)}
                      disabled={!selectedOrganization || isHasLoading}
                    />
                    {dataChartMedium.data.length > 0 ? (
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationMedium &&
                          formatTimeToJapanese(totalDurationMedium)}
                      </p>
                    ) : (
                      <p className="text-sm text-black my-[26px]">-</p>
                    )}
                    <div className="flex justify-center">
                      {isLoadingLarge ? (
                        <SkeletonElement className="!w-[220px] !h-[220px] !rounded-full" />
                      ) : dataChartMedium.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          mergedItems={dataChartLarge.mergedItems || []}
                          colors={dataChartMedium.colors}
                          data={dataChartMedium?.data}
                          labels={dataChartMedium?.labels}
                          actualValues={dataChartMedium?.actualValue}
                          optionsData={dataChartMedium.optionData}
                          className="w-[220px] h-[220px] "
                          listIdData={dataChartMedium.listId}
                          handleClickTooltip={(id: number | null) => {
                            handleClickTooltip(id, EventWorkCategory.LARGE);
                          }}
                          handleClickChart={(_data: OptionDropdownType) => {}}
                        />
                      ) : (
                        <div className="w-[220px] h-[220px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
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
                    {dataChartSmall.data.length > 0 ? (
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationSmall &&
                          formatTimeToJapanese(totalDurationSmall)}
                      </p>
                    ) : (
                      <p className="text-sm text-black my-[26px]">-</p>
                    )}
                    <div className="flex justify-center">
                      {isLoadingMedium ? (
                        <SkeletonElement className="!w-[220px] !h-[220px] !rounded-full" />
                      ) : dataChartSmall.data.length > 0 ? (
                        <PieChart
                          isTeam
                          mergedItems={dataChartLarge.mergedItems || []}
                          colors={dataChartSmall.colors}
                          data={dataChartSmall?.data}
                          labels={dataChartSmall?.labels}
                          actualValues={dataChartSmall?.actualValue}
                          className="w-[220px] h-[220px] "
                          optionsData={dataChartSmall.optionData}
                          listIdData={dataChartSmall.listId}
                          handleClickTooltip={(id: number | null) => {
                            handleClickTooltip(id, EventWorkCategory.MEDIUM);
                          }}
                          isClickTooltip
                        />
                      ) : (
                        <div className="w-[220px] h-[220px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
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
                      className="!h-[34px] !py-0 text-sm font-normal !rounded-md !border !border-[#77858F] "
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
                    {dataChartCategory.data.length > 0 ? (
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationCategory &&
                          formatTimeToJapanese(totalDurationCategory)}
                      </p>
                    ) : (
                      <p className="text-sm text-black my-[26px]">-</p>
                    )}
                    <div className="flex justify-center">
                      {isLoadingSmall ? (
                        <SkeletonElement className="!w-[220px] !h-[220px] !rounded-full" />
                      ) : dataChartCategory.data.length > 0 ? (
                        <PieChart
                          isTeam
                          isLast
                          mergedItems={dataChartLarge.mergedItems || []}
                          colors={dataChartCategory.colors}
                          data={dataChartCategory?.data}
                          labels={dataChartCategory?.labels}
                          actualValues={dataChartCategory?.actualValue}
                          className="w-[220px] h-[220px] "
                          optionsData={dataChartCategory.optionData}
                          listIdData={dataChartCategory.listId}
                          handleClickTooltip={(id: number | null) => {
                            handleClickTooltip(id, EventWorkCategory.SMALL);
                          }}
                          isClickTooltip
                        />
                      ) : (
                        <div className="w-[220px] h-[220px]  rounded-full bg-[#EBF1F7]"></div>
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
        <ListTaskDetailStatisticTagModal
          open={isShowModal}
          startDate={startDate}
          endDate={endDate}
          selectedOrganization={selectedOrganization}
          onClose={() => {
            setIsShowModal(false);
          }}
          selectedLarge={selectedLarge}
          selectedSmall={selectedSmall}
          selectedMedium={selectedMedium}
          detailCategory={detailCategory}
          handleScroll={handleScroll}
        />
      )}
    </>
  );
};

export default PercentageTeamTags;
