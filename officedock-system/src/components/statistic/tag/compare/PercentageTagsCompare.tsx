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
import { LoadingContext } from '@providers/LoadingProvider';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  statisticTagsCompareList: StatisticsCategories | undefined;

  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
};

const PercentageTagsCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticTagsCompareList,
  statisticTagsList,
  removeTag,
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
    selectedTags,
    tagsOptions,
    setSelectedTags,
  } = useContext(StatisticTagStateContext);
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
      id: item.tagId as number,
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
    if (statisticTagsList) {
      setDataChartLarge(mapCategoryData(statisticTagsList.largeCategories));
      setDataChartMedium(
        mapCategoryData(statisticTagsList.mediumCategories || []),
      );
      setDataChartSmall(
        mapCategoryData(statisticTagsList.smallCategories || []),
      );
      setIsLoading(false);
    }
  }, [statisticTagsList]);

  // Set data from category compare list
  useEffect(() => {
    if (statisticTagsCompareList) {
      setDataChartLargeCompare(
        mapCategoryData(statisticTagsCompareList.largeCategories),
      );
      setDataChartMediumCompare(
        mapCategoryData(statisticTagsCompareList.mediumCategories || []),
      );
      setDataChartSmallCompare(
        mapCategoryData(statisticTagsCompareList.smallCategories || []),
      );
      setIsLoading(false);
    }
  }, [statisticTagsCompareList]);

  const handleClickTooltip = (
    id: number | null,
    type: string,
    isCompare: boolean,
  ) => {
    let duration: string = '00:00:00';
    if (isCompare) {
      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticTagsCompareList?.largeCategories.find(
            (item) => item.tagId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
        duration =
          statisticTagsCompareList?.mediumCategories?.find(
            (item) => item.tagId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.SMALL) {
        duration =
          statisticTagsCompareList?.smallCategories?.find(
            (item) => item.tagId == id,
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
          statisticTagsList?.largeCategories.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
        duration =
          statisticTagsList?.mediumCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.SMALL) {
        duration =
          statisticTagsList?.smallCategories?.find(
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
                カテゴリーの割合
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
              {/* List tags  */}
              <div>
                <div className="flex justify-between w-full">
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
                <div className="flex items-center mt-8  gap-1 mb-[30px]">
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

export default PercentageTagsCompare;
