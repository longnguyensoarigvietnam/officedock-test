import React, { useEffect, useState, useContext, Fragment } from 'react';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import PieChart from '@components/common/Chart/PieChartCustom';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { SkeletonElement } from '@components/common/SkeletonLoading';
import ActionFilterStatisticTeam from '@components/modals/ActionFilterTeamStatistic';

import { DataChartType, OptionDropdownType } from '@interfaces/common';
import {
  DataTaskModalStatisticType,
  StatisticCategoryInfo,
  StatisticsCategories,
  UserListStatisticType,
} from '@interfaces/statistic';

import { convertToJapaneseTime, formatTimeToJapanese } from '@utils/date';
import { getRandomColor, lightenColor } from '@utils';
import { LoadingContext } from '@providers/LoadingProvider';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTeamCategoryList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectOrganizationCustom: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  removeTag: (selected: OptionDropdownType) => void;
  removeUser: (selected: OptionDropdownType) => void;
};

const PercentageCategoryTeam = ({
  statisticTeamCategoryList,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectOrganization,
  removeTag,
  removeUser,
  handleSelectOrganizationCustom,
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
    tagsOptions,
    isLoadingLarge,
    isLoadingMedium,
    remainingCountUser,
    remainingCountTag,
    firstThreeUser,
    allLabelUser,
    allLabelTag,
    firstThreeTag,
    listMemberTeam,
    isLoadingOrganization,
  } = useContext(StatisticTeamStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const [isExtendData, setIsExtendData] = useState(true);

  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

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
    dataCategories: StatisticCategoryInfo[],
    colorData?: string,
  ) => {
    const categories = dataCategories.filter((item) => item.percent > 0);
    const mergedItems: StatisticCategoryInfo[] = [];
    const mergedCategory: StatisticCategoryInfo = {
      categoryName: 'その他',
      categoryColor: colorData || getRandomColor(),
      percent: 0,
      duration: '',
      tasks: [] as DataTaskModalStatisticType[],
      users: [] as UserListStatisticType[],
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
          item.categoryColor ||
          (colorData && lightenColor(colorData, item.percent)) ||
          getRandomColor();
        mergedCategory.tasks = mergedCategory.tasks.concat(item.tasks);
        mergedCategory.users = mergedCategory.users?.concat(item.users || []);

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
    const listColor = filteredCategories.map(
      (color, index) =>
        color.categoryColor ||
        lightenColor(colorData as string, listPercent[index]) ||
        getRandomColor(),
    );
    // Get list label
    const listLabel = filteredCategories.map((label) => label.categoryName);
    // Get list value
    const listValueActualChart = filteredCategories.map((item) =>
      convertToJapaneseTime(item.duration),
    );
    // Get list options
    const listDataOptions = filteredCategories.map(
      (item) =>
        item.users?.map((user) => ({
          label: user.user.fullName,
          avatarColor: user.user.avatarColor,
          percent: user.percent,
          avatarUrl: user.user?.avatar || '',
        })) || [],
    );
    // Get list id
    const listDataIds = filteredCategories.map((item) => item.categoryId);
    // Get list duration
    const listDuration = filteredCategories.map(
      (item) => item.users?.map((user) => user.duration) || [],
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
    if (statisticTeamCategoryList) {
      if (statisticTeamCategoryList.largeCategories) {
        const largeChartData = processChartData(
          statisticTeamCategoryList.largeCategories,
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
      if (statisticTeamCategoryList.mediumCategories) {
        const color = statisticTeamCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
        const mediumChartData = processChartData(
          statisticTeamCategoryList.mediumCategories,
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
      if (statisticTeamCategoryList.smallCategories) {
        const color = statisticTeamCategoryList.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        );
        const smallChartData = processChartData(
          statisticTeamCategoryList.smallCategories,
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
      setIsLoading(false);
    }
  }, [statisticTeamCategoryList]);

  return (
    <>
      <div
        style={{
          boxShadow: '0px 4px 10px 0px #0000000D',
        }}
        className="p-[30px] bg-[#F8FAFC] rounded-[14px]">
        {/* Header & sort */}
        <div className="flex justify-between">
          <div className="flex items-center gap-x-0">
            <div className="flex items-center gap-[10px] ">
              <ImageRound
                className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
                name="statistic-active icon"
                src={`/icons/statistic-active.svg`}
              />
              <span className="text-black w-[156px] flex-shrink-0 font-semibold text-[18px] relative top-[2px]">
                カテゴリーの割合
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 h-6 relative">
                {/* Filter option modal */}
                <Popover className="relative">
                  {() => (
                    <>
                      <div className="flex items-center gap-2 relative top-[5px]">
                        <PopoverButton
                          onClick={() =>
                            setIsOpenModalFilter(!isOpenModalFilter)
                          }
                          className="flex items-center gap-2 text-xs font-medium text-[#77858F] focus-visible:outline-none">
                          <ImageRound
                            src="/icons/filter.svg"
                            name="Filter icon"
                            className="w-[14px] h-[14px]"
                          />
                        </PopoverButton>
                      </div>
                      <Transition
                        as={Fragment}
                        show={isOpenModalFilter}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1">
                        <PopoverPanel className="absolute left-[30px] top-[-5px] z-[1] w-[400px] transform">
                          <ActionFilterStatisticTeam
                            tagsOptions={tagsOptions}
                            handleClose={() => setIsOpenModalFilter(false)}
                            listMemberTeam={listMemberTeam}
                          />
                        </PopoverPanel>
                      </Transition>
                    </>
                  )}
                </Popover>
              </div>
              <div className=" flex-grow flex-shrink-0">
                <div className="flex gap-2 flex-wrap  flex-shrink-0 ">
                  <>
                    {firstThreeUser.map((item, index) => {
                      return (
                        <div
                          key={item.value}
                          className="flex gap-[6px] items-center">
                          {index === 0 && (
                            <ImageRound
                              src={`/icons/user-white.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          )}
                          <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                            <span className="min-w-[32px] max-w-[118px]  truncate">
                              {item.label}
                            </span>
                            <ImageRound
                              onClick={() => {
                                removeUser(item);
                              }}
                              src={`/icons/close-white.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                    {allLabelUser.length > 3 && (
                      <p className=" h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                        +{remainingCountUser}
                      </p>
                    )}
                  </>
                  <>
                    {firstThreeTag.map((item, index) => {
                      return (
                        <div
                          key={item.value}
                          className="flex gap-[6px] items-center">
                          {index === 0 && (
                            <ImageRound
                              src={`/icons/tag-white.svg`}
                              name="close"
                              className="w-fit h-fit cursor-pointer"
                            />
                          )}
                          <div className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                            <span className="min-w-[32px] max-w-[118px]  truncate">
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
                        </div>
                      );
                    })}
                    {allLabelTag.length > 3 && (
                      <p className="pr-[10px] h-6 flex items-center justify-center rounded-[20px] bg-[#EBF1F7] text-black text-xs font-medium">
                        +{remainingCountTag}
                      </p>
                    )}
                  </>
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
                    </div>
                    <div className="min-h-[280px] flex justify-center">
                      {isLoadingOrganization ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : dataChartLarge.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          mergedItems={dataChartLarge.mergedItems}
                          colors={dataChartLarge.colors}
                          data={dataChartLarge?.data}
                          labels={dataChartLarge?.labels}
                          actualValues={dataChartLarge?.actualValue}
                          className="w-[280px] h-[280px]"
                          optionsData={dataChartLarge.optionData}
                          listIdData={dataChartLarge.listId}
                          handleClickTooltip={() => {}}
                          handleClickChart={(data: OptionDropdownType) => {
                            selectedOrganization &&
                              handleSelectOrganizationCustom(
                                selectedOrganization,
                              );
                            handleSelectLarge(data);
                          }}
                        />
                      ) : (
                        <div className="w-[280px] h-[280px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-[18px]">
                  <ImageRound
                    className={`w-fit h-fit `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 2 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    中カテゴリー
                  </div>
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
                    <div className="flex justify-center">
                      {isLoadingLarge ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : dataChartMedium.data.length > 0 ? (
                        <PieChart
                          isClickTooltip
                          isTeam
                          mergedItems={dataChartMedium.mergedItems}
                          colors={dataChartMedium.colors}
                          data={dataChartMedium?.data}
                          labels={dataChartMedium?.labels}
                          actualValues={dataChartMedium?.actualValue}
                          optionsData={dataChartMedium.optionData}
                          className="w-[280px] h-[280px] "
                          listIdData={dataChartMedium.listId}
                          handleClickChart={(data: OptionDropdownType) => {
                            handleSelectMedium(data);
                          }}
                        />
                      ) : (
                        <div className="w-[280px] h-[280px] rounded-full bg-[#EBF1F7]"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-[18px]">
                  <ImageRound
                    className={`w-fit h-fit `}
                    src="/icons/drawer-blue.svg"
                    name="icon chevron right"
                  />
                </div>
                {/* Pie Chart 3 */}
                <div className="w-[300px]">
                  <div className="w-full h-[34px] bg-[#EBF1F7] text-[#0068B6] rounded-md flex items-center justify-center">
                    小カテゴリー
                  </div>
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
                    <div className="flex justify-center">
                      {isLoadingMedium ? (
                        <SkeletonElement className="!w-[280px] !h-[280px] !rounded-full" />
                      ) : dataChartSmall.data.length > 0 ? (
                        <PieChart
                          isTeam
                          isLast
                          mergedItems={dataChartSmall.mergedItems}
                          colors={dataChartSmall.colors}
                          data={dataChartSmall?.data}
                          labels={dataChartSmall?.labels}
                          actualValues={dataChartSmall?.actualValue}
                          className="w-[280px] h-[280px] "
                          optionsData={dataChartSmall.optionData}
                          listIdData={dataChartSmall.listId}
                          isClickTooltip
                        />
                      ) : (
                        <div className="w-[280px] h-[280px]  rounded-full bg-[#EBF1F7]"></div>
                      )}
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

export default PercentageCategoryTeam;
