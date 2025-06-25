import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

import {
  StatisticCategoryInfo,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatTimeToJapanese, sumDurationsChart } from '@utils/date';
import { lightenColor } from '@utils';

import { EventWorkCategory } from '@constants/enums';

import ProgressBarTeamTagStatistic from './ProgressBarTeamTagStatistic';
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  removeTag: (selected: OptionDropdownType) => void;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

type ProgressDataType = {
  id: number;
  label: string;
  value: number;
  color: string;
  duration: string;
  optionData: UserListStatisticType[];
  mergedItems?: ProgressDataType[];
  organizationId?: string;
};
export function transformStatisticCategoryInfoToProgressData({
  data,
  mergeLabel = 'その他',
  mergeColor = '#83919E',
  threshold = 10,
}: {
  data: StatisticCategoryInfo[];
  mergeLabel?: string;
  mergeColor?: string;
  threshold?: number;
}): {
  finalData: ProgressDataType[];
  mergedItem?: ProgressDataType;
} {
  const progressData: ProgressDataType[] = data.map((item) => ({
    id: item.tagId as number,
    label: item.tagName || '',
    value: item.percent,
    color: lightenColor('#2E9267' as string, item.percent) || '',
    duration: item.duration,
    optionData: item.users || [],
    organizationId: String(item.organizationId),
  }));

  const mergedItems = progressData.filter((item) => item.value < threshold);
  const mainItems = progressData.filter((item) => item.value >= threshold);

  if (mergedItems.length === 0) {
    return {
      finalData: mainItems,
    };
  }

  const totalMergedPercent = mergedItems.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const durations = mergedItems.map((item) => item.duration);

  const totalDuration = sumDurationsChart(durations);

  const mergedItem: ProgressDataType = {
    id: -1,
    label: mergeLabel,
    value: totalMergedPercent,
    color: mergeColor,
    duration: totalDuration,
    optionData: mergedItems.flatMap((item) => item.optionData),
    mergedItems,
  };

  return {
    finalData: [...mainItems, mergedItem],
    mergedItem,
  };
}

const AllocationTeamTag = memo(
  ({
    startDate,
    endDate,
    statisticTagsList,
    removeTag,
    handleSelectOrganization,
    handleSelectLarge,
    handleSelectMedium,
    handleSelectSmall,
  }: Props) => {
    const [isExtendData, setIsExtendData] = useState(true);
    const [isShowModal, setIsShowModal] = useState(false);
    const [detailCategory, setDetailCategory] = useState<{
      id: number | null;
      userId: number;
      type: string;
      totalDuration: string;
      organizationId?: string;
    } | null>(null);

    const [progressDataLarge, setProgressDataLarge] = useState<
      ProgressDataType[]
    >([]);
    const [progressDataMedium, setProgressDataMedium] = useState<
      ProgressDataType[]
    >([]);
    const [progressDataSmall, setProgressDataSmall] = useState<
      ProgressDataType[]
    >([]);
    const [progressDataCategory, setProgressDataCategory] = useState<
      ProgressDataType[]
    >([]);
    const {
      totalDurationLarge,
      totalDurationMedium,
      totalDurationSmall,
      totalDurationCategory,
      listOptionsOrganization,
      largeOptions,
      mediumOptions,
      smallOptions,
      selectedLarge,
      selectedMedium,
      selectedOrganization,
      selectedTags,
      selectedSmall,
      tagsOptions,
      setSelectedTags,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      isLoadingSmall,
      isCheckCompare,
      setIsLoadingLarge,
      setIsLoadingMedium,
      setIsLoadingSmall,
      setIsLoadingOrganization,
      setIsLoadingLargeCompare,
      setIsLoadingMediumCompare,
      setIsLoadingSmallCompare,
      setIsLoadingOrganizationCompare,
    } = useContext(StatisticTeamTagsStateContext);

    useEffect(() => {
      if (statisticTagsList) {
        if (statisticTagsList.largeCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.largeCategories,
          });
          setProgressDataLarge(finalData);
        } else {
          setProgressDataLarge([]);
        }
        if (statisticTagsList.mediumCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.mediumCategories,
          });
          setProgressDataMedium(finalData);
        } else {
          setProgressDataMedium([]);
        }
        if (statisticTagsList.smallCategories) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.smallCategories,
          });
          setProgressDataSmall(finalData);
        } else {
          setProgressDataSmall([]);
        }
        if (statisticTagsList.category) {
          const { finalData } = transformStatisticCategoryInfoToProgressData({
            data: statisticTagsList.category,
          });
          setProgressDataCategory(finalData);
        } else {
          setProgressDataCategory([]);
        }
      }
    }, [statisticTagsList]);

    const handleClickTooltip = ({
      id,
      userId,
      duration,
      type,
      organizationId,
    }: {
      id: number;
      userId: number;
      duration: string;
      type: string;
      organizationId?: string;
    }) => {
      setDetailCategory({
        id: id,
        userId: userId,
        type: type,
        totalDuration: duration,
        organizationId,
      });

      setTimeout(() => {
        setIsShowModal(true);
      }, 1000);
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
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[14px]">
          {/* Header & sort */}
          <div className="flex justify-between">
            <div className="flex items-center gap-x-5">
              <div className="flex items-center gap-[10px] ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                  name="statistic-progress-bar icon"
                  src={`/icons/statistic-progress-bar.svg`}
                />
                <span className="text-black font-semibold text-[18px] relative top-[2px]">
                  カテゴリーごとのタグの時間配分
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
                            setIsLoadingLarge(true);
                            setIsLoadingMedium(true);
                            setIsLoadingSmall(true);
                            setIsLoadingOrganization(true);
                            if (isCheckCompare) {
                              setIsLoadingLargeCompare(true);
                              setIsLoadingMediumCompare(true);
                              setIsLoadingSmallCompare(true);
                              setIsLoadingOrganizationCompare(true);
                            }
                            setSelectedTags(updatedTagIds);
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex gap-2 flex-wrap ">
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
                </div>
                <div className="flex  justify-between px-[30px] text-sm font-medium">
                  {/* Column Chart 1 */}
                  <div className="w-[220px]">
                    <div className="mt-4">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
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

                      {isLoadingOrganization ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataLarge.length > 0 &&
                            progressDataLarge.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                organizationId={item.organizationId}
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                  duration,
                                  organizationId,
                                }: {
                                  userId: number;
                                  tagId: number;
                                  duration: string;
                                  organizationId?: string;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.ALL,
                                    organizationId,
                                  });
                                }}
                                handleClickChart={(
                                  _data: OptionDropdownType,
                                ) => {}}
                                {...item}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-[18px]">
                    <ImageRound
                      className={`w-fit h-fit relative top-9 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 2 */}
                  <div className="w-[220px]">
                    <div className="mt-4">
                      <Dropdown
                        label="大カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md  text-sm font-normal !py-0 !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={largeOptions}
                        selectedOption={selectedLarge || undefined}
                        onChange={(data) => handleSelectLarge(data)}
                        disabled={!selectedOrganization}
                      />
                      {progressDataMedium.length > 0 && (
                        <p className="text-sm text-black my-[26px]">
                          合計{' '}
                          {totalDurationMedium &&
                            formatTimeToJapanese(totalDurationMedium)}
                        </p>
                      )}
                      {isLoadingLarge ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataMedium.length > 0 &&
                            progressDataMedium.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                  duration,
                                }: {
                                  userId: number;
                                  tagId: number;
                                  duration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.LARGE,
                                  });
                                }}
                                handleClickChart={(
                                  _data: OptionDropdownType,
                                ) => {}}
                                {...item}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-[18px]">
                    <ImageRound
                      className={`w-fit h-fit relative top-9 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 3 */}
                  <div className="w-[220px]">
                    <div className="mt-4">
                      <Dropdown
                        label="中カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={mediumOptions}
                        selectedOption={selectedMedium || undefined}
                        onChange={(data) => handleSelectMedium(data)}
                        disabled={!selectedLarge}
                      />
                      {progressDataSmall.length > 0 && (
                        <p className="text-sm text-black my-[26px]">
                          合計{' '}
                          {totalDurationSmall &&
                            formatTimeToJapanese(totalDurationSmall)}
                        </p>
                      )}
                      {isLoadingMedium ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataSmall.length > 0 &&
                            progressDataSmall.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                  duration,
                                }: {
                                  userId: number;
                                  tagId: number;
                                  duration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.MEDIUM,
                                  });
                                }}
                                {...item}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-[18px]">
                    <ImageRound
                      className={`w-fit h-fit relative top-9 `}
                      src="/icons/drawer-blue.svg"
                      name="icon chevron right"
                    />
                  </div>
                  {/* Column Chart 4 */}
                  <div className="w-[220px]">
                    <div className="mt-4">
                      <Dropdown
                        label="小カテゴリー選択"
                        placeholder="-"
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={smallOptions}
                        selectedOption={selectedSmall || undefined}
                        onChange={(data) => handleSelectSmall(data)}
                        disabled={!selectedMedium}
                      />
                      {progressDataCategory.length > 0 && (
                        <p className="text-sm text-black my-[26px]">
                          合計{' '}
                          {totalDurationCategory &&
                            formatTimeToJapanese(totalDurationCategory)}
                        </p>
                      )}
                      {isLoadingSmall ? (
                        <div className="flex flex-col gap-8 mt-3">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataCategory.length > 0 &&
                            progressDataCategory.map((item, index) => (
                              <ProgressBarTeamTagStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={({
                                  userId,
                                  tagId,
                                  duration,
                                }: {
                                  userId: number;
                                  tagId: number;
                                  duration: string;
                                }) => {
                                  handleClickTooltip({
                                    id: tagId,
                                    userId,
                                    duration,
                                    type: EventWorkCategory.SMALL,
                                  });
                                }}
                                {...item}
                              />
                            ))}
                        </div>
                      )}
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
            statisticTagsListTeam={statisticTagsList}
            onClose={() => {
              setIsShowModal(false);
            }}
            handleScroll={handleScroll}
          />
        )}
      </>
    );
  },
);

export default AllocationTeamTag;
