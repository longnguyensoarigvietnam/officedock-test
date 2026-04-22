import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ListTaskDetailStatisticModal from '@components/modals/ListTaskDetailStatisticModal';

import {
  ProgressDataType,
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatTimeToJapanese } from '@utils/date';
import {
  mapStatisticAllTeamCategoryInfoToProgressData,
  mapStatisticCategoryInfoToProgressData,
} from '@utils';

import { EventWorkCategory } from '@constants/enums';
import { ALL_TEAM_STATISTIC, NO_SETTING } from '@constants';

import { StatisticStateContext } from '@providers/StatisticProvider';

import FilterStatistic from './filter/FilterStatistic';
import ProgressBarStatistic from './ProgressBarStatistic';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const AllocationCategory = memo(
  ({
    startDate,
    endDate,
    statisticCategoryList,
    statisticAllTeamCategoryList,
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
    const {
      isDisableCalendar,
      isHasLoading,
      totalDurationLarge,
      totalDurationMedium,
      totalDurationSmall,
      listOptionsOrganization,
      largeOptions,
      mediumOptions,
      smallOptions,
      selectedLarge,
      selectedMedium,
      selectedOrganization,
      selectedTags,
      selectedSmall,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
    } = useContext(StatisticStateContext);

    useEffect(() => {
      if (
        statisticCategoryList &&
        selectedOrganization?.value != ALL_TEAM_STATISTIC
      ) {
        if (statisticCategoryList.largeCategories) {
          const { finalData } = mapStatisticCategoryInfoToProgressData({
            data: statisticCategoryList.largeCategories,
          });
          setProgressDataLarge(finalData);
        } else {
          setProgressDataLarge([]);
        }
        if (statisticCategoryList.mediumCategories) {
          const color = statisticCategoryList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;
          const { finalData } = mapStatisticCategoryInfoToProgressData({
            data: statisticCategoryList.mediumCategories,
            colorData: color,
          });
          setProgressDataMedium(finalData);
        } else {
          setProgressDataMedium([]);
        }
        if (statisticCategoryList.smallCategories) {
          const color = statisticCategoryList.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor;
          const { finalData } = mapStatisticCategoryInfoToProgressData({
            data: statisticCategoryList.smallCategories,
            colorData: color,
          });

          setProgressDataSmall(finalData);
        } else {
          setProgressDataSmall([]);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statisticCategoryList, selectedOrganization?.value]);

    useEffect(() => {
      if (
        statisticAllTeamCategoryList &&
        selectedOrganization?.value == ALL_TEAM_STATISTIC
      ) {
        if (statisticAllTeamCategoryList.largeCategories) {
          const { finalData } = mapStatisticAllTeamCategoryInfoToProgressData({
            data: statisticAllTeamCategoryList.largeCategories,
          });
          setProgressDataLarge(finalData);
          setProgressDataMedium([]);
          setProgressDataSmall([]);
        } else {
          setProgressDataLarge([]);
          setProgressDataMedium([]);
          setProgressDataSmall([]);
        }
      }
    }, [statisticAllTeamCategoryList, selectedOrganization?.value]);

    const handleClickTooltip = (
      id: number | null,
      type: string,
      organizationId?: string,
    ) => {
      if (isLoadingLarge || isLoadingMedium || isLoadingOrganization) return;
      setDetailCategory({
        id: id,
        type: type,
        organizationId,
      });

      setTimeout(() => {
        setIsShowModal(true);
      }, 500);
    };

    const handleScroll = () => {
      if (detailCategory?.type === EventWorkCategory.ALL) {
        const item = largeOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectLarge(item);

        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectLarge({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.LARGE) {
        const item = mediumOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectMedium(item);
        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectMedium({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.MEDIUM) {
        const item = smallOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectSmall(item);
        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectSmall({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }
      if (detailCategory?.type === EventWorkCategory.SMALL) {
        const item = smallOptions.find(
          (item) => item.value === detailCategory?.id,
        );
        item && handleSelectSmall(item);
        if (String(detailCategory?.id) == NO_SETTING) {
          handleSelectSmall({
            label: NO_SETTING,
            value: NO_SETTING,
          });
        }
      }

      const element = document.getElementById('task-list-statistic');
      setIsShowModal(false);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    const [activeBarLargeId, setActiveBarLargeId] = useState<number | null>(
      null,
    );
    const [activeBarMediumId, setActiveBarMediumId] = useState<number | null>(
      null,
    );
    const [activeBarSmallId, setActiveBarSmallId] = useState<number | null>(
      null,
    );

    return (
      <>
        <div
          style={{
            boxShadow: '0px 4px 10px 0px #0000000D',
          }}
          className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
          {/* Header & sort */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-x-5">
              <div className="flex items-center gap-[10px] w-fit flex-shrink-0 ">
                <ImageRound
                  className={`w-5 h-5  hover:cursor-pointer`}
                  name="statistic-progress-bar icon"
                  src={`/icons/statistic-progress-bar.svg`}
                />
                <span className="text-black w-fit flex-shrink-0 font-semibold text-[18px]">
                  各カテゴリーの時間配分
                </span>
              </div>
              {/* Filter */}
              <FilterStatistic />
            </div>
            <ImageRound
              src="/icons/extend-calendar.svg"
              name="Extend calendar"
              className={`!w-[14px] !h-[14px] hover:cursor-pointer ${
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
                  {/* Column Chart 1 */}
                  <div className="w-[300px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                      大カテゴリー
                    </div>
                    <div className="mt-4">
                      <Dropdown
                        label="チーム選択"
                        placeholder="-"
                        disabled={isHasLoading}
                        placeholderClass="!text-black text-sm font-normal"
                        className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                        labelTextClass="!text-[#77858F] !text-xs !font-medium"
                        classNameOption="!text-sm"
                        options={listOptionsOrganization}
                        selectedOption={selectedOrganization || undefined}
                        onChange={(data) => handleSelectOrganization(data)}
                      />
                      <p className="text-sm text-black leading-[1] my-[26px]">
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
                          {progressDataLarge.length > 0 ? (
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
                                isAllTeam={
                                  selectedOrganization?.value ==
                                  ALL_TEAM_STATISTIC
                                }
                                isActive={activeBarLargeId === item.id}
                                onActivate={(id: number) => {
                                  setActiveBarSmallId(null);
                                  setActiveBarMediumId(null);
                                  setActiveBarLargeId(id);
                                }}
                                onDeactivate={(id: number) => {
                                  if (activeBarLargeId === id)
                                    setActiveBarLargeId(null);
                                }}
                                organizationId={item.organizationId}
                                handleClickChart={(
                                  data: OptionDropdownType,
                                ) => {
                                  if (
                                    data.value &&
                                    data.value != selectedLarge?.value
                                  ) {
                                    handleSelectLarge(data);
                                  }
                                }}
                                {...item}
                              />
                            ))
                          ) : (
                            <div className="flex items-center justify-center h-[100px]">
                              <span className="text-sm text-[#77858F]">データがありません</span>
                            </div>
                          )}
                        </div>
                      )}
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
                  {/* Column Chart 2 */}
                  <div className="w-[300px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                      中カテゴリー
                    </div>
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
                        disabled={
                          selectedOrganization?.value == '' || isHasLoading
                        }
                      />
                      <p className="text-sm text-black leading-[1] my-[26px]">
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
                          {progressDataMedium.length > 0 ? (
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
                                  data: OptionDropdownType,
                                ) => {
                                  if (
                                    data.value &&
                                    data.value != selectedMedium?.value
                                  ) {
                                    handleSelectMedium(data);
                                  }
                                }}
                                isActive={activeBarMediumId === item.id}
                                onActivate={(id: number) => {
                                  setActiveBarSmallId(null);
                                  setActiveBarLargeId(null);
                                  setActiveBarMediumId(id);
                                }}
                                onDeactivate={(id: number) => {
                                  if (activeBarMediumId === id)
                                    setActiveBarMediumId(null);
                                }}
                                {...item}
                              />
                            ))
                          ) : selectedLarge?.value !== '' ? (
                            <div className="flex items-center justify-center h-[100px]">
                              <span className="text-sm text-[#77858F]">データがありません</span>
                            </div>
                          ) : null}
                        </div>
                      )}
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
                  {/* Column Chart 3 */}
                  <div className="w-[300px]">
                    <div className="w-full h-[34px] bg-[#EBF1F7] text-primary rounded-md flex items-center justify-center">
                      小カテゴリー
                    </div>
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
                        disabled={
                          selectedLarge?.value == '' ||
                          isHasLoading ||
                          isDisableCalendar
                        }
                      />
                      <p className="text-sm text-black leading-[1] my-[26px]">
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
                          {progressDataSmall.length > 0 ? (
                            progressDataSmall.map((item, index) => (
                              <ProgressBarStatistic
                                key={index}
                                isLast
                                classProgressClass="h-[20px] rounded-[4px]"
                                handleClickTooltip={(id: number | null) => {
                                  handleClickTooltip(
                                    id,
                                    EventWorkCategory.MEDIUM,
                                  );
                                }}
                                isActive={activeBarSmallId === item.id}
                                onActivate={(id: number) => {
                                  setActiveBarSmallId(id);
                                  setActiveBarMediumId(null);
                                  setActiveBarLargeId(null);
                                }}
                                onDeactivate={(id: number) => {
                                  if (activeBarSmallId === id)
                                    setActiveBarSmallId(null);
                                }}
                                {...item}
                              />
                            ))
                          ) : selectedMedium?.value !== '' ? (
                            <div className="flex items-center justify-center h-[100px]">
                              <span className="text-sm text-[#77858F]">データがありません</span>
                            </div>
                          ) : null}
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
  },
);

export default AllocationCategory;
