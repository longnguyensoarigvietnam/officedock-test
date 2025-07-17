import React, { memo, useContext, useEffect, useState } from 'react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ListTaskDetailStatisticTagModal from '@components/modals/ListTaskDetailStatisticTagModal';

import {
  StatisticsAllTeams,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';

import { EventWorkCategory } from '@constants/enums';

import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

import ProgressBarStatistic from './ProgressBarStatistic';
import FilterTag from './filter/FilterTag';
import { ALL_TEAM_STATISTIC, SUB_TEAMS } from '@constants';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  statisticAllTeamCategoryList: StatisticsAllTeams | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

type ProgressDataType = {
  id: number | string;
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
    const [progressDataCategory, setProgressDataCategory] = useState<
      ProgressDataType[]
    >([]);
    const {
      isDisableCalendar,
      isHasLoading,
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
      selectedSmall,
      isLoadingLarge,
      isLoadingMedium,
      isLoadingOrganization,
      isLoadingSmall,
    } = useContext(StatisticTagStateContext);

    useEffect(() => {
      if (
        statisticTagsList &&
        selectedOrganization?.value !== ALL_TEAM_STATISTIC
      ) {
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
    }, [statisticTagsList, selectedOrganization?.value]);

    useEffect(() => {
      if (
        statisticAllTeamCategoryList &&
        selectedOrganization?.value == ALL_TEAM_STATISTIC
      ) {
        if (statisticAllTeamCategoryList.largeCategories) {
          const listDataLarge =
            statisticAllTeamCategoryList.largeCategories.map((item) => ({
              id: item.organizationId,
              label: item.organizationName as string,
              value: item.percent,
              color:
                item.color ||
                lightenColor('#2E9267' as string, item.percent) ||
                getRandomColor(),
              duration: item.duration,
              optionData:
                item.organizationId == SUB_TEAMS
                  ? item?.subTeams
                      ?.slice(0, 3)
                      .map((team) => team?.organizationName || '') || []
                  : item?.data
                      ?.slice(0, 3)
                      .map(
                        (category) =>
                          category?.categoryName || category?.tagName || '',
                      ) || [],
              organizationId: item.organizationId,
            }));
          setProgressDataLarge(listDataLarge);
        } else {
          setProgressDataLarge([]);
        }
      }
    }, [statisticAllTeamCategoryList, selectedOrganization?.value]);

    const handleClickTooltip = ({
      id,
      type,
      organizationId,
    }: {
      id: number | null;
      type: EventWorkCategory;
      organizationId?: string;
    }) => {
      setDetailCategory({
        id: id,
        type: type,
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
                    {/* Filter tag */}
                    <FilterTag />
                  </div>
                </div>
                <div className="flex  justify-between px-[30px] text-sm font-medium">
                  {/* Column Chart 1 */}
                  <div className="w-[220px]">
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
                                  handleClickTooltip({
                                    id,
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
                        disabled={!selectedOrganization || isHasLoading}
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
                                  handleClickTooltip({
                                    id,
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
                        disabled={
                          !selectedLarge || isHasLoading || isDisableCalendar
                        }
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
                                  handleClickTooltip({
                                    id,
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
                        disabled={
                          !selectedMedium || isHasLoading || isDisableCalendar
                        }
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
                                isLast
                                handleClickTooltip={(id: number | null) => {
                                  handleClickTooltip({
                                    id,
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
