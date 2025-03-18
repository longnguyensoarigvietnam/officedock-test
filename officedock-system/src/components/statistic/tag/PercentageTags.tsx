import React, { useEffect, useState, useContext } from 'react';

import PieChartCustom from '@components/common/Chart/PieChartCustom';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { DataChartType, OptionDropdownType } from '@interfaces/common';
import {
  DataTaskModalStatisticType,
  StatisticCategoryInfo,
  StatisticsTagsType,
} from '@interfaces/statistic';
import { convertToJapaneseTime, formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';
import { EventWorkCategory } from '@constants/enums';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsTagsType | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
};

const PercentageTags = ({
  startDate,
  endDate,
  statisticTagsList,
  removeTag,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
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
    totalDurationCategory,
    tagsOptions,
    selectedTags,
    setSelectedTags,
  } = useContext(StatisticTagStateContext);

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
        mergedItems.push({ ...item });
        mergedCategory.percent += item.percent;
        mergedCategory.duration += item.duration;
        mergedCategory.categoryColor =
          (colorData && lightenColor(colorData, item.percent)) ||
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
    const listPercent = categories.map((percent) => percent.percent);
    // Get list color
    const listColor = filteredCategories.map(
      (color, index) =>
        lightenColor(colorData as string, listPercent[index]) ||
        getRandomColor(),
    );
    // Get list label
    const listLabel = categories.map((label) => label.tagName || '');
    // Get list value
    const listValueActualChart = categories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = categories.map(
      (item) =>
        item.tasks &&
        item.tasks.slice(0, 6).map((task) => ({
          label: task.title,
        })),
    );
    // Get list id
    const listDataIds = categories.map((item) => item.tagId as number);
    // Get list duration
    const listDuration = categories.map(
      (item) => item.tasks && item.tasks.map((task) => task.totalDuration),
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
    if (statisticTagsList) {
      if (statisticTagsList.largeCategories) {
        const largeChartData = processChartData(
          statisticTagsList.largeCategories,
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
      if (statisticTagsList.mediumCategories) {
        const mediumChartData = processChartData(
          statisticTagsList.mediumCategories,
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
      if (statisticTagsList.smallCategories) {
        const smallChartData = processChartData(
          statisticTagsList.smallCategories,
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
      if (statisticTagsList.category) {
        const categoryChartData = processChartData(
          statisticTagsList.category,
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
  }, [statisticTagsList]);

  const handleClickTooltip = (id: number | null, type: string) => {
    let duration: string = '00:00:00';
    if (type === 'ALL') {
      duration = totalDurationLarge;
    }

    if (type === EventWorkCategory.LARGE) {
      duration =
        statisticTagsList?.largeCategories.find((item) => item.tagId == id)
          ?.duration || '00:00:00';
    }
    if (type === EventWorkCategory.MEDIUM) {
      duration =
        statisticTagsList?.mediumCategories?.find((item) => item.tagId == id)
          ?.duration || '00:00:00';
    }
    if (type === EventWorkCategory.SMALL) {
      duration =
        statisticTagsList?.smallCategories?.find((item) => item.tagId == id)
          ?.duration || '00:00:00';
    }
    setDetailCategory({
      id: id,
      type: type,
      totalDuration: duration,
    });

    setIsShowModal(true);
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
                  <div className="flex items-center gap-2">
                    <div className="w-[240px]">
                      <MultiSelectDropdown
                        options={tagsOptions}
                        placeholder="集計対象のタグを選択"
                        className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
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
                    </div>
                    <div>
                      <div className="flex gap-2 ">
                        {selectedTags.map((item) => {
                          return (
                            <div
                              key={item.value}
                              className="w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                              <span className="w-[32px] truncate">
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
              </div>
              <div className="flex gap-[17px] justify-center px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[220px]">
                  <div className="mt-4">
                    <Dropdown
                      label="チーム選択"
                      placeholder="-"
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
                    <div className="min-h-[220px]">
                      {dataChartLarge.data.length > 0 ? (
                        <PieChartCustom
                          isClickTooltip
                          mergedItems={dataChartLarge.mergedItems}
                          colors={dataChartLarge.colors}
                          data={dataChartLarge?.data}
                          labels={dataChartLarge?.labels}
                          actualValues={dataChartLarge?.actualValue}
                          className="w-[220px] h-[220px] "
                          optionsData={dataChartLarge.optionData}
                          listIdData={dataChartLarge.listId}
                          handleClickTooltip={(id: number | null) => {
                            handleClickTooltip(id, 'ALL');
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
                      disabled={!selectedOrganization}
                    />
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationMedium &&
                        formatTimeToJapanese(totalDurationMedium)}
                    </p>
                    <div>
                      {dataChartMedium.data.length > 0 ? (
                        <PieChartCustom
                          isClickTooltip
                          mergedItems={dataChartMedium.mergedItems}
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
                          handleClickChart={(data: OptionDropdownType) => {
                            if (data.value) {
                              handleSelectMedium(data);
                            }
                          }}
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
                      disabled={!selectedLarge}
                    />
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationSmall &&
                        formatTimeToJapanese(totalDurationSmall)}
                    </p>
                    <div>
                      {dataChartSmall.data.length > 0 ? (
                        <PieChartCustom
                          mergedItems={dataChartSmall.mergedItems}
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
                      disabled={!selectedLarge}
                    />
                    <p className="text-sm text-black my-[26px]">
                      合計{' '}
                      {totalDurationCategory &&
                        formatTimeToJapanese(totalDurationCategory)}
                    </p>
                    <div>
                      {dataChartCategory.data.length > 0 ? (
                        <PieChartCustom
                          mergedItems={dataChartCategory.mergedItems}
                          colors={dataChartCategory.colors}
                          data={dataChartCategory?.data}
                          labels={dataChartCategory?.labels}
                          isLast
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
          selectedLarge={selectedLarge}
          selectedMedium={selectedMedium}
          selectedSmall={selectedSmall}
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

export default PercentageTags;
