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
import RowSkeleton from '@components/skeleton/RowSkeleton';
import StatisticLineChartTableSkeleton from '@components/common/SkeletonLoading/StatisticLineChartTableSkeleton';

import { ALL_TEAM_STATISTIC, DEFAULT_TIME_TEXT } from '@constants';
import {
  SortingType,
  StatisticViewLabels,
  StatisticViewOptions,
} from '@constants/enums';

import { OptionDropdownType } from '@interfaces/common';
import {
  StatisticCategoryInfo,
  StatisticsAllTeamTaskDuration,
  StatisticsCategories,
  StatisticsTaskDuration,
} from '@interfaces/statistic';

import { StatisticStateContext } from '@providers/StatisticProvider';

import {
  getLineChartEnableViews,
  getRandomColor,
  getStatisticMilestones,
  lightenColor,
  normalizeDurationsWithStatisticAllTeamCategoryTaskDurations,
  normalizeDurationsWithStatisticCategoryTaskDurations,
} from '@utils';
import {
  convertDurationToTotalMinutes,
  convertToJapaneseDateRange,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
} from '@utils/date';

import FilterStatistic from './filter/FilterStatistic';

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticTaskDurationsList: StatisticsTaskDuration | undefined;
  statisticAllTeamTaskDurationsList: StatisticsAllTeamTaskDuration | undefined;
  isFetchingStatisticTaskDurationsList: boolean;
  isFetchingStatisticAllTeamTaskDurationsList: boolean;

  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const StackedAreaChart = ({
  statisticCategoryList,
  statisticTaskDurationsList,
  statisticAllTeamTaskDurationsList,
  startDate,
  endDate,
  isFetchingStatisticTaskDurationsList,
  isFetchingStatisticAllTeamTaskDurationsList,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  const {
    isDisableCalendar,
    isHasLoading,
    totalDurationTask,
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    lineChartViewBy,
    selectedSmall,
    setLineChartViewBy,
  } = useContext(StatisticStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

  const [tableData, setTableData] = useState<
    {
      categoryId: number | string;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[]
  >([]);

  const [dataChart, setDataChart] = useState<
    {
      name: string;
      data: number[];
    }[]
  >([]);

  const viewOptions = [
    {
      value: StatisticViewOptions.DAY,
      label: StatisticViewLabels.DAY,
    },
    {
      value: StatisticViewOptions.WEEK,
      label: StatisticViewLabels.WEEK,
    },
    {
      value: StatisticViewOptions.MONTH,
      label: StatisticViewLabels.MONTH,
    },
  ];
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
      statisticTaskDurationsList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      const color =
        statisticCategoryList?.largeCategories?.find(
          (item) => item.categoryId === selectedLarge?.value,
        )?.categoryColor || '';

      const colorListData: string[] = [];
      const tableDetail: {
        categoryId: number;
        categoryName: string;
        categoryDuration: string;
        categoryPercent: string;
        categoryColor: string;
      }[] = [];

      const normalizeDataObject = {
        data: statisticTaskDurationsList?.data || [],
        durations: normalizeDurationsWithStatisticCategoryTaskDurations({
          durations: statisticTaskDurationsList?.durations || [],
          data: statisticTaskDurationsList?.data || [],
        }),
      };

      if (normalizeDataObject?.data && normalizeDataObject?.data?.length > 0) {
        normalizeDataObject.data.forEach((data) => {
          tableDetail.push({
            categoryId: data.categoryId as number,
            categoryName: data.categoryName,
            categoryDuration: data.duration,
            categoryPercent: String(data?.percent || 0),
            categoryColor:
              data.categoryColor ||
              (color && lightenColor(color, data?.percent || 0)) ||
              getRandomColor(),
          });
          const colorAdd =
            data.categoryColor ||
            (color && lightenColor(color, data?.percent || 0)) ||
            getRandomColor();

          colorListData.push(colorAdd);
        });

        setTableData(tableDetail);
        setColorList(colorListData);
      } else {
        setTableData([]);
      }

      if (
        normalizeDataObject.durations &&
        normalizeDataObject.durations?.length > 0
      ) {
        const dates: string[] = normalizeDataObject.durations.map(
          (item) => item.startDate,
        );
        const lastItem = normalizeDataObject.durations.at(-1);
        if (lastItem) dates.push(lastItem.endDate);

        const uniqueSortedDates = [...dates].sort(
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

        const categoryMap = new Map<string, number[]>();

        for (let i = 0; i <= uniqueSortedDates.length - 1; i++) {
          const date = uniqueSortedDates[i];
          const weekItem = normalizeDataObject.durations.find(
            (item) => item.startDate === date,
          );

          if (weekItem) {
            for (const cat of weekItem.data) {
              if (!categoryMap.has(cat.categoryName)) {
                categoryMap.set(
                  cat.categoryName,
                  Array(uniqueSortedDates.length - 1).fill(0),
                );
              }

              const dataArray = categoryMap.get(cat.categoryName)!;
              dataArray[i] = cat.percent;
            }
          }
        }

        const isAddFirstValue =
          normalizeDataObject.durations[0]?.startDate !==
          normalizeDataObject.durations[0]?.endDate;

        const chartData = Array.from(categoryMap.entries()).map(
          ([name, data]) => {
            const firstValue = data.at(0) ?? 0;
            return {
              name,
              data: isAddFirstValue ? [firstValue, ...data] : [...data],
            };
          },
        );

        let sortSource: StatisticCategoryInfo[] | undefined =
          statisticCategoryList?.largeCategories;

        if (selectedLarge && statisticCategoryList?.mediumCategories?.length) {
          sortSource = statisticCategoryList.mediumCategories;

          if (
            selectedMedium &&
            statisticCategoryList?.smallCategories?.length
          ) {
            sortSource = statisticCategoryList.smallCategories;

            if (selectedSmall && statisticCategoryList?.category?.length) {
              sortSource = statisticCategoryList.category;
            }
          }
        }

        if (sortSource?.length) {
          const order = sortSource.map((cat) => cat.categoryName);
          chartData.sort(
            (a, b) =>
              order.indexOf(String(a.name)) - order.indexOf(String(b.name)),
          );
        }

        setDataChart(chartData);
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
        setTableData([]);
        return;
      }
    }
  }, [
    statisticTaskDurationsList,
    statisticCategoryList,
    selectedOrganization,
    selectedLarge,
    lineChartViewBy,
    selectedMedium,
    selectedSmall,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    if (
      statisticAllTeamTaskDurationsList &&
      selectedOrganization?.value === ALL_TEAM_STATISTIC
    ) {
      const colorListData: string[] = [];
      const tableDetail: {
        categoryId: number | string;
        categoryName: string;
        categoryDuration: string;
        categoryPercent: string;
        categoryColor: string;
      }[] = [];

      const normalizeDataObject: StatisticsAllTeamTaskDuration = {
        data: statisticAllTeamTaskDurationsList?.data || [],
        durations: normalizeDurationsWithStatisticAllTeamCategoryTaskDurations({
          durations: statisticAllTeamTaskDurationsList?.durations || [],
          data: statisticAllTeamTaskDurationsList?.data || [],
        }),
      };

      // ===== TABLE DATA =====
      if (normalizeDataObject?.data?.length > 0) {
        normalizeDataObject.data.forEach((data) => {
          const finalColor = data.color || getRandomColor();

          tableDetail.push({
            categoryId: data.organizationId,
            categoryName: data.organizationName,
            categoryDuration: data.duration,
            categoryPercent: String(data?.percent || 0),
            categoryColor: finalColor,
          });

          colorListData.push(finalColor);
        });

        setTableData(tableDetail);
        setColorList(colorListData.reverse());
      } else {
        setTableData([]);
        setColorList([]);
      }

      // ===== CHART DATA =====
      if (normalizeDataObject?.durations?.length > 0) {
        const dates: string[] = normalizeDataObject.durations.map(
          (item) => item.startDate,
        );
        const lastItem = normalizeDataObject.durations.at(-1);
        if (lastItem) dates.push(lastItem.endDate);

        const uniqueSortedDates = [...dates].sort(
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

        const categoryMap = new Map<string, number[]>();

        for (let i = 0; i <= uniqueSortedDates.length - 1; i++) {
          const date = uniqueSortedDates[i];
          const weekItem = normalizeDataObject.durations.find(
            (item) => item.startDate === date,
          );

          if (weekItem) {
            for (const org of weekItem.data) {
              if (!categoryMap.has(org.organizationName)) {
                categoryMap.set(
                  org.organizationName,
                  Array(uniqueSortedDates.length - 1).fill(0),
                );
              }

              const dataArray = categoryMap.get(org.organizationName)!;
              dataArray[i] = org.percent;
            }
          }
        }

        const isAddFirstValue =
          normalizeDataObject.durations[0]?.startDate !==
          normalizeDataObject.durations[0]?.endDate;

        const chartData = Array.from(categoryMap.entries()).map(
          ([name, data]) => {
            const firstValue = data.at(0) ?? 0;
            return {
              name,
              data: isAddFirstValue ? [firstValue, ...data] : [...data],
            };
          },
        );

        chartData.sort((a, b) => a.name.localeCompare(b.name));

        setDataChart(chartData);
      } else {
        setTimeRange([]);
        setDataChart([]);
      }
    }
  }, [
    statisticAllTeamTaskDurationsList,
    statisticCategoryList,
    selectedOrganization,
    selectedLarge,
    lineChartViewBy?.value,
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
      formatter: function (seriesName: string) {
        return `
          <div style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${seriesName}
          </div>
        `;
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

  // sort
  const sortByDurationDifference = (
    data: {
      categoryId: number | string;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowADuration = convertDurationToTotalMinutes(
        rowA.categoryDuration || DEFAULT_TIME_TEXT,
      );
      const rowBDuration = convertDurationToTotalMinutes(
        rowB.categoryDuration || DEFAULT_TIME_TEXT,
      );

      return sortingType == SortingType.ASC
        ? rowADuration - rowBDuration
        : rowBDuration - rowADuration;
    });
    setTableData(sortedArr);
  };
  const sortByPercentDifference = (
    data: {
      categoryId: number | string;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[],
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

  // Data
  const columns: ColumnDef<{
    categoryId: number | string;
    categoryName: string;
    categoryDuration: string;
    categoryPercent: string;
    categoryColor: string;
  }>[] = [
    {
      accessorKey: 'categoryName',
      header: () => {
        return (
          <div className="font-medium px-[18px] text-[16px] break-all line-clamp-3 text-left text-black flex gap-2 items-center">
            <div
              style={{ backgroundColor: '#228CDB' }}
              className={`w-4 h-4 rounded-[3px] flex items-center justify-center`}>
              <ImageRound
                name="Check task"
                src={'/icons/check-task.svg'}
                className="w-[10px] h-2"
              />
            </div>{' '}
            <p className="text-[#77858F] font-medium text-xs text-left">
              カテゴリー名
            </p>
          </div>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium px-[18px] text-[16px] break-all line-clamp-3 text-left text-black flex gap-2 items-center">
            <div
              style={{ backgroundColor: info.row.original.categoryColor }}
              className={`w-4 h-4 min-w-[16px] rounded-[3px] flex items-center justify-center`}>
              <ImageRound
                name="Check task"
                src={'/icons/check-task.svg'}
                className="w-[10px] h-2"
              />
            </div>{' '}
            <p className="break-words max-w-[calc(100%_-_20px)]">{value}</p>{' '}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'categoryDuration',
      enableSorting: false,
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
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium flex text-[14px] whitespace-nowrap justify-center text-black">
            <p>{value.split(':')[0] || 0}時間</p>
            <p>{value.split(':')[1] || 0}分</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'categoryPercent',
      size: 30,
      enableSorting: false,
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
      cell: (info) => {
        const value = Number(info.getValue()) || 0;
        return (
          <div className="font-medium flex text-[14px] justify-center text-black">
            <p>{Math.round(value)}%</p>
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

  return (
    <div
      style={{
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
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
          {/* Filter */}
          <FilterStatistic />
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
                  className={`${selectedOrganization && selectedLarge?.value == '' && selectedMedium?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
                  大カテゴリー
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
                    onChange={(data) => handleSelectOrganization(data)}
                  />
                </div>
              </div>
              {/* Column Chart 2 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && selectedLarge?.value !== '' && selectedMedium?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                    disabled={!selectedOrganization || isHasLoading}
                  />
                </div>
              </div>
              {/* Column Chart 3 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization && selectedLarge?.value !== '' && selectedMedium?.value !== '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                    disabled={
                      selectedLarge?.value == '' ||
                      isHasLoading ||
                      isDisableCalendar
                    }
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
                  options={viewOptions}
                  selectedOption={viewOptions.find(
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
          {(isFetchingStatisticTaskDurationsList &&
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
                className={`w-full ${isLargerTime ? 'pl-[90px]' : 'pl-[45px]'}  pr-[51px] h-[320px] flex absolute top-0 left-0 bg-transparent`}>
                {!(dataChart.length == 1 && !dataChart[0].name) &&
                  timeRange
                    .slice(timeRange.length > 1 ? 1 : 0)
                    .map((item, idx) => {
                      const actualIndex = idx + 1;
                      const isHovered = hoveredIndex === actualIndex;

                      const dataDetail =
                        statisticTaskDurationsList &&
                        statisticTaskDurationsList.durations[idx];
                      const dataDetailAllTeam =
                        statisticAllTeamTaskDurationsList &&
                        statisticAllTeamTaskDurationsList.durations[idx];
                      const dataEmpty =
                        dataDetailAllTeam && dataDetailAllTeam.data.length
                          ? []
                          : tableData;
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
                          {/* Detail with no all team */}
                          {statisticTaskDurationsList &&
                            selectedOrganization?.value !==
                              ALL_TEAM_STATISTIC && (
                              <div
                                style={{
                                  boxShadow: '0px 2px 8px 0px #0000001A',
                                }}
                                className={`bg-white absolute py-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-[14px] w-[250px] ${isHovered && 'z-[50]'}`}>
                                <p className="text-sm px-5 font-normal text-[#77858F] mb-1 text-center w-full block">
                                  {convertToJapaneseDateRange(
                                    dataDetail?.startDate as string,
                                    dataDetail?.endDate as string,
                                  )}
                                </p>
                                <div className="max-h-[250px] overflow-y-auto px-5">
                                  {/* Detail with no all team */}
                                  {dataDetail?.data.map((cate, cateIndex) => {
                                    const colorDefault = tableData.find(
                                      (itemFind) =>
                                        itemFind.categoryId == cate.categoryId,
                                    );
                                    return (
                                      <div
                                        key={cateIndex}
                                        className="flex items-baseline gap-1.5">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{
                                            backgroundColor:
                                              cate.categoryColor ||
                                              colorDefault?.categoryColor ||
                                              '',
                                          }}
                                        />
                                        <div className="flex flex-grow items-baseline justify-between text-base font-medium w-full">
                                          <div className=" text-black w-[calc(100%_-_60px)] max-w-[calc(100%_-_60px)] line-clamp-3 break-all text-left">
                                            {cate.categoryName}
                                          </div>
                                          <p className="w-[50px] text-right">
                                            {cate.percent}%
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          {/* Detail with  all team */}
                          {statisticAllTeamTaskDurationsList &&
                            selectedOrganization?.value ===
                              ALL_TEAM_STATISTIC && (
                              <div
                                style={{
                                  boxShadow: '0px 2px 8px 0px #0000001A',
                                }}
                                className={`bg-white absolute py-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-[14px] w-[250px] ${isHovered && 'z-[50]'}`}>
                                <p className="text-sm px-5 font-normal text-[#77858F] mb-1 text-center w-full block">
                                  {convertToJapaneseDateRange(
                                    dataDetailAllTeam?.startDate as string,
                                    dataDetailAllTeam?.endDate as string,
                                  )}
                                </p>
                                <div className="max-h-[250px] overflow-y-auto px-5">
                                  {dataDetailAllTeam?.data &&
                                  dataDetailAllTeam.data.length
                                    ? dataDetailAllTeam?.data.map(
                                        (org, orgIndex) => {
                                          return (
                                            <div
                                              key={orgIndex}
                                              className="flex items-baseline gap-1.5">
                                              <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                  backgroundColor: org.color,
                                                }}
                                              />
                                              <div className="flex flex-grow items-baseline justify-between text-base font-medium w-full">
                                                <div className=" text-black w-[calc(100%_-_60px)] max-w-[calc(100%_-_60px)] line-clamp-3 break-all text-left">
                                                  {org.organizationName}
                                                </div>
                                                <p className="w-[50px] text-right">
                                                  {org.percent}%
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        },
                                      )
                                    : dataEmpty?.map((org, orgIndex) => {
                                        return (
                                          <div
                                            key={orgIndex}
                                            className="flex items-baseline gap-1.5">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  org.categoryColor,
                                              }}
                                            />
                                            <div className="flex flex-grow items-baseline justify-between text-base font-medium w-full">
                                              <div className=" text-black w-[calc(100%_-_60px)] max-w-[calc(100%_-_60px)] line-clamp-3 break-all text-left">
                                                {org.categoryName}
                                              </div>
                                              <p className="w-[50px] text-right">
                                                {0}%
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
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
            {(isFetchingStatisticTaskDurationsList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (isFetchingStatisticAllTeamTaskDurationsList &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <StatisticLineChartTableSkeleton />
            ) : (
              <Table
                className={`border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-md ${tableData.length && 'max-h-[500px] overflow-y-auto'}`}>
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
export default StackedAreaChart;
