import React, { useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import PercentageBarCompareTeam from '@components/common/ProgressBar/ProgressBarCompareTeam';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { EventWorkCategory } from '@constants/enums';

import { DataPercentCompareType, OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { getRandomColor, lightenColor } from '@utils';
import { LoadingContext } from '@providers/LoadingProvider';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsListTeam: StatisticsCategories | undefined;
  statisticTagsListTeamCompare: StatisticsCategories | undefined;

  startDateCompare: Date;
  endDateCompare: Date | null;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const PercentageTeamTagsCompare = ({
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  statisticTagsListTeamCompare,
  statisticTagsListTeam,
  removeTag,
  handleSelectSmall,
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
    totalDurationCategory,

    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationCategoryCompare,

    selectedTags,
    tagsOptions,
    smallOptions,
    selectedSmall,
    isLoadingLarge,
    isLoadingMedium,
    isLoadingOrganization,
    isLoadingSmall,
    isLoadingOrganizationCompare,
    isLoadingLargeCompare,
    isLoadingMediumCompare,
    isLoadingSmallCompare,
    setSelectedTags,
  } = useContext(StatisticTeamTagsStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const { selectedOrganization: selectedOrganizationTeamList } =
    useContext(GlobalStateContext);

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
  const [dataChartCategory, setDataChartCategory] = useState<
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
  const [dataChartCategoryCompare, setDataChartCategoryCompare] = useState<
    DataPercentCompareType[]
  >([]);

  const mapCategoryData = (
    dataCategories: StatisticCategoryInfo[],
    colorData?: string,
  ) => {
    if (!dataCategories) return [];
    const categories = dataCategories.filter((item) => item.percent > 0);

    const otherItems = categories.filter((item) => item.percent < 0);
    const mainItems = categories.filter((item) => item.percent >= 0);

    const otherItem = {
      id: -1,
      label: 'その他',
      percentage: otherItems.reduce((sum, item) => sum + item.percent, 0),
      color: colorData || getRandomColor(),
      totalDuration: '',
      mergedItems: otherItems.map((item) => ({ ...item })),
      optionData: otherItems
        .flatMap((item) =>
          item.users?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: item.percent,
                avatarColor: user.user.avatarColor,
              };
            }
            return undefined;
          }),
        )
        .filter(
          (
            item,
          ): item is { label: string; percent: number; avatarColor: string } =>
            !!item,
        ),
    };

    const mappedMainItems = mainItems.map((item) => ({
      id: item.tagId as number,
      label: item.tagName || '',
      percentage: item.percent,
      color:
        lightenColor(colorData as string, item.percent) || getRandomColor(),
      totalDuration: item.duration,
      optionData:
        item.users
          ?.map((user) => {
            if (user?.user?.fullName) {
              return {
                label: user.user.fullName,
                percent: item.percent,
                avatarColor: user.user.avatarColor,
              };
            }
            return undefined;
          })
          .filter(
            (
              user,
            ): user is {
              label: string;
              percent: number;
              avatarColor: string;
            } => !!user,
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
    if (statisticTagsListTeam) {
      const color =
        statisticTagsListTeam.largeCategories &&
        statisticTagsListTeam.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      const colorMedium =
        statisticTagsListTeam.mediumCategories &&
        statisticTagsListTeam.mediumCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
      setDataChartLarge(
        mapCategoryData(statisticTagsListTeam.largeCategories || []),
      );
      setDataChartMedium(
        mapCategoryData(
          statisticTagsListTeam.mediumCategories || [],
          color?.categoryColor,
        ),
      );
      setDataChartSmall(
        mapCategoryData(
          statisticTagsListTeam.smallCategories || [],
          colorMedium?.categoryColor,
        ),
      );
      setDataChartCategory(
        mapCategoryData(statisticTagsListTeam.category || [], '#2E9267'),
      );
      setIsLoading(false);
    }
  }, [statisticTagsListTeam]);

  // Set data from category compare list
  useEffect(() => {
    if (statisticTagsListTeamCompare) {
      setDataChartLargeCompare(
        mapCategoryData(statisticTagsListTeamCompare.largeCategories || []),
      );
      setDataChartMediumCompare(
        mapCategoryData(
          statisticTagsListTeamCompare.mediumCategories || [],
          '#2E9267',
        ),
      );
      setDataChartSmallCompare(
        mapCategoryData(
          statisticTagsListTeamCompare.smallCategories || [],
          '#2E9267',
        ),
      );
      setDataChartCategoryCompare(
        mapCategoryData(statisticTagsListTeamCompare.category || [], '#2E9267'),
      );
      setIsLoading(false);
    }
  }, [statisticTagsListTeamCompare]);

  const handleClickTooltip = (
    id: number | null,
    type: string,
    isCompare: boolean,
  ) => {
    let duration: string = '00:00:00';
    if (isCompare) {
      if (type === EventWorkCategory.ALL) {
        duration =
          statisticTagsListTeamCompare?.largeCategories.find(
            (item) => item.tagId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticTagsListTeamCompare?.mediumCategories?.find(
            (item) => item.tagId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
        duration =
          statisticTagsListTeamCompare?.smallCategories?.find(
            (item) => item.tagId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.SMALL) {
        duration =
          statisticTagsListTeamCompare?.category?.find(
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
      if (type === EventWorkCategory.ALL) {
        duration =
          statisticTagsListTeam?.largeCategories.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.LARGE) {
        duration =
          statisticTagsListTeam?.mediumCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.MEDIUM) {
        duration =
          statisticTagsListTeam?.smallCategories?.find(
            (item) => item.categoryId == id,
          )?.duration || '00:00:00';
      }
      if (type === EventWorkCategory.SMALL) {
        duration =
          statisticTagsListTeam?.category?.find((item) => item.categoryId == id)
            ?.duration || '00:00:00';
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
                カテゴリーごとのタグの割合
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
                        labelOptionClass="break-words w-[190px]"
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
                      <div className="flex gap-2  flex-wrap">
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
              <div className="flex justify-between px-[30px] text-sm font-medium">
                {/* Pie Chart 1 */}
                <div className="w-[220px]">
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
                    <div className="min-h-[280px] mt-[10px] flex justify-centers">
                      <PercentageBarCompareTeam
                        isTag
                        data={dataChartLarge}
                        startDate={startDate}
                        endDate={endDate}
                        isLoading={isLoadingOrganization}
                        isLoadingCompare={isLoadingOrganizationCompare}
                        totalDuration={totalDurationLarge}
                        totalDurationCompare={totalDurationLargeCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartLargeCompare}
                        handleClickChart={(_data: number) => {}}
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
                      className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      classNameOption="!text-sm"
                      options={largeOptions}
                      selectedOption={selectedLarge || undefined}
                      onChange={(data) => handleSelectLarge(data)}
                      disabled={!selectedOrganization}
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        isTag
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
                        handleClickChart={(_data: number) => {}}
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
                      className="!h-[34px] !rounded-md !border text-sm !py-0 font-normal !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      classNameOption="!text-sm"
                      options={mediumOptions}
                      selectedOption={selectedMedium || undefined}
                      onChange={(data) => handleSelectMedium(data)}
                      disabled={!selectedLarge}
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        isTag
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
                        handleClickChart={(_data: number) => {}}
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
                      className="!h-[34px] !rounded-md !border text-sm !py-0 font-normal !border-[#77858F]"
                      labelTextClass="!text-[#77858F] !text-xs !font-medium"
                      classNameOption="!text-sm"
                      options={smallOptions}
                      selectedOption={selectedSmall || undefined}
                      onChange={(data) => handleSelectSmall(data)}
                      disabled={
                        !selectedMedium ||
                        selectedOrganization?.value !==
                          selectedOrganizationTeamList?.value
                      }
                    />
                    <div className="min-h-[280px] mt-[10px] flex justify-center">
                      <PercentageBarCompareTeam
                        isTag
                        isLast
                        data={dataChartCategory}
                        startDate={startDate}
                        endDate={endDate}
                        isLoading={isLoadingSmall}
                        isLoadingCompare={isLoadingSmallCompare}
                        startDateCompare={startDateCompare}
                        endDateCompare={endDateCompare}
                        dataCompare={dataChartCategoryCompare}
                        totalDuration={totalDurationCategory}
                        totalDurationCompare={totalDurationCategoryCompare}
                        handleClickChart={(_data: number) => {}}
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
          selectedLarge={selectedLarge}
          selectedMedium={selectedMedium}
          statisticTagsListTeam={statisticTagsListTeam}
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
      {isShowModalCompare && (
        <ListTaskDetailStatisticTagModal
          open={isShowModalCompare}
          selectedLarge={selectedLarge}
          selectedMedium={selectedMedium}
          statisticTagsListTeam={statisticTagsListTeam}
          selectedSmall={selectedSmall}
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

export default PercentageTeamTagsCompare;
