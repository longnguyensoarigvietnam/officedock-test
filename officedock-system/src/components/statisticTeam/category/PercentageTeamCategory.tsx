import React, { useEffect, useState, useContext } from 'react';

import PieChart from '@components/common/Chart/PieChart';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { DataChartType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { convertToJapaneseTime, formatTimeToJapanese } from '@utils/date';
import { getRandomColor } from '@utils';
import { LoadingContext } from '@providers/LoadingProvider';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const PercentageCategoryTeam = ({
  statisticTeamCategoryList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectOrganization,
}: Props) => {
  const {
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
  } = useContext(StatisticTeamStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const [isExtendData, setIsExtendData] = useState(true);

  const [dataChartLarge, setDataChartLarge] = useState<DataChartType>({
    actualValue: [],
    colors: [],
    data: [],
    labels: [],
    optionData: [],
    listId: [],
    listDuration: [],
  });

  const [dataChartMedium, setDataChartMedium] = useState<DataChartType>({
    actualValue: [],
    colors: [],
    data: [],
    labels: [],
    optionData: [],
    listId: [],
    listDuration: [],
  });
  const [dataChartSmall, setDataChartSmall] = useState<DataChartType>({
    actualValue: [],
    colors: [],
    data: [],
    labels: [],
    optionData: [],
    listId: [],
    listDuration: [],
  });

  const processChartData = (categories: StatisticCategoryInfo[]) => {
    // Get list color
    const listColor = categories.map(
      (color) => color.categoryColor || getRandomColor(),
    );
    // Get list percent
    const listPercent = categories.map((percent) => percent.percent);
    // Get list label
    const listLabel = categories.map((label) => label.categoryName);
    // Get list value
    const listValueActualChart = categories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = categories.map(
      (item) =>
        item.users?.slice(0, 6).map((user) => ({
          label: user.user.fullName,
          percent: user.percent,
        })) || [],
    );
    // Get list id
    const listDataIds = categories.map((item) => item.categoryId);
    // Get list duration
    const listDuration = categories.map(
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
    };
  };

  useEffect(() => {
    if (statisticTeamCategoryList) {
      if (statisticTeamCategoryList.largeCategories) {
        const largeChartData = processChartData(
          statisticTeamCategoryList.largeCategories,
        );
        setDataChartLarge(largeChartData);
      }
      if (statisticTeamCategoryList.mediumCategories) {
        const mediumChartData = processChartData(
          statisticTeamCategoryList.mediumCategories,
        );
        setDataChartMedium(mediumChartData);
      }
      if (statisticTeamCategoryList.smallCategories) {
        const smallChartData = processChartData(
          statisticTeamCategoryList.smallCategories,
        );
        setDataChartSmall(smallChartData);
      }
      setIsLoading(false);
    }
  }, [statisticTeamCategoryList]);

  return (
    <>
      <div
        style={{
          boxShadow: '0px 4px 10px 0px #0000000D',
        }}
        className="p-[30px] bg-[#F8FAFC] rounded-[14px]">
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
                カテゴリーの割合カテゴリーの割合
              </span>
            </div>
            <div className="flex items-center gap-1 ">
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
              <div className="flex gap-[41px] justify-center px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[280px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    大カテゴリー
                  </div>
                  <div className="mt-4">
                    <Dropdown
                      label="チーム選択"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={listOptionsOrganization}
                      selectedOption={selectedOrganization || undefined}
                      onChange={(data) => handleSelectOrganization(data)}
                    />
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationLarge &&
                        formatTimeToJapanese(totalDurationLarge)}
                    </p>
                    <div className="min-h-[280px]">
                      {dataChartLarge.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          colors={dataChartLarge.colors}
                          data={dataChartLarge?.data}
                          labels={dataChartLarge?.labels}
                          actualValues={dataChartLarge?.actualValue}
                          className="w-[280px] h-[280px] ml-5"
                          optionsData={dataChartLarge.optionData}
                          listIdData={dataChartLarge.listId}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: OptionDropdownType) => {
                            if (data.value) {
                              selectedOrganization &&
                                handleSelectOrganization(selectedOrganization);
                              handleSelectLarge(data);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-[280px] h-[280px] ml-5 rounded-full bg-[#EBF1F7]"></div>
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
                <div className="w-[280px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    中カテゴリー
                  </div>
                  <div className="mt-4">
                    <Dropdown
                      label="大カテゴリー選択"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={largeOptions}
                      selectedOption={selectedLarge || undefined}
                      onChange={(data) => handleSelectLarge(data)}
                      disabled={!selectedOrganization}
                    />
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationMedium &&
                        formatTimeToJapanese(totalDurationMedium)}
                    </p>
                    <div>
                      {dataChartMedium.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          colors={dataChartMedium.colors}
                          data={dataChartMedium?.data}
                          labels={dataChartMedium?.labels}
                          actualValues={dataChartMedium?.actualValue}
                          className="w-[280px] h-[280px] ml-5"
                          listIdData={dataChartMedium.listId}
                          handleClickChart={(data: OptionDropdownType) => {
                            if (data.value) {
                              handleSelectMedium(data);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-[280px] h-[280px] ml-5 rounded-full bg-[#EBF1F7]"></div>
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
                {/* Pie Chart 3 */}
                <div className="w-[280px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    小カテゴリー
                  </div>
                  <div className="mt-4">
                    <Dropdown
                      label="中カテゴリー選択"
                      className="!h-[34px] !rounded-md !border text-sm !py-0 font-normal !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={mediumOptions}
                      selectedOption={selectedMedium || undefined}
                      onChange={(data) => handleSelectMedium(data)}
                      disabled={!selectedLarge}
                    />
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationSmall &&
                        formatTimeToJapanese(totalDurationSmall)}
                    </p>
                    <div>
                      {dataChartSmall.data.length > 0 ? (
                        <PieChart
                          colors={dataChartSmall.colors}
                          data={dataChartSmall?.data}
                          labels={dataChartSmall?.labels}
                          actualValues={dataChartSmall?.actualValue}
                          className="w-[280px] h-[280px] ml-5"
                          optionsData={dataChartSmall.optionData}
                          listIdData={dataChartSmall.listId}
                          isClickTooltip
                        />
                      ) : (
                        <div className="w-[280px] h-[280px] ml-5 rounded-full bg-[#EBF1F7]"></div>
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
