'use client';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import Image from 'next/image';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { Table, TableBody } from '@components/common/Table';
import RadioButton from '@components/common/RadioButton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import ActionFilterStatisticTeam from '@components/modals/ActionFilterTeamStatistic';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { SortingType, StatisticViewOptions } from '@constants/enums';
import { STATISTIC_CHART_VIEW_OPTIONS } from '@constants';
import useStatisticUserTaskDurations from '@hooks/useStatisticUserTaskDurations';

import { OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { getLineChartEnableViews } from '@utils';
import {
  convertDurationToTotalMinutes,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
} from '@utils/date';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';

type Props = {
  startDate: Date;
  endDate: Date | null;
  removeTag: (selected: OptionDropdownType) => void;
  removeUser: (selected: OptionDropdownType) => void;

  statisticTeamCategoryList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};
interface TableRowDetail {
  categoryId: number;
  categoryName: string;
  categoryDuration: string;
  categoryPercent: number;
  userList: {
    userId: number;
    userName: string;
    userAvatar?: string | null;
    userAvatarColor: string;
    userDuration: string;
    userPercent: number;
  }[];
}

const buildTableDetail = (
  categories: {
    categoryId: number;
    categoryName: string;
    percent: number;
    duration: string;
    users?: {
      user: {
        id: number;
        fullName: string;
        avatar?: string | null;
        avatarColor: string;
      };
      duration: string;
      percent: number;
    }[];
  }[] = [],
) =>
  categories.map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    categoryPercent: category.percent,
    categoryDuration: category.duration,
    userList:
      category.users && category.users.length > 0
        ? category.users.map((user) => {
            return {
              userId: user.user.id,
              userName: user.user.fullName,
              userAvatar: user.user.avatar,
              userAvatarColor: user.user.avatarColor,
              userDuration: user.duration,
              userPercent: user.percent,
            };
          })
        : [],
  }));

const StackedAreaTeamChart = ({
  statisticTeamCategoryList,
  startDate,
  endDate,
  removeTag,
  removeUser,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  // Context
  const {
    totalDurationTask,
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedSmall,
    tagsOptions,
    firstThreeUser,
    allLabelUser,
    remainingCountUser,
    firstThreeTag,
    allLabelTag,
    remainingCountTag,
    listMemberTeam,
    orderingOptions,
    lineChartViewBy,
    setLineChartViewBy,
  } = useContext(StatisticTeamStateContext);

  const selectedMemberList =
    orderingOptions?.user_ids && orderingOptions.user_ids.length > 0
      ? orderingOptions.user_ids.map((user) => user.value).join(',')
      : listMemberTeam.map((user) => user.id).join(',');

  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);

  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

  // Table data
  const [tableData, setTableData] = useState<TableRowDetail[]>([]);
  // Collapse statuses
  const [categoryCollapseStatuses, setCategoryCollapseStatuses] = useState<
    {
      categoryId: number;
      status: boolean;
    }[]
  >([]);

  // Filter options
  const [filter, setFilter] = useState({
    fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
    endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
    userIds: selectedMemberList,

    largeCategoryId: selectedLarge?.value,
    mediumCategoryId: selectedMedium?.value,
    smallCategoryId: selectedSmall?.value,
    statisticBy: `${lineChartViewBy?.value}`,
    selectedOrganization: `${selectedOrganization?.value}`,
    tagIds: orderingOptions?.tag_ids || [],
  });

  const handleCategorySelection = (
    categoryList: StatisticCategoryInfo[] | undefined,
  ) => {
    if (categoryList?.length) {
      const [firstCategory] = categoryList;
      setSelectedCategory({
        id: firstCategory.categoryId,
        name: firstCategory.categoryName,
      });
    } else {
      setSelectedCategory(null);
    }
  };

  // Get user task durations
  const {
    statisticUserTaskDurationsList,
    isLoadingStatisticUserTaskDurationsList,
  } = useStatisticUserTaskDurations({
    filter,
  });

  const [dataChart, setDataChart] = useState<
    {
      name: string;
      data: number[];
    }[]
  >([]);

  const getDisableViews = () => {
    const allViews = [
      StatisticViewOptions.DAY,
      StatisticViewOptions.WEEK,
      StatisticViewOptions.MONTH,
    ];

    const enabledViews = getLineChartEnableViews(startDate, endDate as Date);

    return allViews.filter((view) => !enabledViews.includes(view));
  };

  const [timeRange, setTimeRange] = useState<string[]>([]);

  const [colorList, setColorList] = useState<string[]>([]);

  // Get table info (statistic team categories)
  useEffect(() => {
    if (statisticTeamCategoryList) {
      let tableDetail: TableRowDetail[] = [];
      if (selectedOrganization && !selectedLarge && !selectedMedium) {
        tableDetail = buildTableDetail(
          statisticTeamCategoryList.largeCategories,
        );
        handleCategorySelection(statisticTeamCategoryList.largeCategories);
      } else if (selectedOrganization && selectedLarge && !selectedMedium) {
        tableDetail = buildTableDetail(
          statisticTeamCategoryList.mediumCategories,
        );
        handleCategorySelection(statisticTeamCategoryList.mediumCategories);
      } else if (selectedOrganization && selectedLarge && selectedMedium) {
        tableDetail = buildTableDetail(
          statisticTeamCategoryList.smallCategories,
        );
        handleCategorySelection(statisticTeamCategoryList.smallCategories);
      }

      setCategoryCollapseStatuses(
        tableDetail.map((category) => {
          return {
            categoryId: category.categoryId,
            status: false,
          };
        }),
      );

      setTableData(tableDetail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statisticTeamCategoryList,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
  ]);
  useEffect(() => {
    setFilter({
      fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
      endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
      userIds: selectedMemberList,
      largeCategoryId: selectedLarge?.value,
      mediumCategoryId: selectedMedium?.value,
      smallCategoryId: selectedSmall?.value,
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: `${selectedOrganization?.value}`,
      tagIds: orderingOptions?.tag_ids || [],
    });
  }, [
    startDate,
    endDate,
    orderingOptions,
    lineChartViewBy?.value,
    selectedOrganization?.value,
    selectedLarge?.value,
    selectedMedium?.value,
    selectedSmall?.value,
    selectedMemberList,
  ]);

  useEffect(() => {
    if (
      statisticUserTaskDurationsList &&
      statisticUserTaskDurationsList.length > 0
    ) {
      const durations = statisticUserTaskDurationsList[0].durations;

      const startDates = durations.map((d) => d.startDate);
      const lastEndDate = durations[durations.length - 1].endDate;

      const rawTimeRange = [...startDates, lastEndDate];

      const formattedTimeRange = rawTimeRange.map((date, index, arr) => {
        const isEdge = index === 0 || index === arr.length - 1;
        return convertToStatisticJapaneseLabels(
          date,
          lineChartViewBy?.value as string,
          isEdge,
        );
      });

      setTimeRange(formattedTimeRange);

      const chartData = statisticUserTaskDurationsList.map((userData) => {
        const percents = userData.durations.map((d) => d.percentPerRange);
        const duplicated = [percents[0], ...percents];
        return {
          name: userData.user.fullName,
          data: duplicated,
        };
      });
      const colors = statisticUserTaskDurationsList.map(
        (userData) => userData.user.avatarColor || '#000',
      );

      setDataChart(chartData);
      setColorList(colors);
    } else {
      setTimeRange([]);
      setDataChart([]);
      setTableData([]);
      return;
    }
  }, [statisticUserTaskDurationsList, lineChartViewBy]);

  const annotations = dataChart.map((s, seriesIndex) => {
    // Sum of heights of all previous series at index 0
    const previousTotal = dataChart
      .slice(0, seriesIndex)
      .reduce((sum, prevSeries) => sum + prevSeries.data[0], 0);
    // Half of the current series height at index 0
    const currentHalf = s.data[0] / 2;
    // Midpoint for the first point (index 0)
    const averageMidpoint = previousTotal + currentHalf;
    return {
      y: averageMidpoint,
      label: {
        text: s.name,
        position: 'left',
        offsetX: 70,
        style: {
          color: 'white',
          background: 'transparent',
          fontWeight: 600,
          borderColor: 'transparent', // Remove border
          padding: 0,
        },
      },
      strokeDashArray: 0, // removes the dotted line
      borderColor: 'transparent',
    };
  });

  const MAX_LABEL_LENGTH =
    timeRange?.length > 16 ? 5 : timeRange?.length > 12 ? 6 : 1000;

  const options = {
    chart: {
      type: 'area',
      stacked: true,
      zoom: {
        enabled: false, // ❌ OFF zoom
      },
      toolbar: {
        show: false, // ❌ Turn off the zoom tool bar
      },
    },
    grid: {
      padding: {
        left: 45, // 👉 increase value if label is hidden
        right: 10,
      },
    },
    legend: {
      show: true,
      showForSingleSeries: true,
      position: 'bottom',
      horizontalAlign: 'right',
      markers: {
        shape: 'square',
      },
      labels: {
        colors: '#77858F',
      },
    },
    dataLabels: {
      enabled: false,
      style: {
        colors: ['#333'],
        fontWeight: 'bold',
      },
      background: {
        enabled: false,
      },
      offsetX: 30,
      formatter: function ({
        seriesIndex,
        dataPointIndex,
      }: {
        seriesIndex: any;
        dataPointIndex: any;
      }) {
        const productNames = dataChart.map((name) => name.name);
        if (dataPointIndex === 0) {
          return productNames[seriesIndex];
        }
        return '';
      },
      offsetY: 10,
    },
    colors: colorList,
    fill: {
      type: 'solid',
      opacity: 1,
    },
    stroke: {
      curve: 'straight',
    },
    markers: {
      size: 0,
      hover: {
        size: 0,
      },
    },
    annotations: {
      yaxis: annotations,
    },
    yaxis: {
      opposite: true,
      lines: {
        show: true,
      },
      tickAmount: 4,
      labels: {
        formatter: (val: any) => `${val}%`,
      },
      max: 100,
      min: 0,
    },
    xaxis: {
      categories: timeRange,
      lines: {
        show: true,
      },
      tooltip: {
        enabled: false,
      },
      labels: {
        align: 'center',
        style: {
          fontSize: '14px',
          colors: '#939FA7',
        },
        formatter: (val: number) => {
          const label = String(val);
          return label.length > MAX_LABEL_LENGTH
            ? label.slice(0, MAX_LABEL_LENGTH) + '…'
            : label;
        },
      },
    },

    tooltip: {
      enabled: true,
      intersect: false,
      shared: true,
      custom: function () {
        return `
         
        `;
      },
    },
  };

  // Sort by percent difference
  const sortByPercentDifference = (
    data: TableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.categoryPercent || 0);
      const rowBPercentage = Number(rowB.categoryPercent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setTableData(sortedArr);
  };

  // Sort by duration difference
  const sortByDurationDifference = (
    data: TableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowADuration = convertDurationToTotalMinutes(
        rowA.categoryDuration || '00:00:00',
      );
      const rowBDuration = convertDurationToTotalMinutes(
        rowB.categoryDuration || '00:00:00',
      );

      return sortingType == SortingType.ASC
        ? rowADuration - rowBDuration
        : rowBDuration - rowADuration;
    });
    setTableData(sortedArr);
  };

  // Columns definition
  const columns: ColumnDef<TableRowDetail>[] = [
    {
      accessorKey: 'categoryName',
      header: () => {
        return (
          <p className="text-[#77858F] font-medium text-xs text-left px-[40px]">
            カテゴリー名
          </p>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        const collapseStatus =
          categoryCollapseStatuses.find(
            (categoryCollapseStatus) =>
              categoryCollapseStatus.categoryId == info.row.original.categoryId,
          )?.status || false;
        return (
          <div className="flex items-start px-[18px]">
            <RadioButton
              name="categoryNameArea"
              isChecked={info.row.original.categoryId == selectedCategory?.id}
              onChange={(e: any) => {
                if (e) {
                  setSelectedCategory({
                    id: info.row.original.categoryId,
                    name: info.row.original.categoryName,
                  });
                  if (
                    selectedOrganization &&
                    !selectedLarge &&
                    !selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        largeCategoryId: info.row.original.categoryId,
                      };
                    });
                  } else if (
                    selectedOrganization &&
                    selectedLarge &&
                    !selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        mediumCategoryId: info.row.original.categoryId,
                      };
                    });
                  } else if (
                    selectedOrganization &&
                    selectedLarge &&
                    selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        smallCategoryId: info.row.original.categoryId,
                      };
                    });
                  }
                }
              }}
            />
            <div className="w-full">
              <div
                className={`flex justify-between items-center w-full ${
                  collapseStatus &&
                  info.row.original?.userList?.filter((user) =>
                    selectedMemberList.includes(String(user.userId)),
                  ).length > 0 &&
                  'mb-3'
                }`}>
                <p className="break-all text-[16px] font-medium max-w-[calc(100%_-_40px)] line-clamp-1 text-left text-black">
                  {value}
                </p>{' '}
                <div className="w-[20px]">
                  <ImageRound
                    src="/icons/extend-column.svg"
                    name="Extend column"
                    className={`!w-3 !h-3 ml-auto hover:cursor-pointer ${collapseStatus ? '-rotate-90' : 'rotate-90'}`}
                    style={{
                      width: `8px`,
                      height: `12px`,
                    }}
                    onClick={() => {
                      setCategoryCollapseStatuses((prev) => {
                        return prev.map((item) =>
                          item.categoryId == info.row.original.categoryId
                            ? { ...item, status: !item.status }
                            : item,
                        );
                      });
                    }}
                  />
                </div>
              </div>
              {collapseStatus &&
                info.row.original?.userList &&
                info.row.original?.userList.length > 0 && (
                  <div className="flex flex-col">
                    {info.row.original?.userList
                      ?.filter((user) =>
                        listMemberTeam
                          .map((item) => item.id)
                          .includes(user.userId),
                      )
                      .map((user) => {
                        return (
                          <div
                            key={user.userId}
                            className="flex items-center gap-2 border-t-[1px] border-[#D2DBE1] py-2">
                            <CustomUserAvatar
                              avatarUrl={user?.userAvatar || ''}
                              avatarColor={user?.userAvatarColor || ''}
                              size={24}
                            />
                            <p className="text-sm font-medium max-w-full break-all line-clamp-1 text-left text-black">
                              {user.userName}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'categoryDuration',
      size: 40,
      header: () => {
        return (
          <div
            className="flex gap-1 items-center justify-center"
            onClick={() => {
              if (
                !durationSortingStatus ||
                durationSortingStatus == SortingType.DESC
              ) {
                setDurationSortingStatus(SortingType.ASC);
                sortByDurationDifference(tableData, SortingType.ASC);
              } else {
                setDurationSortingStatus(SortingType.DESC);
                sortByDurationDifference(tableData, SortingType.DESC);
              }
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">計測時間</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end ${durationSortingStatus == SortingType.ASC && 'rotate-180'} `}
              />
            </div>
          </div>
        );
      },
      enableSorting: false,
      cell: (info) => {
        const value = info.getValue() as string;
        const collapseStatus =
          categoryCollapseStatuses.find(
            (categoryCollapseStatus) =>
              categoryCollapseStatus.categoryId == info.row.original.categoryId,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <div
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMemberList.includes(String(user.userId)),
                ).length > 0 &&
                'mb-3'
              }`}>
              <p>{value.split(':')[0] || 0}時間</p>
              <p>{value.split(':')[1] || 0}分</p>
            </div>
            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col">
                  {info.row.original?.userList
                    ?.filter((user) =>
                      listMemberTeam
                        .map((item) => item.id)
                        .includes(user.userId),
                    )
                    .map((user) => {
                      return (
                        <div
                          key={user.userId}
                          className="flex justify-center border-t-[1px] border-[#D2DBE1] py-2">
                          <p>{user.userDuration.split(':')[0] || 0}時間</p>
                          <p>{user.userDuration.split(':')[1] || 0}分</p>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        );
      },
    },
    {
      accessorKey: 'categoryPercent',
      size: 20,
      header: () => {
        return (
          <div
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={() => {
              if (
                !percentageSortingStatus ||
                percentageSortingStatus == SortingType.DESC
              ) {
                setPercentageSortingStatus(SortingType.ASC);
                sortByPercentDifference(tableData, SortingType.ASC);
              } else {
                setPercentageSortingStatus(SortingType.DESC);
                sortByPercentDifference(tableData, SortingType.DESC);
              }
            }}>
            <p className="!text-xs font-medium !text-[#77858F]">割合</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end ${
                  percentageSortingStatus == SortingType.ASC ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        );
      },
      enableSorting: false,
      cell: (info) => {
        const value = Number(info.getValue()) || 0;
        const collapseStatus =
          categoryCollapseStatuses.find(
            (categoryCollapseStatus) =>
              categoryCollapseStatus.categoryId == info.row.original.categoryId,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <p
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMemberList.includes(String(user.userId)),
                ).length > 0 &&
                'mb-3'
              }`}>
              {Math.round(value)}%
            </p>
            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col">
                  {info.row.original?.userList
                    ?.filter((user) =>
                      listMemberTeam
                        .map((item) => item.id)
                        .includes(user.userId),
                    )
                    .map((user) => {
                      return (
                        <div
                          key={user.userId}
                          className="flex justify-center border-t-[1px] border-[#D2DBE1] py-2">
                          <p>{user.userPercent || 0}%</p>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        );
      },
    },
    {
      id: 'empty-column',
      header: '',
      cell: () => <div></div>,
    },
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getDataByIndex = (index: number) => {
    return statisticUserTaskDurationsList?.map((userData) => {
      const duration = userData.durations[index];
      return {
        user: {
          fullName: userData.user.fullName,
          avatarColor: userData.user.avatarColor,
        },
        startDate: duration?.startDate || null,
        endDate: duration?.endDate || null,
        percentPerRange: duration?.percentPerRange || 0,
      };
    });
  };

  return (
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
              className={`w-7 h-4  hover:cursor-pointer relative top-[2px]`}
              name="statistic line chart icon"
              src={`/icons/statistic-line-chart.svg`}
            />
            <span className="text-black w-[210px] flex-shrink-0  font-semibold text-[18px] relative top-[2px]">
              期間における時間の推移
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
                        onClick={() => setIsOpenModalFilter(!isOpenModalFilter)}
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
        <div>
          {/* Line */}
          <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
          <div>
            <div className="flex  justify-between px-[30px] text-sm font-medium">
              {/* Column Chart 1 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && !selectedLarge && !selectedMedium ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  大カテゴリー
                </div>
                <div className="mt-4 w-full">
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
                </div>
              </div>
              {/* Column Chart 2 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && selectedLarge && !selectedMedium ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  中カテゴリー
                </div>
                <div className="mt-4 w-full">
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
                </div>
              </div>
              {/* Column Chart 3 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && selectedLarge && selectedMedium ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  小カテゴリー
                </div>
                <div className="mt-4 w-full">
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
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 px-[30px]">
            <div className="flex justify-between w-full mb-4">
              <div className="flex gap-2 items-end font-medium">
                <p>合計時間</p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {totalDurationTask?.split(':')[0]}
                  </p>
                  <p className="text-[25px] leading-none">時間</p>
                </div>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {totalDurationTask?.split(':')[1]}
                  </p>
                  <p className="text-[25px] leading-none">分</p>
                </div>
              </div>
              <div>
                <Dropdown
                  options={STATISTIC_CHART_VIEW_OPTIONS}
                  selectedOption={STATISTIC_CHART_VIEW_OPTIONS.find(
                    (element) => element.value === lineChartViewBy?.value,
                  )}
                  className="h-[34px] !w-[54px] !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                  classNameTextData="!text-xs"
                  classActive="!text-sm"
                  classNameOption="!text-sm !w-[54px] !border-[#77858F] !ring-[#77858F] !ring-opacity-100"
                  labelOptionClass="!text-sm font-medium"
                  onChange={(e) => {
                    setLineChartViewBy({
                      label: e.label,
                      value: e.value,
                    });
                  }}
                  disableItems={getDisableViews()}
                />
              </div>
            </div>
          </div>
          {isLoadingStatisticUserTaskDurationsList ? (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[380px] w-full mx-auto`}
            />
          ) : (
            <div className="relative">
              <Chart
                options={options as any}
                series={dataChart}
                type="area"
                height={380}
              />
              <div className="w-full pl-[45px] pr-[51px] h-[320px] flex absolute top-0 left-0 bg-transparent">
                {timeRange.slice(1).map((item, idx) => {
                  const actualIndex = idx + 1;
                  const isHovered = hoveredIndex === actualIndex;

                  const dataDetail = getDataByIndex(idx);

                  return (
                    <div
                      key={actualIndex}
                      onMouseEnter={() => setHoveredIndex(actualIndex)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        backgroundColor:
                          hoveredIndex === null
                            ? 'transparent'
                            : isHovered
                              ? 'transparent'
                              : '#F8FAFCA6',
                        transition: 'background-color 0.2s',
                      }}
                      className="group relative">
                      {
                        <div
                          style={{
                            boxShadow: '0px 2px 8px 0px #0000001A',
                          }}
                          className={`bg-white absolute p-5 top-1/2 left-0 hidden group-hover:!block  rounded-md w-[250px] ${isHovered && 'z-[50]'}`}>
                          <p className="text-sm font-normal text-[#77858F] mb-1 text-start w-full block">
                            {dataDetail &&
                              dataDetail.length > 0 &&
                              convertToStatisticJapaneseLabels(
                                dataDetail[0]?.startDate as string,
                                lineChartViewBy?.value as string,
                                true,
                              )}{' '}
                            ~
                            {dataDetail &&
                              dataDetail.length > 0 &&
                              convertToStatisticJapaneseLabels(
                                dataDetail[0]?.endDate as string,
                                lineChartViewBy?.value as string,
                                true,
                              )}
                          </p>
                          {dataDetail &&
                            dataDetail.length > 0 &&
                            dataDetail?.map((user, userIndex) => {
                              return (
                                <div
                                  key={userIndex}
                                  className="flex items-center gap-1.5">
                                  <div
                                    className="w-3 h-3 rounded-sm"
                                    style={{
                                      backgroundColor: user.user.avatarColor,
                                    }}
                                  />
                                  <div className="flex flex-grow items-center justify-between text-base font-medium">
                                    <div className=" text-black w-fit  max-w-[180px] line-clamp-3 break-words">
                                      {user.user.fullName}
                                    </div>
                                    <div>{user.percentPerRange}%</div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <Table className="border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-md">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={`py-2.5 cursor-pointer ${index !== 0 ? 'border-l' : ''}`}
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                        maxWidth: header.getSize(),
                      }}
                      onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell, index) => (
                    <td
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        maxWidth: cell.column.getSize(),
                      }}
                      className={`py-3 !pl-0 ${index !== 0 ? 'border-l' : ''}`}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
export default StackedAreaTeamChart;
