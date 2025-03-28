import React, { useEffect, useState, useContext } from 'react';

import PieChartCustom from '@components/common/Chart/PieChartCustom';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import { EventWorkCategory } from '@constants/enums';
import { DataChartType, OptionDropdownType } from '@interfaces/common';
import {
  DataTaskModalStatisticType,
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { convertToJapaneseTime, formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';
import { StatisticStateContext } from '@providers/StatisticProvider';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectOrganizationCustom: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageCategory = ({
  startDate,
  endDate,
  statisticCategoryList,
  removeTag,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectOrganization,
  handleSelectSmall,
  handleSelectOrganizationCustom,
}: Props) => {
  const {
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
    tagsOptions,
    selectedTags,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    setTotalDurationTask,
    setTotalDurationCategory,
    setSelectedTags,
  } = useContext(StatisticStateContext);

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
    categories: StatisticCategoryInfo[],
    colorData?: string,
  ) => {
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
      mergedItems: mergedItems,
    };
  };
  useEffect(() => {
    if (statisticCategoryList) {
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
        const color = statisticCategoryList.largeCategories.find(
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
  }, [statisticCategoryList]);

  const handleClickTooltip = (id: number | null, type: string) => {
    let duration: string = '00:00:00';

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

    setIsShowModal(true);
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
      if (String(detailCategory?.id) == '未設定') {
        handleSelectSmall({
          label: '未設定',
          value: '未設定',
        });
        setTotalDurationCategory(detailCategory.totalDuration);
      }
    }

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
                カテゴリーの割合
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[240px]  relative">
                <MultiSelectDropdown
                  isShowIconFilter
                  options={tagsOptions}
                  placeholder="集計対象のタグを選択"
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
                  <span className="text-xs absolute text-[#77858F] top-[2px] right-[135px]">
                    タグの絞り込み
                  </span>
                )}
              </div>
              <div className="relative right-[224px] top-0">
                <div className="flex gap-2 ">
                  {selectedTags.map((item) => {
                    return (
                      <div
                        key={item.value}
                        className="min-w-[66px] w-fit max-w-[118px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                        <span className="min-w-[32px] max-w-[80px] truncate">
                          {item.label}
                        </span>
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
              <div className="flex  justify-between px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    大カテゴリー
                  </div>
                  <div className="mt-4">
                    <div className="w-[300px] mx-auto">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
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
                              mergedItems={dataChartLarge.mergedItems}
                              colors={dataChartLarge.colors}
                              data={dataChartLarge?.data}
                              labels={dataChartLarge?.labels}
                              actualValues={dataChartLarge?.actualValue}
                              className="w-[280px] h-[280px]"
                              optionsData={dataChartLarge.optionData}
                              listIdData={dataChartLarge.listId}
                              handleClickTooltip={(id: number | null) => {
                                handleClickTooltip(id, EventWorkCategory.ALL);
                              }}
                              handleClickChart={(data: OptionDropdownType) => {
                                if (data.value && data.value !== '未設定') {
                                  selectedOrganization &&
                                    handleSelectOrganizationCustom(
                                      selectedOrganization,
                                    );
                                  handleSelectLarge(data);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-[280px] h-[280px]  rounded-full bg-[#EBF1F7]"></div>
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
                        classNameOption="!text-sm"
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
                    </div>
                    <div className="flex justify-center">
                      {isLoadingLarge ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : (
                        <>
                          {dataChartMedium.data.length > 0 ? (
                            <PieChartCustom
                              isClickTooltip
                              mergedItems={dataChartMedium.mergedItems}
                              colors={dataChartMedium.colors}
                              data={dataChartMedium?.data}
                              labels={dataChartMedium?.labels}
                              actualValues={dataChartMedium?.actualValue}
                              optionsData={dataChartMedium.optionData}
                              className="w-[280px] h-[280px] "
                              listIdData={dataChartMedium.listId}
                              handleClickTooltip={(id: number | null) => {
                                handleClickTooltip(id, EventWorkCategory.LARGE);
                              }}
                              handleClickChart={(data: OptionDropdownType) => {
                                if (data.value && data.value !== '未設定') {
                                  handleSelectMedium(data);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-[280px] h-[280px] ml-5 rounded-full bg-[#EBF1F7]"></div>
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
                        classNameOption="!text-sm"
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
                              labels={dataChartSmall?.labels}
                              mergedItems={dataChartSmall.mergedItems}
                              actualValues={dataChartSmall?.actualValue}
                              className="w-[280px] h-[280px]"
                              optionsData={dataChartSmall.optionData}
                              listIdData={dataChartSmall.listId}
                              handleClickTooltip={(id: number | null) => {
                                handleClickTooltip(
                                  id,
                                  EventWorkCategory.MEDIUM,
                                );
                              }}
                              isClickTooltip
                            />
                          ) : (
                            <div className="w-[280px] h-[280px]  rounded-full bg-[#EBF1F7]"></div>
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
          }}
          handleScroll={handleScroll}
        />
      )}
    </>
  );
};

export default PercentageCategory;
