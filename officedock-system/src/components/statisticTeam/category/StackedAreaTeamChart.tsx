'use client';
import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  CategoryTableRowDetail,
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { getLineChartEnableViews, getStatisticMilestones } from '@utils';
import {
  convertDurationToTotalMinutes,
  convertToJapaneseDateRange,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
  formatTimeToJapanese,
  sumDurationsChart,
} from '@utils/date';
import { StatisticTeamStateContext } from '@providers/StatisticTeamProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useGenericDebounce } from '@hooks/useGenericDebounce';

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

const buildTableDetail = (
  categories: {
    categoryId: number;
    categoryName: string;
    organizationId?: number;

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
    organizationId: category.organizationId ?? 0,
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
    areaTableData,
    setAreaTableData,
    setLineChartViewBy,
  } = useContext(StatisticTeamStateContext);
  const { selectedOrganization: selectedOrganizationSideBar } =
    useContext(GlobalStateContext);

  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [isTableDataRendered, setIsTableDataRendered] =
    useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [isExtendData, setIsExtendData] = useState(true);
  const [isOpenModalFilter, setIsOpenModalFilter] = useState(false);
  const [isOrganizationChanging, setIsOrganizationChanging] = useState(false);

  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

  // Collapse statuses
  const [categoryCollapseStatuses, setCategoryCollapseStatuses] = useState<
    {
      categoryName: string;
      status: boolean;
    }[]
  >([]);
  const [selectedOrganizationInTable, setSelectedOrganizationInTable] =
    useState<number>(0);

  // Get initial member options
  useEffect(() => {
    if (orderingOptions?.user_ids && orderingOptions?.user_ids.length > 0) {
      setSelectedMembers(
        orderingOptions?.user_ids.map((user) => Number(user.value)),
      );
    } else {
      setSelectedMembers(listMemberTeam.map((user) => Number(user.id)));
    }
  }, [orderingOptions?.user_ids, listMemberTeam]);

  // Filter options
  const [filter, setFilter] = useState({
    fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
    endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
    userIds: selectedMembers.join(','),
    largeCategoryId:
      selectedOrganization && !selectedLarge && !selectedMedium
        ? selectedCategory?.id
        : selectedLarge?.value,
    mediumCategoryId:
      selectedOrganization && selectedLarge && !selectedMedium
        ? selectedCategory?.id
        : selectedMedium?.value,
    smallCategoryId:
      selectedOrganization && selectedLarge && selectedMedium
        ? selectedCategory?.id
        : selectedSmall?.value,
    statisticBy: `${lineChartViewBy?.value}`,
    selectedOrganization: 0,
    tagIds: orderingOptions?.tag_ids || [],
    organizationMemberId: String(selectedOrganizationSideBar?.value || ''),
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
      setSelectedOrganizationInTable(Number(firstCategory.organizationId));
      if (selectedOrganization && !selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            largeCategoryId: firstCategory.categoryId,
            selectedOrganization: Number(firstCategory.organizationId),
          };
        });
      } else if (selectedOrganization && selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            mediumCategoryId: firstCategory.categoryId,
            selectedOrganization: Number(firstCategory.organizationId),
          };
        });
      } else if (selectedOrganization && selectedLarge && selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            smallCategoryId: firstCategory.categoryId,
            selectedOrganization: Number(firstCategory.organizationId),
          };
        });
      }
    } else {
      setSelectedCategory(null);
      setSelectedOrganizationInTable(0);
      if (selectedOrganization && !selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            largeCategoryId: undefined,
            selectedOrganization: 0,
          };
        });
      } else if (selectedOrganization && selectedLarge && !selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            mediumCategoryId: undefined,
            selectedOrganization: 0,
          };
        });
      } else if (selectedOrganization && selectedLarge && selectedMedium) {
        setFilter((prev) => {
          return {
            ...prev,
            smallCategoryId: undefined,
            selectedOrganization: 0,
          };
        });
      }
    }
  };

  // Get user task durations
  const {
    statisticUserTaskDurationsList,
    isLoadingStatisticUserTaskDurationsList,
  } = useStatisticUserTaskDurations({
    filter,
    condition: [
      Boolean(
        areaTableData.length > 0 &&
          isTableDataRendered &&
          (filter.largeCategoryId || filter.mediumCategoryId),
      ),
    ],
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
      let tableDetail: CategoryTableRowDetail[] = [];
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
            categoryName: category.categoryName,
            status: false,
          };
        }),
      );
      setTimeout(() => {
        setIsTableDataRendered(true);
      }, 2000);
      setAreaTableData(tableDetail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statisticTeamCategoryList,
    isTableDataRendered,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
  ]);

  // Handle listen to filter option changes
  const memoizedFilter = useMemo(() => {
    return {
      fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
      endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
      userIds: selectedMembers?.filter(Boolean).join(',') || '',
      largeCategoryId:
        selectedOrganizationInTable && !selectedLarge && !selectedMedium
          ? selectedCategory?.id
          : selectedLarge?.value,
      mediumCategoryId:
        selectedOrganizationInTable && selectedLarge && !selectedMedium
          ? selectedCategory?.id
          : selectedMedium?.value,
      smallCategoryId:
        selectedOrganizationInTable && selectedLarge && selectedMedium
          ? selectedCategory?.id
          : selectedSmall?.value,
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: selectedOrganizationInTable,
      tagIds: orderingOptions?.tag_ids || [],
      organizationMemberId: String(selectedOrganizationSideBar?.value || ''),
    };
  }, [
    startDate,
    endDate,
    selectedMembers,
    orderingOptions?.tag_ids,
    selectedOrganizationInTable,
    selectedLarge,
    selectedMedium,
    selectedCategory?.id,
    selectedSmall?.value,
    lineChartViewBy?.value,
    selectedOrganizationSideBar?.value,
  ]);

  const debouncedFilter = useGenericDebounce(memoizedFilter, 1000);

  useEffect(() => {
    if (isOrganizationChanging && selectedMembers.length > 0) {
      setIsOrganizationChanging(false); // Done
    }
  }, [selectedMembers, isOrganizationChanging]);
  useEffect(() => {
    if (!isOrganizationChanging) {
      setFilter(debouncedFilter); // Trigger API only when everything is ready
    }
  }, [debouncedFilter, isOrganizationChanging]);

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
          name: userData?.user?.fullName || '',
          data: duplicated,
        };
      });
      const colors = statisticUserTaskDurationsList.map(
        (userData) => userData?.user?.avatarColor || '#000',
      );

      setDataChart(chartData);
      setColorList(colors);
    } else {
      const timeMilestones = getStatisticMilestones(
        `${formatDateToYMD(startDate)}`,
        `${formatDateToYMD(endDate || '')}`,
        lineChartViewBy?.value as StatisticViewOptions,
      );

      const uniqueSortedDates = Array.from(new Set(timeMilestones)).sort(
        (pre, next) => new Date(pre).getTime() - new Date(next).getTime(),
      );

      const transformedDates = uniqueSortedDates.map((date, index, arr) => {
        const isEdge = index === 0 || index === arr.length - 1;
        return convertToStatisticJapaneseLabels(
          date,
          lineChartViewBy?.value as string,
          isEdge,
        );
      });

      setTimeRange(transformedDates);
      setDataChart([
        {
          name: '',
          data: Array(timeMilestones.length).fill(0),
        },
      ]);
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
        text: '',
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

  const isLargerTime = timeRange?.length > 12;

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
        left: isLargerTime ? 90 : 45, // 👉 increase value if label is hidden
        right: 10,
      },
    },
    legend: {
      show: !(dataChart.length == 1 && !dataChart[0].name), // Not show legend with fake data
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

      offsetY: 10,
    },
    colors: colorList,
    fill: {
      type: 'solid',
      opacity: 1,
    },
    stroke: {
      curve: 'straight',
      show: false,
    },
    markers: {
      show: false,
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
      },
    },

    tooltip: {
      enabled: true,
      intersect: false,
      shared: true,
    },
  };

  // Sort by percent difference
  const sortByPercentDifference = (
    data: CategoryTableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.categoryPercent || 0);
      const rowBPercentage = Number(rowB.categoryPercent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setAreaTableData(sortedArr);
  };

  // Sort by duration difference
  const sortByDurationDifference = (
    data: CategoryTableRowDetail[],
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
    setAreaTableData(sortedArr);
  };

  // Columns definition
  const columns: ColumnDef<CategoryTableRowDetail>[] = [
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
              categoryCollapseStatus.categoryName ==
              info.row.original.categoryName,
          )?.status || false;
        return (
          <div className="flex items-start px-[18px]">
            <RadioButton
              name="categoryNameArea"
              isChecked={
                info.row.original.categoryName == selectedCategory?.name
              }
              onChange={(e: any) => {
                if (e) {
                  setSelectedCategory({
                    id: info.row.original.categoryId,
                    name: info.row.original.categoryName,
                  });
                  setSelectedOrganizationInTable(
                    info.row.original.organizationId,
                  );
                  if (
                    selectedOrganization &&
                    !selectedLarge &&
                    !selectedMedium
                  ) {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        largeCategoryId: info.row.original.categoryId,
                        selectedOrganization: info.row.original.organizationId,
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
                        selectedOrganization: info.row.original.organizationId,
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
                        selectedOrganization: info.row.original.organizationId,
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
                    selectedMembers.join(',').includes(String(user.userId)),
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
                          item.categoryName == info.row.original.categoryName
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
      size: 50,
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
                sortByDurationDifference(areaTableData, SortingType.ASC);
              } else {
                setDurationSortingStatus(SortingType.DESC);
                sortByDurationDifference(areaTableData, SortingType.DESC);
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
              categoryCollapseStatus.categoryName ==
              info.row.original.categoryName,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <div
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMembers.join(',').includes(String(user.userId)),
                ).length > 0 &&
                'mb-3'
              }`}>
              <p className="whitespace-nowrap">
                {value.split(':')[0] || 0}時間
              </p>
              <p className="whitespace-nowrap">{value.split(':')[1] || 0}分</p>
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
      size: 30,
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
                sortByPercentDifference(areaTableData, SortingType.ASC);
              } else {
                setPercentageSortingStatus(SortingType.DESC);
                sortByPercentDifference(areaTableData, SortingType.DESC);
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
              categoryCollapseStatus.categoryName ==
              info.row.original.categoryName,
          )?.status || false;

        return (
          <div className="flex flex-col font-medium text-[14px] text-black px-[18px]">
            <p
              className={`flex justify-center ${
                collapseStatus &&
                info.row.original?.userList?.filter((user) =>
                  selectedMembers.join(',').includes(String(user.userId)),
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
    data: areaTableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getDataByIndex = (index: number) => {
    return statisticUserTaskDurationsList?.map((userData) => {
      const duration = userData.durations[index];

      return {
        user: {
          fullName: userData?.user?.fullName,
          avatarColor: userData?.user?.avatarColor,
          avatar: userData?.user?.avatar,
        },
        startDate: duration?.startDate || null,
        endDate: duration?.endDate || null,
        percentPerRange: duration?.percentPerRange || 0,
        duration: duration.duration,
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
              className={`w-5 h-5  hover:cursor-pointer relative top-[2px]`}
              name="statistic stacked area chart icon"
              src={`/icons/stacked-area.svg`}
            />
            <span className="text-black w-[210px] flex-shrink-0  font-semibold text-[18px] relative top-[4px]">
              期間における割合の推移
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 h-6 relative">
              {/* Filter option modal */}
              <Popover className="relative">
                {() => (
                  <>
                    <div className="flex items-center gap-2 relative top-2">
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
                    onChange={(data) => {
                      setSelectedMembers([]);
                      setAreaTableData([]);
                      setIsTableDataRendered(false);
                      setIsOrganizationChanging(true);
                      handleSelectOrganization(data);
                    }}
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
                    onChange={(data) => {
                      setAreaTableData([]);
                      handleSelectLarge(data);
                    }}
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
                    onChange={(data) => {
                      setAreaTableData([]);
                      handleSelectMedium(data);
                    }}
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
                    setAreaTableData([]);
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
              <div
                className={`w-full ${isLargerTime ? 'pl-[90px]' : 'pl-[45px]'} pr-[51px] h-[320px] flex absolute top-0 left-0 bg-transparent`}>
                {!(dataChart.length == 1 && !dataChart[0].name) &&
                  timeRange.slice(1).map((item, idx) => {
                    const actualIndex = idx + 1;
                    const isHovered = hoveredIndex === actualIndex;

                    const dataDetail = getDataByIndex(idx);
                    const totalDuration = dataDetail
                      ? sumDurationsChart(
                          dataDetail.map((user) => user.duration),
                        )
                      : '00:00:00';

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
                            className={`bg-white absolute py-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-md w-[250px] ${isHovered && 'z-[50]'}`}>
                            <p className="text-sm px-5 font-normal text-[#77858F] mb-1 text-center w-full block">
                              {dataDetail &&
                                dataDetail.length > 0 &&
                                convertToJapaneseDateRange(
                                  dataDetail[0]?.startDate as string,
                                  dataDetail[0]?.endDate as string,
                                )}
                            </p>
                            <p className="text-start px-5 mt-4">
                              {selectedCategory?.name}
                            </p>
                            <div className="flex text-base my-3 font-normal gap-[10px] px-5">
                              <p>
                                {totalDuration &&
                                  formatTimeToJapanese(totalDuration)}
                              </p>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto px-5">
                              {dataDetail &&
                                dataDetail.length > 0 &&
                                dataDetail?.map((user, userIndex) => {
                                  return (
                                    <div
                                      key={userIndex}
                                      className="flex items-center gap-1.5 mb-1.5">
                                      <CustomUserAvatar
                                        avatarUrl={user.user.avatar || ''}
                                        avatarColor={
                                          user.user.avatarColor || ''
                                        }
                                        size={30}
                                      />
                                      <div className="flex flex-grow items-center justify-between text-base font-medium">
                                        <div className=" text-black w-fit  max-w-[140px] line-clamp-3 break-all text-left">
                                          {user.user.fullName}
                                        </div>
                                        <div>{user.percentPerRange}%</div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        }
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          <div className="px-[30px]">
            <Table
              className={`border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-md ${areaTableData.length && 'max-h-[500px] overflow-y-auto'}`}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="sticky top-0 z-10 text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
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
                        className={`py-3 !px-0 ${index !== 0 ? 'border-l' : ''}`}>
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
        </div>
      )}
    </div>
  );
};
export default StackedAreaTeamChart;
