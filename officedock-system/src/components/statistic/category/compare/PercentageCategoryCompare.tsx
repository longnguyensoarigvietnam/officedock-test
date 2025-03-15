import React, { useContext, useEffect, useState } from 'react';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompare from '@components/common/ProgressBar/ProgressBarCompare';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { EventWorkCategory } from '@constants/enums';
import { getRandomColor } from '@utils';
import { StatisticStateContext } from '@providers/StatisticProvider';
import { LoadingContext } from '@providers/LoadingProvider';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticCategoryCompareList: StatisticsCategories | undefined;

  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const PercentageCategoryCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticCategoryCompareList,
  statisticCategoryList,
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
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
  } = useContext(StatisticStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isShowModal, setIsShowModal] = useState(false);
  const [isShowModalCompare, setIsShowModalCompare] = useState(false);

  const [detailCategory, setDetailCategory] = useState<{
    id: number | null;
    type: string;
    totalDuration: string;
  } | null>(null);

  const [detailCategoryCompare, setDetailCategoryCompare] = useState<{
    id: number | null;
    type: string;
    totalDuration: string;
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

  const mapCategoryData = (categories: StatisticCategoryInfo[]) =>
    categories?.map((item) => ({
      id: item.categoryId,
      label: item.categoryName,
      percentage: item.percent,
      color: item.categoryColor || getRandomColor(),
      totalDuration: item.duration,
      optionData: item.tasks.map((item) => ({
        label: item.title,
      })),
    })) || [];

  // Set data from category list
  useEffect(() => {
    if (statisticCategoryList) {
      setDataChartLarge(mapCategoryData(statisticCategoryList.largeCategories));
      setDataChartMedium(
        mapCategoryData(statisticCategoryList.mediumCategories || []),
      );
      setDataChartSmall(
        mapCategoryData(statisticCategoryList.smallCategories || []),
      );
      setIsLoading(false);
    }
  }, [statisticCategoryList]);

  // Set data from category compare list
  useEffect(() => {
    if (statisticCategoryCompareList) {
      setDataChartLargeCompare(
        mapCategoryData(statisticCategoryCompareList.largeCategories),
      );
      setDataChartMediumCompare(
        mapCategoryData(statisticCategoryCompareList.mediumCategories || []),
      );
      setDataChartSmallCompare(
        mapCategoryData(statisticCategoryCompareList.smallCategories || []),
      );
      setIsLoading(false);
    }
  }, [statisticCategoryCompareList]);

  const handleClickTooltip = (
    id: number | null,
    type: string,
    isCompare: boolean,
  ) => {
    let duration: string = '00:00:00';
    if (isCompare) {
      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticCategoryCompareList?.largeCategories.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
        duration =
          statisticCategoryCompareList?.mediumCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.SMALL) {
        duration =
          statisticCategoryCompareList?.smallCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      setDetailCategoryCompare({
        id: id,
        type: type,
        totalDuration: duration,
      });

      setIsShowModalCompare(true);
    } else {
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
                  <div className="mt-4 ">
                    <Dropdown
                      label="チーム選択"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={listOptionsOrganization}
                      selectedOption={selectedOrganization || undefined}
                      onChange={(data) => handleSelectOrganization(data)}
                    />
                    <div className="min-h-[280px] mt-[30px]">
                      {
                        <PercentageBarCompare
                          data={dataChartLarge}
                          startDate={startDate}
                          endDate={endDate}
                          totalDuration={totalDurationLarge}
                          totalDurationCompare={totalDurationLargeCompare}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartLargeCompare}
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
                      }
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
                    <div className="min-h-[280px] mt-[30px]">
                      {
                        <PercentageBarCompare
                          data={dataChartMedium}
                          startDate={startDate}
                          endDate={endDate}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartMediumCompare}
                          totalDuration={totalDurationMedium}
                          totalDurationCompare={totalDurationMediumCompare}
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
                      }
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
                    <div className="min-h-[280px] mt-[30px]">
                      {
                        <PercentageBarCompare
                          data={dataChartSmall}
                          startDate={startDate}
                          endDate={endDate}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartSmallCompare}
                          totalDuration={totalDurationSmall}
                          totalDurationCompare={totalDurationSmallCompare}
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
                      }
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
      {isShowModalCompare && (
        <ListTaskDetailStatisticModal
          open={isShowModalCompare}
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

export default PercentageCategoryCompare;
