import React, { useContext, useEffect, useState } from 'react';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompareTeam from '@components/common/ProgressBar/ProgressBarCompareTeam';
import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { getRandomColor, lightenColor } from '@utils';
import { LoadingContext } from '@providers/LoadingProvider';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  statisticCategoryListTeamCompare: StatisticsCategories | undefined;

  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageTeamCategoryCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticCategoryListTeamCompare,
  statisticTeamCategoryList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
  handleSelectOrganization,
  removeTag,
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
    smallOptions,
    setSelectedTags,
  } = useContext(StatisticTeamStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const [isExtendData, setIsExtendData] = useState(true);

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
    categories: StatisticCategoryInfo[],
    colorData?: string,
  ) => {
    if (!categories) return [];

    const otherItems = categories.filter((item) => item.percent < 10);
    const mainItems = categories.filter((item) => item.percent >= 10);

    const otherItem = {
      id: -1,
      label: 'その他',
      percentage: otherItems.reduce((sum, item) => sum + item.percent, 0),
      color: colorData || getRandomColor(),
      totalDuration: '',
      optionData: otherItems
        .flatMap((item) =>
          item.users?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: item.percent,
              };
            }
            return undefined;
          }),
        )
        .filter((item): item is { label: string; percent: number } => !!item),
      mergedItems: otherItems,
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
      optionData:
        item.users
          ?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: item.percent,
              };
            }
            return undefined;
          })
          .filter(
            (user): user is { label: string; percent: number } => !!user,
          ) || [],
      mergedItems: [],
    }));

    return [
      ...mappedMainItems,
      ...(otherItem.percentage > 0 ? [otherItem] : []),
    ];
  };

  // Set data from category list
  useEffect(() => {
    if (statisticTeamCategoryList) {
      const color =
        statisticTeamCategoryList.largeCategories &&
        statisticTeamCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      setDataChartLarge(
        mapCategoryData(statisticTeamCategoryList.largeCategories || []),
      );
      setDataChartMedium(
        mapCategoryData(
          statisticTeamCategoryList.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmall(
        mapCategoryData(
          statisticTeamCategoryList.smallCategories || [],
          color?.categoryColor,
        ),
      );
      setIsLoading(false);
    }
  }, [statisticTeamCategoryList]);

  // Set data from category compare list
  useEffect(() => {
    if (statisticCategoryListTeamCompare) {
      const color =
        statisticCategoryListTeamCompare &&
        statisticCategoryListTeamCompare.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      setDataChartLargeCompare(
        mapCategoryData(statisticCategoryListTeamCompare.largeCategories || []),
      );
      setDataChartMediumCompare(
        mapCategoryData(
          statisticCategoryListTeamCompare.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmallCompare(
        mapCategoryData(
          statisticCategoryListTeamCompare.smallCategories || [],
          color?.categoryColor,
        ),
      );
      setIsLoading(false);
    }
  }, [statisticCategoryListTeamCompare]);

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
              <div className="flex gap-[35px] justify-center px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[280px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    大カテゴリー
                  </div>
                  <div className="mt-4 ">
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
                    <div className="min-h-[280px] mt-[30px]">
                      {
                        <PercentageBarCompareTeam
                          data={dataChartLarge}
                          startDate={startDate}
                          endDate={endDate}
                          totalDuration={totalDurationLarge}
                          totalDurationCompare={totalDurationLargeCompare}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartLargeCompare}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: number) => {
                            if (data) {
                              const select = largeOptions.find(
                                (item) => item.value === data,
                              );
                              selectedOrganization &&
                                handleSelectOrganization(selectedOrganization);
                              if (select) {
                                handleSelectLarge(select);
                              }
                            }
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
                      placeholder="-"
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={largeOptions}
                      selectedOption={selectedLarge || undefined}
                      onChange={(data) => handleSelectLarge(data)}
                      disabled={!selectedOrganization}
                    />
                    <div className="min-h-[280px] mt-[30px]">
                      {
                        <PercentageBarCompareTeam
                          data={dataChartMedium}
                          startDate={startDate}
                          endDate={endDate}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartMediumCompare}
                          totalDuration={totalDurationMedium}
                          totalDurationCompare={totalDurationMediumCompare}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: number) => {
                            if (data) {
                              const select = mediumOptions.find(
                                (item) => item.value === data,
                              );
                              selectedOrganization &&
                                handleSelectOrganization(selectedOrganization);
                              if (select) {
                                handleSelectMedium(select);
                              }
                            }
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
                      placeholder="-"
                      placeholderClass="!text-black text-sm font-normal"
                      className="!h-[34px] !rounded-md !border text-sm !py-0 font-normal !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      options={mediumOptions}
                      selectedOption={selectedMedium || undefined}
                      onChange={(data) => handleSelectMedium(data)}
                      disabled={!selectedLarge}
                    />
                    <div className="min-h-[280px] mt-[30px]">
                      {
                        <PercentageBarCompareTeam
                          data={dataChartSmall}
                          startDate={startDate}
                          endDate={endDate}
                          startDateCompare={startDateCompare}
                          endDateCompare={endDateCompare}
                          dataCompare={dataChartSmallCompare}
                          totalDuration={totalDurationSmall}
                          totalDurationCompare={totalDurationSmallCompare}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: number) => {
                            if (data) {
                              const select = smallOptions.find(
                                (item) => item.value === data,
                              );
                              selectedOrganization &&
                                handleSelectOrganization(selectedOrganization);
                              if (select) {
                                handleSelectSmall(select);
                              }
                            }
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
    </>
  );
};

export default PercentageTeamCategoryCompare;
