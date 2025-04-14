import React, { useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompare from '@components/common/ProgressBar/ProgressBarCompare';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { EventWorkCategory } from '@constants/enums';
import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { getRandomColor, lightenColor } from '@utils';
import { StatisticStateContext } from '@providers/StatisticProvider';

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
  handleSelectSmall: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectOrganizationCustom: (data: OptionDropdownType) => void;
};

const PercentageCategoryCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticCategoryCompareList,
  statisticCategoryList,
  removeTag,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
  handleSelectOrganizationCustom,
}: Props) => {
  const {
    largeOptions,
    mediumOptions,
    listOptionsOrganization,
    selectedLarge,
    selectedMedium,
    selectedSmall,
    selectedOrganization,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    selectedTags,
    tagsOptions,
    smallOptions,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingOrganizationCompare,
    setSelectedTags,
    setTotalDurationTask,
    setTotalDurationTaskCompare,
  } = useContext(StatisticStateContext);

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
          getRandomColor(),
      })),
      color: colorData || getRandomColor(),
      totalDuration: '',
      optionData: otherItems.flatMap((item) =>
        item.tasks.map((task) => ({
          label: task.title,
        })),
      ),
    };

    const mappedMainItems = mainItems.map((item) => ({
      id: item.categoryId,
      label: item.categoryName,
      percentage: item.percent,
      color:
        item.categoryColor ||
        lightenColor(colorData as string, item.percent) ||
        getRandomColor(),
      totalDuration: item.duration,
      optionData: item.tasks.map((task) => ({
        label: task.title,
      })),
      mergedItems: [],
    }));

    return [
      ...mappedMainItems,
      ...(otherItem.percentage > 0 ? [otherItem] : []),
    ];
  };

  // Set data from category list
  useEffect(() => {
    if (statisticCategoryList) {
      const color =
        statisticCategoryList.largeCategories &&
        statisticCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );

      setDataChartLarge(
        mapCategoryData(statisticCategoryList.largeCategories || []),
      );
      setDataChartMedium(
        mapCategoryData(
          statisticCategoryList.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmall(
        mapCategoryData(
          statisticCategoryList.smallCategories || [],
          color?.categoryColor,
        ),
      );
    }
  }, [statisticCategoryList]);

  // Set data from category compare list
  useEffect(() => {
    if (statisticCategoryCompareList) {
      const color =
        statisticCategoryCompareList.largeCategories &&
        statisticCategoryCompareList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );

      setDataChartLargeCompare(
        mapCategoryData(statisticCategoryCompareList.largeCategories || []),
      );
      setDataChartMediumCompare(
        mapCategoryData(
          statisticCategoryCompareList.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmallCompare(
        mapCategoryData(
          statisticCategoryCompareList.smallCategories || [],
          color?.categoryColor,
        ),
      );
    }
  }, [statisticCategoryCompareList]);

  const handleClickTooltip = (
    id: number | null,
    type: string,
    isCompare: boolean,
  ) => {
    let duration: string = '00:00:00';
    if (isCompare) {
      if (type === EventWorkCategory.ALL) {
        duration =
          statisticCategoryCompareList?.largeCategories.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticCategoryCompareList?.mediumCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
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
      if (type === EventWorkCategory.ALL) {
        duration =
          statisticCategoryList?.largeCategories.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticCategoryList?.mediumCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
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

      setTimeout(() => {
        setIsShowModal(true);
      }, 500);
    }
  };

  const handleScroll = () => {
    if (detailCategory?.type === EventWorkCategory.ALL) {
      const item = largeOptions.find(
        (item) => item.value === detailCategory?.id,
      );
      item && handleSelectLarge(item);
      setTotalDurationTask(detailCategory.totalDuration);
      if (String(detailCategory?.id) == '未設定') {
        handleSelectLarge({
          label: '未設定',
          value: '未設定',
        });
      }
    }
    if (detailCategory?.type === EventWorkCategory.LARGE) {
      const item = mediumOptions.find(
        (item) => item.value === detailCategory?.id,
      );
      item && handleSelectMedium(item);
      setTotalDurationTask(detailCategory.totalDuration);

      if (String(detailCategory?.id) == '未設定') {
        handleSelectMedium({
          label: '未設定',
          value: '未設定',
        });
      }
    }
    if (detailCategory?.type === EventWorkCategory.MEDIUM) {
      const item = smallOptions.find(
        (item) => item.value === detailCategory?.id,
      );
      item && handleSelectSmall(item);
      setTotalDurationTask(detailCategory.totalDuration);

      if (String(detailCategory?.id) == '未設定') {
        handleSelectSmall({
          label: '未設定',
          value: '未設定',
        });
      }
    }
    if (detailCategory?.type === EventWorkCategory.SMALL) {
      const item = smallOptions.find(
        (item) => item.value === detailCategory?.id,
      );
      item && handleSelectSmall(item);
      setTotalDurationTask(detailCategory.totalDuration);

      if (String(detailCategory?.id) == '未設定') {
        handleSelectSmall({
          label: '未設定',
          value: '未設定',
        });
      }
    }

    const element = document.getElementById('task-list-statistic');
    setIsShowModal(false);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const handleScrollCompare = () => {
    if (detailCategoryCompare?.type === EventWorkCategory.ALL) {
      const item = largeOptions.find(
        (item) => item.value === detailCategoryCompare?.id,
      );
      item && handleSelectLarge(item);
      setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);

      if (String(detailCategoryCompare?.id) == '未設定') {
        handleSelectLarge({
          label: '未設定',
          value: '未設定',
        });
      }
    }
    if (detailCategoryCompare?.type === EventWorkCategory.LARGE) {
      const item = mediumOptions.find(
        (item) => item.value === detailCategoryCompare?.id,
      );
      item && handleSelectMedium(item);
      setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);

      if (String(detailCategoryCompare?.id) == '未設定') {
        handleSelectMedium({
          label: '未設定',
          value: '未設定',
        });
      }
    }

    if (detailCategoryCompare?.type === EventWorkCategory.MEDIUM) {
      const item = smallOptions.find(
        (item) => item.value === detailCategoryCompare?.id,
      );
      item && handleSelectSmall(item);
      setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);

      if (String(detailCategoryCompare?.id) == '未設定') {
        handleSelectSmall({
          label: '未設定',
          value: '未設定',
        });
      }
    }
    if (detailCategoryCompare?.type === EventWorkCategory.SMALL) {
      const item = smallOptions.find(
        (item) => item.value === detailCategoryCompare?.id,
      );
      item && handleSelectSmall(item);
      setTotalDurationTaskCompare(detailCategoryCompare.totalDuration);
      if (String(detailCategoryCompare?.id) == '未設定') {
        handleSelectSmall({
          label: '未設定',
          value: '未設定',
        });
      }
    }

    const element = document.getElementById('task-list-statistic');
    setIsShowModalCompare(false);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });

      const url = new URL(window.location.href);

      url.searchParams.set('isCompare', 'true');
      window.history.pushState({}, '', url);
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
              <span className="text-black w-[154px] flex-shrink-0 font-semibold text-[18px] relative top-[2px]">
                カテゴリーの割合
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[240px] flex-shrink-0  relative">
                <MultiSelectDropdown
                  isShowIconFilter
                  options={tagsOptions}
                  placeholder="集計対象のタグを選択"
                  labelOptionClass="break-all"
                  optionClassName="!top-6"
                  className="!h-[14px] !py-0 text-sm font-normal !rounded-md"
                  selectedOptions={selectedTags || []}
                  onChange={(selected) => {
                    let updatedTagIds = [];
                    const currentTagIds = selectedTags || [];
                    const foundItemIndex = currentTagIds.findIndex(
                      (tag) => tag.value == selected.value,
                    );
                    if (foundItemIndex == -1) {
                      updatedTagIds = [...currentTagIds, selected];
                    } else {
                      updatedTagIds = currentTagIds.filter(
                        (tag) => tag.value != selected.value,
                      );
                    }
                    setSelectedTags(updatedTagIds);
                  }}
                />
                {selectedTags.length === 0 && (
                  <span className="text-xs absolute  text-[#77858F] top-[2px] right-[135px]">
                    タグの絞り込み
                  </span>
                )}
              </div>
              <div className="relative flex-grow right-[224px] top-0">
                <div className="flex gap-2 w-full flex-shrink-0 flex-wrap ">
                  {selectedTags.map((item) => {
                    return (
                      <div
                        key={item.value}
                        className="max-w-[400px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                        <span className=" truncate">{item.label}</span>
                        <ImageRound
                          onClick={() => {
                            removeTag(item);
                          }}
                          src={`/icons/close-white.svg`}
                          name="close"
                          className="w-fit h-fit cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
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
              <div className="flex gap-[35px] justify-center px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-full">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    大カテゴリー
                  </div>
                  <div className="mt-4 ">
                    <div className="w-[300px] mx-auto">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        options={listOptionsOrganization}
                        selectedOption={selectedOrganization || undefined}
                        onChange={(data) => handleSelectOrganization(data)}
                      />
                    </div>
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompare
                        data={dataChartLarge}
                        startDate={startDate}
                        endDate={endDate}
                        totalDuration={totalDurationLarge}
                        isLoading={isLoadingOrganization}
                        isLoadingCompare={isLoadingOrganizationCompare}
                        totalDurationCompare={totalDurationLargeCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartLargeCompare}
                        handleClickChart={(data: number) => {
                          const select = largeOptions.find(
                            (item) => item.value === data,
                          );
                          selectedOrganization &&
                            handleSelectOrganizationCustom(
                              selectedOrganization,
                            );
                          if (select) {
                            handleSelectLarge(select);
                          }
                        }}
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
                  <div className="relative w-[18px] top-[6px]">
                    <ImageRound
                      className={`w-[18px] h-6 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                </div>
                {/* Pie Chart 2 */}
                <div className="w-full ">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
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
                        options={largeOptions}
                        selectedOption={selectedLarge || undefined}
                        onChange={(data) => handleSelectLarge(data)}
                        disabled={!selectedOrganization}
                      />
                    </div>
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompare
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
                        handleClickChart={(data: number) => {
                          const select = mediumOptions.find(
                            (item) => item.value === data,
                          );

                          if (select) {
                            handleSelectMedium(select);
                          }
                        }}
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
                  <div className="relative w-[18px] top-[6px]">
                    <ImageRound
                      className={`w-[18px] h-6 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                </div>
                {/* Pie Chart 3 */}
                <div className="w-full">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
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
                        options={mediumOptions}
                        selectedOption={selectedMedium || undefined}
                        onChange={(data) => handleSelectMedium(data)}
                        disabled={!selectedLarge}
                      />
                    </div>
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompare
                        isLast
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
                        handleClickChart={(data: number) => {
                          const select = smallOptions.find(
                            (item) => item.value === data,
                          );

                          if (select) {
                            handleSelectSmall(select);
                          }
                        }}
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
          statisticCategoryList={statisticCategoryList}
          selectedLarge={selectedLarge}
          selectedMedium={selectedMedium}
          selectedSmall={selectedSmall}
          detailCategory={detailCategory}
          selectedOrganization={selectedOrganization}
          onClose={() => {
            setIsShowModal(false);
          }}
          selectedTags={selectedTags}
          handleScroll={handleScroll}
        />
      )}
      {isShowModalCompare && (
        <ListTaskDetailStatisticModal
          open={isShowModalCompare}
          selectedTags={selectedTags}
          startDate={startDateCompare}
          statisticCategoryList={statisticCategoryList}
          endDate={endDateCompare}
          selectedLarge={selectedLarge}
          selectedMedium={selectedMedium}
          selectedSmall={selectedSmall}
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

export default PercentageCategoryCompare;
