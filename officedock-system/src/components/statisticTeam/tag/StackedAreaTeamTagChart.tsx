'use client';
import React, { useContext, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import Image from 'next/image';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import { Table, TableBody } from '@components/common/Table';
import RadioButton from '@components/common/RadioButton';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import StatisticLineChartTableSkeleton from '@components/common/SkeletonLoading/StatisticLineChartTableSkeleton';

import {
  OptionOrganizationStatisticType,
  OrganizationStatisticType,
  SortingType,
  StatisticViewOptions,
} from '@constants/enums';
import {
  ALL_TEAM_STATISTIC,
  DEFAULT_TIME_TEXT,
  STATISTIC_CHART_VIEW_OPTIONS,
} from '@constants';
import useStatisticUserTaskDurations from '@hooks/useStatisticUserTaskDurations';
import useStatisticAllTeamTaskDurations from '@hooks/useStatisticAllTeamTaskDurations';

import { OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsAllTeamTaskDuration,
  StatisticsCategories,
  TagTableRowDetail,
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
import { StatisticTeamTagsStateContext } from '@providers/StatisticTeamProviderTag';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import FilterTagTeam from './filter/FilterTagTeam';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsListTeam: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const buildTableDetail = (
  tags: {
    tagId?: number;
    tagName?: string;
    percent: number;
    duration: string;
    organizationId?: number;
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
  tags.map((tag) => ({
    tagId: Number(tag.tagId),
    tagName: String(tag.tagName),
    tagPercent: tag.percent,
    tagDuration: tag.duration,
    organizationId: tag.organizationId ?? 0,

    userList:
      tag.users && tag.users.length > 0
        ? tag.users.map((user) => {
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
export interface TagTableRowDetailTag {
  tagId: number;
  tagName: string;
  tagDuration: string;
  tagPercent: number;
  organizationId: number;
  userList: {
    userId: number;
    userName: string;
    userAvatarColor: string;
    userAvatar: string | null;
    userDuration: string;
    userPercent: number;
  }[];
}

const buildAllTeamTableDetail = (
  organizations: StatisticsAllTeamTaskDuration['data'],
): TagTableRowDetailTag[] =>
  organizations.map((org) => {
    const userList =
      org.users?.map((user) => ({
        userId: user.id,
        userName: user.fullName,
        userAvatarColor: user.avatarColor,
        userAvatar: user.avatar ?? null,
        userDuration: user.totalDuration,
        userPercent: user.percent,
      })) ?? [];

    return {
      tagId: org.organizationId as number,
      tagName: org.organizationName,
      tagDuration: org.duration,
      tagPercent: org.percent,
      organizationId: Number(org.organizationId),
      userList,
    };
  });

const StackedAreaTeamTagChart = ({
  statisticTagsListTeam,
  startDate,
  endDate,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
}: Props) => {
  // Context
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
    listMemberTeam,
    lineChartViewBy,
    orderingOptions,
    selectedTags,
    setLineChartViewBy,
    areaTableData,
    setAreaTableData,
  } = useContext(StatisticTeamTagsStateContext);
  const { selectedOrganization: selectedOrganizationSideBar } =
    useContext(GlobalStateContext);

  const getTotalDuration = () => {
    if (selectedOrganization?.value) {
      if (selectedLarge?.value) {
        if (selectedMedium?.value) {
          if (selectedSmall?.value) {
            return totalDurationCategory;
          }
          return totalDurationSmall;
        }
        return totalDurationMedium;
      }
      return totalDurationLarge;
    }
    return DEFAULT_TIME_TEXT;
  };

  const [
    selectedOptionOrganizationInTable,
    setSelectedOptionOrganizationInTable,
  ] = useState(OptionOrganizationStatisticType.MAIN_TEAM);

  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [isTableDataRendered, setIsTableDataRendered] =
    useState<boolean>(false);

  const [isExtendData, setIsExtendData] = useState(true);

  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');
  const [selectedOrganizationInTable, setSelectedOrganizationInTable] =
    useState<string | number>(0);

  // Collapse statuses
  const [tagCollapseStatuses, setTagCollapseStatuses] = useState<
    {
      tagId: number | string;
      status: boolean;
      organizationId: string | number;
    }[]
  >([]);
  const [selectedTag, setSelectedTag] = useState<{
    id: string | number;
    name: string;
    organizationId: string | number;
  } | null>(null);

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

  // Get initial member options
  useEffect(() => {
    if (orderingOptions?.user_ids && orderingOptions?.user_ids.length > 0) {
      setSelectedMembers(
        orderingOptions?.user_ids.map((user) => Number(user.value)),
      );
    } else {
      setSelectedMembers(listMemberTeam.map((user) => Number(user.id)));
    }
  }, [orderingOptions?.user_ids, listMemberTeam, selectedOrganization]);

  const handleTagSelection = (tagList: StatisticCategoryInfo[] | undefined) => {
    if (tagList?.length) {
      const [firstTag] = tagList;
      setSelectedTag({
        id: Number(firstTag.tagId),
        name: String(firstTag.tagName),
        organizationId: Number(firstTag.organizationId),
      });
      setSelectedOrganizationInTable(Number(firstTag.organizationId));
    } else {
      setSelectedTag(null);
    }
  };

  // Get user task durations
  const {
    statisticUserTaskDurationsList,
    isFetchingStatisticUserTaskDurationsList,
  } = useStatisticUserTaskDurations({
    filter: {
      fromDate: startDate ? `${formatDateToYMD(startDate)}` : '',
      endDate: endDate ? `${formatDateToYMD(endDate)}` : '',
      userIds:
        orderingOptions?.user_ids?.length == 0
          ? (listMemberTeam ?? []).map((user) => Number(user.id)).join(',')
          : selectedMembers?.filter(Boolean).join(','),
      largeCategoryId: selectedLarge?.value,
      mediumCategoryId: selectedMedium?.value,
      smallCategoryId: selectedSmall?.value,
      statisticBy: `${lineChartViewBy?.value}`,
      selectedOrganization: selectedOrganizationInTable,
      tagIds: selectedTag
        ? [
            {
              value: selectedTag?.id,
              label: selectedTag?.name,
            },
          ]
        : [],
      organizationMemberId:
        selectedOrganization?.type === OrganizationStatisticType.CALENDAR
          ? String(selectedOrganizationSideBar?.value || '')
          : undefined,
    },
    condition: [
      selectedOrganization?.value != ALL_TEAM_STATISTIC &&
        Boolean(
          areaTableData.length > 0 &&
            isTableDataRendered &&
            selectedTag?.id &&
            selectedOrganizationInTable,
        ),
    ],
  });

  // Get task durations for ALL TEAM option]

  const {
    statisticAllTeamTaskDurationsList,
    isFetchingStatisticAllTeamTaskDurationsList,
  } = useStatisticAllTeamTaskDurations({
    isTeam: true,
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      userIds: listMemberTeam.map((user) => ({
        label: user.fullName,
        value: user.id,
      })),
      mainOrganizationId: selectedOrganizationSideBar?.value as number,
      option: selectedOptionOrganizationInTable,
      isTagPage: true,
    },
    condition: [selectedOrganization?.value == ALL_TEAM_STATISTIC],
    onSuccess: (data) => {
      const hasMyOrganization = data.data.some(
        (item) =>
          String(item.organizationId) ===
          String(selectedOrganizationSideBar?.value),
      );

      if (
        !hasMyOrganization &&
        selectedOptionOrganizationInTable ===
          OptionOrganizationStatisticType.MAIN_TEAM
      ) {
        const hasMyOtherTeam = data.data.some(
          (item) =>
            item.organizationName === OptionOrganizationStatisticType.OTHER,
        );

        if (!hasMyOtherTeam) {
          setSelectedOptionOrganizationInTable(
            OptionOrganizationStatisticType.CALENDAR,
          );
        } else {
          setSelectedOptionOrganizationInTable(
            OptionOrganizationStatisticType.OTHER,
          );
        }

        return;
      } else {
        if (
          selectedOptionOrganizationInTable !==
          OptionOrganizationStatisticType.MAIN_TEAM
        ) {
          const hasCurrentOption = data.data.some(
            (item) =>
              item.organizationName === selectedOptionOrganizationInTable,
          );

          if (!hasCurrentOption && data.data.length > 0) {
            setSelectedOptionOrganizationInTable(
              data.data[0].organizationName as OptionOrganizationStatisticType,
            );
          }
        }
      }
    },
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

  useEffect(() => {
    if (
      statisticTagsListTeam &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      let tableDetail: TagTableRowDetail[] = [];

      if (
        selectedOrganization &&
        !selectedLarge &&
        !selectedMedium &&
        !selectedSmall
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.largeCategories);
        handleTagSelection(statisticTagsListTeam.largeCategories);
      } else if (
        selectedOrganization &&
        selectedLarge &&
        !selectedMedium &&
        !selectedSmall
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.mediumCategories);
        handleTagSelection(statisticTagsListTeam.mediumCategories);
      } else if (
        selectedOrganization &&
        selectedLarge &&
        selectedMedium &&
        !selectedSmall
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.smallCategories);
        handleTagSelection(statisticTagsListTeam.smallCategories);
      } else if (
        selectedOrganization &&
        selectedLarge &&
        selectedMedium &&
        selectedSmall
      ) {
        tableDetail = buildTableDetail(statisticTagsListTeam.smallCategories);
        handleTagSelection(statisticTagsListTeam.category);
      }

      setTagCollapseStatuses(
        tableDetail.map((tag) => {
          return {
            tagId: tag.tagId,
            status: false,
            organizationId: tag.organizationId,
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
    statisticTagsListTeam,
    setIsTableDataRendered,
    selectedLarge,
    selectedOrganization,
    selectedMedium,
    selectedSmall,
  ]);

  useEffect(() => {
    if (
      statisticUserTaskDurationsList &&
      statisticUserTaskDurationsList.length > 0 &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
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
      if (selectedOrganization?.value !== ALL_TEAM_STATISTIC) {
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
    }
  }, [
    statisticUserTaskDurationsList,
    lineChartViewBy,
    selectedOrganization?.value,
    startDate,
    endDate,
  ]);

  // Data Table with option ALL TEAM
  useEffect(() => {
    if (
      statisticAllTeamTaskDurationsList?.data &&
      selectedOrganization?.value === ALL_TEAM_STATISTIC
    ) {
      const tableDetail = buildAllTeamTableDetail(
        statisticAllTeamTaskDurationsList.data,
      );
      setTagCollapseStatuses(
        tableDetail.map((category) => ({
          tagId: category.tagId,
          status: false,
          organizationId: category.organizationId || 0,
        })),
      );

      setTimeout(() => {
        setIsTableDataRendered(true);
      }, 2000);

      setAreaTableData(tableDetail);
    }
  }, [
    statisticAllTeamTaskDurationsList,
    selectedOrganization,
    setAreaTableData,
  ]);

  // Data CHART with option ALL TEAM

  useEffect(() => {
    const isAllTeamView = selectedOrganization?.value === ALL_TEAM_STATISTIC;
    const hasData =
      statisticAllTeamTaskDurationsList &&
      statisticAllTeamTaskDurationsList?.durations?.length > 0;

    if (isAllTeamView && hasData) {
      const { durations } = statisticAllTeamTaskDurationsList;

      const startDates = durations.map((d) => d.startDate);
      const lastEndDate = durations[durations.length - 1]?.endDate;
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

      // ✅ Map by `id-fullName`
      const userMap = new Map<
        string,
        { name: string; color: string; data: number[] }
      >();

      durations.forEach((range) => {
        const userKeysInRange = new Set<string>();

        range.data.forEach((org) => {
          org.users?.forEach((user) => {
            const key = `${user.id}-${user.fullName}`;
            userKeysInRange.add(key);

            if (!userMap.has(key)) {
              userMap.set(key, {
                name: user.fullName,
                color: user.avatarColor ?? '#ccc',
                data: [],
              });
            }

            userMap.get(key)?.data.push(user.percent);
          });
        });

        // ✅ If user is not in this range, add 0
        userMap.forEach((_value, key) => {
          if (!userKeysInRange.has(key)) {
            userMap.get(key)?.data.push(0);
          }
        });
      });

      const chartData = Array.from(userMap.values()).map((user) => ({
        name: user.name,
        data: [user.data[0], ...user.data], // duplicated first to match chart
      }));

      const colorList = Array.from(userMap.values()).map((user) => user.color);

      setDataChart(chartData);
      setColorList(colorList);
    } else {
      if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
        const timeMilestones = getStatisticMilestones(
          formatDateToYMD(startDate) as string,
          formatDateToYMD(endDate || '') as string,
          lineChartViewBy?.value as StatisticViewOptions,
        );

        const uniqueSortedDates = Array.from(new Set(timeMilestones)).sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime(),
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
      }
    }
  }, [
    statisticAllTeamTaskDurationsList,
    lineChartViewBy,
    selectedOrganization?.value,
    startDate,
    endDate,
    selectedOrganizationSideBar?.value,
  ]);

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
  const isLargerTime = timeRange?.length > 7;

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
      show: false,
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
      show: false,
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
    data: TagTableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.tagPercent || 0);
      const rowBPercentage = Number(rowB.tagPercent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setAreaTableData(sortedArr);
  };

  // Sort by duration difference
  const sortByDurationDifference = (
    data: TagTableRowDetail[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowADuration = convertDurationToTotalMinutes(
        rowA.tagDuration || DEFAULT_TIME_TEXT,
      );
      const rowBDuration = convertDurationToTotalMinutes(
        rowB.tagDuration || DEFAULT_TIME_TEXT,
      );

      return sortingType == SortingType.ASC
        ? rowADuration - rowBDuration
        : rowBDuration - rowADuration;
    });
    setAreaTableData(sortedArr);
  };

  // Columns definition
  const columns: ColumnDef<TagTableRowDetail>[] = [
    {
      accessorKey: 'tagName',
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
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
          )?.status || false;

        return (
          <div className="flex items-start px-[18px]">
            <RadioButton
              name="tagName"
              isChecked={
                selectedOrganization?.value != ALL_TEAM_STATISTIC
                  ? info.row.original.tagId == selectedTag?.id &&
                    info.row.original.organizationId ==
                      selectedTag?.organizationId
                  : info.row.original.tagName ===
                      selectedOptionOrganizationInTable ||
                    (![
                      OptionOrganizationStatisticType.CALENDAR,
                      OptionOrganizationStatisticType.OTHER,
                    ].includes(
                      info.row.original
                        .tagName as OptionOrganizationStatisticType,
                    ) &&
                      selectedOptionOrganizationInTable ===
                        OptionOrganizationStatisticType.MAIN_TEAM)
              }
              onChange={(e: any) => {
                if (e) {
                  if (selectedOrganization?.value === ALL_TEAM_STATISTIC) {
                    const categoryName = info.row.original
                      .tagName as OptionOrganizationStatisticType;

                    const finalCategoryName = [
                      OptionOrganizationStatisticType.CALENDAR,
                      OptionOrganizationStatisticType.OTHER,
                    ].includes(categoryName)
                      ? categoryName
                      : OptionOrganizationStatisticType.MAIN_TEAM;

                    setSelectedTag({
                      id: info.row.original.tagId,
                      name: categoryName,
                      organizationId: info.row.original.organizationId,
                    });

                    setSelectedOptionOrganizationInTable(finalCategoryName);
                  } else {
                    setSelectedTag({
                      id: info.row.original.tagId,
                      name: info.row.original.tagName,
                      organizationId: info.row.original.organizationId,
                    });
                    setSelectedOrganizationInTable(
                      info.row.original.organizationId,
                    );
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
                      if (selectedOrganization?.value == ALL_TEAM_STATISTIC) {
                        setTagCollapseStatuses((prev) => {
                          return prev.map((item) => {
                            return item.tagId == info.row.original.tagId
                              ? { ...item, status: !item.status }
                              : item;
                          });
                        });
                      } else {
                        setTagCollapseStatuses((prev) => {
                          return prev.map((item) =>
                            item.tagId == info.row.original.tagId &&
                            item.organizationId ==
                              info.row.original.organizationId
                              ? { ...item, status: !item.status }
                              : item,
                          );
                        });
                      }
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
                        selectedMembers.join(',').includes(String(user.userId)),
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
      accessorKey: 'tagDuration',
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
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
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
              <p>{value.split(':')[0] || 0}時間</p>
              <p>{value.split(':')[1] || 0}分</p>
            </div>
            {collapseStatus &&
              info.row.original?.userList &&
              info.row.original?.userList.length > 0 && (
                <div className="flex flex-col">
                  {info.row.original?.userList
                    ?.filter((user) =>
                      selectedMembers.join(',').includes(String(user.userId)),
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
      accessorKey: 'tagPercent',
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
          tagCollapseStatuses.find((tagCollapseStatus) =>
            selectedOrganization?.value != ALL_TEAM_STATISTIC
              ? tagCollapseStatus.tagId == info.row.original.tagId &&
                info.row.original.organizationId ==
                  tagCollapseStatus?.organizationId
              : tagCollapseStatus.tagId == info.row.original.tagId,
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
                      selectedMembers.join(',').includes(String(user.userId)),
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      style={{
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[14px]">
      {/* Header & sort */}
      <div className="flex justify-between">
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
          {/* List tags  */}
          <div>
            <div className="flex justify-between w-full my-8 px-[30px]">
              {/* Filter tag */}
              <FilterTagTeam />
            </div>
          </div>
          <div className="flex justify-between items-end px-[30px] text-sm font-medium">
            {/* Column Chart 1 */}
            <div className="w-[220px] flex flex-col items-center">
              <div
                className={`${selectedOrganization && !selectedLarge && !selectedMedium && !selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                チーム
              </div>
              <div className="mt-4 w-full">
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
                  onChange={(data) => {
                    setSelectedMembers([]);
                    setAreaTableData([]);
                    setSelectedTag(null);
                    setIsTableDataRendered(false);
                    handleSelectOrganization(data);
                  }}
                />
              </div>
            </div>
            {selectedLarge ? (
              <div className="w-[18px]">
                <ImageRound
                  className={`w-fit h-fit`}
                  src="/icons/drawer-blue.svg"
                  name="icon chevron right"
                />
              </div>
            ) : (
              <div className="w-[18px]"></div>
            )}

            {/* Column Chart 2 */}
            <div className="w-[220px] flex flex-col items-center">
              <div
                className={`${selectedOrganization && selectedLarge && !selectedMedium && !selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                大カテゴリー
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
                    setSelectedTag(null);
                    handleSelectLarge(data);
                  }}
                  disabled={!selectedOrganization || isHasLoading}
                />
              </div>
            </div>
            {selectedMedium ? (
              <div className="w-[18px]">
                <ImageRound
                  className={`w-fit h-fit`}
                  src="/icons/drawer-blue.svg"
                  name="icon chevron right"
                />
              </div>
            ) : (
              <div className="w-[18px]"></div>
            )}
            {/* Column Chart 3 */}
            <div className="w-[220px] flex flex-col items-center">
              <div
                className={`${selectedOrganization && selectedLarge && selectedMedium && !selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                中カテゴリー
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
                    setSelectedTag(null);
                    handleSelectMedium(data);
                  }}
                  disabled={!selectedLarge || isHasLoading || isDisableCalendar}
                />
              </div>
            </div>
            {selectedSmall ? (
              <div className="w-[18px]">
                <ImageRound
                  className={`w-fit h-fit`}
                  src="/icons/drawer-blue.svg"
                  name="icon chevron right"
                />
              </div>
            ) : (
              <div className="w-[18px]"></div>
            )}
            {/* Column Chart 4 */}
            <div className="w-[220px] flex flex-col items-center">
              <div
                className={`${selectedOrganization && selectedLarge && selectedMedium && selectedSmall ? 'text-white bg-[#0068B6]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                小カテゴリー
              </div>
              <div className="mt-4 w-full">
                <Dropdown
                  label="小カテゴリー選択"
                  placeholder="-"
                  placeholderClass="!text-black text-sm font-normal"
                  className="!h-[34px] !rounded-md text-sm font-normal !py-0 !border !border-[#77858F]"
                  labelTextClass="!text-[#77858F] !text-xs !font-medium"
                  classNameOption="!text-sm"
                  options={smallOptions}
                  selectedOption={selectedSmall || undefined}
                  onChange={(data) => {
                    setAreaTableData([]);
                    setSelectedTag(null);
                    handleSelectSmall(data);
                  }}
                  disabled={
                    !selectedMedium || isHasLoading || isDisableCalendar
                  }
                />
              </div>
            </div>
          </div>
          <div className="mt-5 px-[30px]">
            <div className="flex justify-between w-full mb-4">
              <div className="flex gap-2 items-end font-medium">
                <p>合計時間</p>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {getTotalDuration()?.split(':')[0]}
                  </p>
                  <p className="text-[25px] leading-none">時間</p>
                </div>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {getTotalDuration()?.split(':')[1]}
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
                    setSelectedTag(null);
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
          {(isFetchingStatisticUserTaskDurationsList &&
            selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
          (isFetchingStatisticAllTeamTaskDurationsList &&
            selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[380px] w-[calc(100%_-_60px)] mx-auto`}
            />
          ) : (
            <div className="relative">
              <Chart
                options={options as any}
                series={dataChart}
                type="area"
                height={380}
              />
              <div className="flex flex-wrap gap-x-[30px] gap-y-3 mt-4 justify-end px-[30px]">
                {dataChart.map((s, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <div
                      className="w-[10px] h-[10px]"
                      style={{ backgroundColor: colorList[index] }}
                    />
                    <span className="text-xs text-[#77858F]">{s.name}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  height: timeRange.length > 10 ? 340 - 70 : '340px',
                }}
                className={`w-full ${isLargerTime ? 'pl-[90px]' : 'pl-[45px]'} pr-[51px] h-[320px] flex absolute top-0 left-0 bg-transparent`}>
                {!(dataChart.length == 1 && !dataChart[0].name) &&
                  timeRange
                    .slice(timeRange.length > 1 ? 1 : 0)
                    .map((item, idx) => {
                      const actualIndex = idx + 1;
                      const isHovered = hoveredIndex === actualIndex;

                      const dataDetail = getDataByIndex(idx);

                      const totalDuration = dataDetail
                        ? sumDurationsChart(
                            dataDetail.map((user) => user.duration),
                          )
                        : DEFAULT_TIME_TEXT;
                      const dataDetailAllTeam =
                        statisticAllTeamTaskDurationsList &&
                        statisticAllTeamTaskDurationsList.durations[idx];
                      const totalDurationAllTeam = dataDetailAllTeam
                        ? sumDurationsChart(
                            dataDetailAllTeam.data.map((user) => user.duration),
                          )
                        : DEFAULT_TIME_TEXT;

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
                          {selectedOrganization?.value !=
                            ALL_TEAM_STATISTIC && (
                            <div
                              style={{
                                boxShadow: '0px 2px 8px 0px #0000001A',
                              }}
                              className={`bg-white absolute py-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-md w-[250px] ${isHovered && 'z-[50]'}`}>
                              <p className="text-sm px-5 font-normal text-[#77858F] mb-1 text-start w-full block">
                                {dataDetail &&
                                  dataDetail.length > 0 &&
                                  convertToJapaneseDateRange(
                                    dataDetail[0]?.startDate as string,
                                    dataDetail[0]?.endDate as string,
                                  )}
                              </p>
                              <p className="text-start px-5 mt-4">
                                {selectedTag?.name}
                              </p>
                              <div className="flex text-base my-3 font-normal gap-[10px] px-5">
                                <p>
                                  {totalDuration &&
                                    formatTimeToJapanese(totalDuration)}
                                </p>
                              </div>
                              <div className="px-5 max-h-[250px] overflow-y-auto">
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
                                          <div className=" text-black w-fit max-w-[140px] line-clamp-3 break-all text-left">
                                            {user.user.fullName}
                                          </div>
                                          <div>{user.percentPerRange}%</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                          {selectedOrganization?.value ==
                            ALL_TEAM_STATISTIC && (
                            <div
                              style={{
                                boxShadow: '0px 2px 8px 0px #0000001A',
                              }}
                              className={`bg-white absolute py-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-md w-[250px] ${isHovered && 'z-[50]'}`}>
                              <p className="text-sm px-5 font-normal text-[#77858F] mb-1 text-start w-full block">
                                {dataDetailAllTeam &&
                                  convertToJapaneseDateRange(
                                    dataDetailAllTeam.startDate,
                                    dataDetailAllTeam.endDate,
                                  )}
                              </p>
                              <p className="text-start px-5 mt-4">
                                {selectedTag?.name}
                              </p>
                              <div className="flex text-base my-3 font-normal gap-[10px] px-5">
                                <p>
                                  {totalDurationAllTeam &&
                                    formatTimeToJapanese(totalDurationAllTeam)}
                                </p>
                              </div>
                              <div className="px-5 max-h-[250px] overflow-y-auto">
                                {dataDetailAllTeam &&
                                  dataDetailAllTeam.data.length > 0 &&
                                  dataDetailAllTeam.data[0].users?.map(
                                    (user, userIndex) => {
                                      return (
                                        <div
                                          key={userIndex}
                                          className="flex items-center gap-1.5 mb-1.5">
                                          <CustomUserAvatar
                                            avatarUrl={user.avatar || ''}
                                            avatarColor={user.avatarColor || ''}
                                            size={30}
                                          />
                                          <div className="flex flex-grow items-center justify-between text-base font-medium">
                                            <div className=" text-black w-fit max-w-[140px] line-clamp-3 break-all text-left">
                                              {user.fullName}
                                            </div>
                                            <div>{user.percent}%</div>
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
              </div>
            </div>
          )}
          <div className="px-[30px]">
            {(isFetchingStatisticUserTaskDurationsList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (isFetchingStatisticAllTeamTaskDurationsList &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <StatisticLineChartTableSkeleton />
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default StackedAreaTeamTagChart;
