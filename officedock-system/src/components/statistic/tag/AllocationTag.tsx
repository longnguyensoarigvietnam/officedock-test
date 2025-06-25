import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';

import { EventWorkCategory } from '@constants/enums';

import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

import ProgressBarStatistic from './ProgressBarStatistic';

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
  optionData: string[];
};

const AllocationTag = memo(
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
    } = useContext(StatisticTagStateContext);

    useEffect(() => {
      if (statisticTagsList) {
        if (statisticTagsList.largeCategories) {
          const listDataLarge = statisticTagsList.largeCategories.map(
            (item) => ({
              id: item.tagId as number,
              label: item.tagName as string,
              value: item.percent,
              color:
                lightenColor('#2E9267' as string, item.percent) ||
                getRandomColor(),
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
              organizationId: item.organizationId,
            }),
          );
          setProgressDataLarge(listDataLarge);
        } else {
          setProgressDataLarge([]);
        }
        if (statisticTagsList.mediumCategories) {
          const listDataMedium = statisticTagsList.mediumCategories.map(
            (item) => ({
              id: item.tagId as number,
              label: item.tagName as string,
              value: item.percent,
              color:
                lightenColor('#2E9267' as string, item.percent) ||
                getRandomColor(),
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
            }),
          );
          setProgressDataMedium(listDataMedium);
        } else {
          setProgressDataMedium([]);
        }
        if (statisticTagsList.smallCategories) {
          const listDataSmall = statisticTagsList.smallCategories.map(
            (item) => ({
              id: item.tagId as number,
              label: item.tagName as string,
              value: item.percent,
              color:
                lightenColor('#2E9267' as string, item.percent) ||
                getRandomColor(),
              duration: item.duration,
              optionData: item.tasks.slice(0, 3).map((task) => task.title),
            }),
          );

          setProgressDataSmall(listDataSmall);
        } else {
          setProgressDataSmall([]);
        }
        if (statisticTagsList.category) {
          const listDataCategory = statisticTagsList.category.map((item) => ({
            id: item.tagId as number,
            label: item.tagName as string,
            value: item.percent,
            color:
              lightenColor('#2E9267' as string, item.percent) ||
              getRandomColor(),
            duration: item.duration,
            optionData: item.tasks.slice(0, 3).map((task) => task.title),
          }));

          setProgressDataCategory(listDataCategory);
        } else {
          setProgressDataCategory([]);
        }
      }
    }, [statisticTagsList]);

    const getDuration = (
      dataSource: any,
      type: EventWorkCategory,
      tagId: number,
      organizationId?: string,
    ): string => {
      const categoryMap = {
        [EventWorkCategory.ALL]: dataSource?.largeCategories,
        [EventWorkCategory.LARGE]: dataSource?.mediumCategories,
        [EventWorkCategory.MEDIUM]: dataSource?.smallCategories,
        [EventWorkCategory.SMALL]: dataSource?.category,
      };

      const categoryList = categoryMap[type] || [];

      const item = categoryList?.find(
        (item: any) =>
          item.tagId === tagId &&
          (!organizationId || String(item.organizationId) === organizationId),
      );

      return item?.duration || '00:00:00';
    };

    const handleClickTooltip = (
      id: number | null,
      type: EventWorkCategory,
      organizationId?: string,
    ) => {
      const duration = getDuration(
        statisticTagsList,
        type,
        id as number,
        organizationId,
      );
      setDetailCategory({
        id: id,
        type: type,
        totalDuration: duration,
        organizationId,
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
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataLarge.length > 0 &&
                            progressDataLarge.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={(
                                  id: number | null,
                                  organizationId?: string,
                                ) => {
                                  handleClickTooltip(
                                    id,
                                    EventWorkCategory.ALL,
                                    organizationId,
                                  );
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationMedium &&
                          formatTimeToJapanese(totalDurationMedium)}
                      </p>
                      {isLoadingLarge ? (
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataMedium.length > 0 &&
                            progressDataMedium.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={(id: number | null) => {
                                  handleClickTooltip(
                                    id,
                                    EventWorkCategory.LARGE,
                                  );
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationSmall &&
                          formatTimeToJapanese(totalDurationSmall)}
                      </p>
                      {isLoadingMedium ? (
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataSmall.length > 0 &&
                            progressDataSmall.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={(id: number | null) => {
                                  handleClickTooltip(
                                    id,
                                    EventWorkCategory.MEDIUM,
                                  );
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
                      <p className="text-sm text-black my-[26px]">
                        合計{' '}
                        {totalDurationCategory &&
                          formatTimeToJapanese(totalDurationCategory)}
                      </p>
                      {isLoadingSmall ? (
                        <div className="flex flex-col gap-8">
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                          <SkeletonElement className="!w-full !h-[20px] !rounded-[4px]" />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {progressDataCategory.length > 0 &&
                            progressDataCategory.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={(id: number | null) => {
                                  handleClickTooltip(
                                    id,
                                    EventWorkCategory.SMALL,
                                  );
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

export default AllocationTag;
