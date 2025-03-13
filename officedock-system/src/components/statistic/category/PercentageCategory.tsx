import React, { useEffect, useState } from 'react';

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
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import { EventWorkCategory } from '@constants/enums';

type Props = {
  startDate: Date;
  endDate: Date | null;
  totalDurationLarge: string;
  totalDurationMedium: string;
  totalDurationSmall: string;
  statisticCategoryList: StatisticsCategories | undefined;
  listOptionsOrganization: OptionDropdownType[];
  largeOptions: OptionDropdownType[];
  selectedOrganization: OptionDropdownType | null;
  selectedLarge: OptionDropdownType | null;
  mediumOptions: OptionDropdownType[];
  selectedMedium: OptionDropdownType | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const PercentageCategory = ({
  startDate,
  endDate,
  totalDurationLarge,
  totalDurationMedium,
  totalDurationSmall,
  listOptionsOrganization,
  selectedOrganization,
  largeOptions,
  mediumOptions,
  selectedLarge,
  selectedMedium,
  statisticCategoryList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectOrganization,
}: Props) => {
  const [isExtendData, setIsExtendData] = useState(true);
  const [isShowModal, setIsShowModal] = useState(false);
  const [detailCategory, setDetailCategory] = useState<{
    id: number | null;
    type: string;
    totalDuration: string;
  } | null>(null);

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
    const listDataOptions = categories.map((item) =>
      item.tasks.slice(0, 3).map((task) => task.title),
    );
    // Get list id
    const listDataIds = categories.map((item) => item.categoryId);
    // Get list duration
    const listDuration = categories.map((item) =>
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
    };
  };

  useEffect(() => {
    if (statisticCategoryList) {
      if (statisticCategoryList.largeCategories) {
        const largeChartData = processChartData(
          statisticCategoryList.largeCategories,
        );
        setDataChartLarge(largeChartData);
      }
      if (statisticCategoryList.mediumCategories) {
        const mediumChartData = processChartData(
          statisticCategoryList.mediumCategories,
        );
        setDataChartMedium(mediumChartData);
      }
      if (statisticCategoryList.smallCategories) {
        const smallChartData = processChartData(
          statisticCategoryList.smallCategories,
        );
        setDataChartSmall(smallChartData);
      }
    }
  }, [statisticCategoryList]);

  const handleClickTooltip = (id: number | null, type: string) => {
    let duration: string = '00:00:00';

    if (type === EventWorkCategory.LARGE) {
      duration =
        statisticCategoryList?.largeCategories.find(
          (item) => item.categoryId == id,
        )?.duration || '00:00:00';
    }
    if (type === EventWorkCategory.MEDIUM) {
      duration =
        statisticCategoryList?.mediumCategories?.find(
          (item) => item.categoryId == id,
        )?.duration || '00:00:00';
    }
    if (type === EventWorkCategory.SMALL) {
      duration =
        statisticCategoryList?.smallCategories?.find(
          (item) => item.categoryId == id,
        )?.duration || '00:00:00';
    }
    setDetailCategory({
      id: id,
      type: type,
      totalDuration: duration,
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
                          colors={dataChartLarge.colors}
                          data={dataChartLarge?.data}
                          labels={dataChartLarge?.labels}
                          actualValues={dataChartLarge?.actualValue}
                          className="w-[280px] h-[280px] ml-5"
                          optionsData={dataChartLarge.optionData}
                          listIdData={dataChartLarge.listId}
                          handleClickTooltip={(id: number | null) => {
                            handleClickTooltip(id, EventWorkCategory.LARGE);
                          }}
                          handleClickChart={(data: OptionDropdownType) => {
                            handleSelectLarge(data);
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
                          colors={dataChartMedium.colors}
                          data={dataChartMedium?.data}
                          labels={dataChartMedium?.labels}
                          actualValues={dataChartMedium?.actualValue}
                          className="w-[280px] h-[280px] ml-5"
                          listIdData={dataChartMedium.listId}
                          handleClickChart={(data: OptionDropdownType) => {
                            handleSelectMedium(data);
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
      {isShowModal && (
        <ListTaskDetailStatisticModal
          open={isShowModal}
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
    </>
  );
};

export default PercentageCategory;
