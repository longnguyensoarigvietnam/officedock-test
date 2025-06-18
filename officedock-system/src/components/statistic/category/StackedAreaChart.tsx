'use client';
import React, { useContext, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import Image from 'next/image';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { Table, TableBody } from '@components/common/Table';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import {
  SortingType,
  StatisticViewLabels,
  StatisticViewOptions,
} from '@constants/enums';

import useStatisticPercentChart from '@hooks/useStatisticPercentChart';

import { OptionDropdownType } from '@interfaces/common';
import { StatisticsCategories } from '@interfaces/statistic';
import { StatisticStateContext } from '@providers/StatisticProvider';
import { getLineChartEnableViews, lightenColor } from '@utils';
import {
  convertDurationToTotalMinutes,
  convertToJapaneseDateRange,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
  sumDurationsChart,
} from '@utils/date';

type Props = {
  startDate: Date;
  endDate: Date | null;
  removeTag: (selected: OptionDropdownType) => void;
  statisticCategoryList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const StackedAreaChart = ({
  statisticCategoryList,
  startDate,
  endDate,
  removeTag,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  const {
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationTask,
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    tagsOptions,
    lineChartViewBy,
    setSelectedTags,
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
      categoryId: number;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[]
  >([]);
  const { statisticPercentChartList, isLoadingStatisticPercentChartList } =
    useStatisticPercentChart({
      filter: {
        fromDate: formatDateToYMD(startDate) || '',
        endDate: formatDateToYMD(`${endDate}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId: selectedLarge?.value || '',
        mediumCategoryId: selectedMedium?.value || '',
        tagIds: selectedTags,
        statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
      },
    });

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
    if (!statisticPercentChartList || statisticPercentChartList.length === 0) {
      setTimeRange([]);
      setDataChart([]);
      setTableData([]);
      return;
    }

    // 1. Create timeRange
    const dates: string[] = statisticPercentChartList.map(
      (item) => item.startDate,
    );
    const lastItem = statisticPercentChartList.at(-1);
    if (lastItem && lastItem.endDate !== lastItem.startDate) {
      dates.push(lastItem.endDate);
    }

    const uniqueSortedDates = Array.from(new Set(dates)).sort(
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

    // 2. Collect chart data percentage
    const categoryMap = new Map<string, number[]>();

    for (let i = 0; i < uniqueSortedDates.length - 1; i++) {
      const date = uniqueSortedDates[i];
      const weekItem = statisticPercentChartList.find(
        (item) => item.startDate === date,
      );

      if (weekItem) {
        for (const cat of weekItem.categories) {
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

    const chartData = Array.from(categoryMap.entries()).map(([name, data]) => {
      const firstValue = data.at(0) ?? 0;
      return {
        name,
        data: [firstValue, ...data],
      };
    });

    setDataChart(chartData);

    // 3. Collect tableData (duration + percent)
    const categoryTableMap = new Map<
      string, // use key `${id}_${name}` to distinguish
      {
        categoryId: number;
        categoryName: string;
        categoryColor: string;
        durations: string[];
        percents: number[];
      }
    >();

    let colorChild = '';

    // Iterate through each item
    for (const item of statisticPercentChartList) {
      for (const cat of item.categories) {
        const mapKey = `${cat.categoryId}_${cat.categoryName}`; // distinguish by ID + name

        if (!categoryTableMap.has(mapKey)) {
          categoryTableMap.set(mapKey, {
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            categoryColor: cat.categoryColor,
            durations: [],
            percents: [],
          });
        }

        const existing = categoryTableMap.get(mapKey)!;
        existing.durations.push(cat.duration);
        existing.percents.push(cat.percent);
      }
    }

    if (statisticCategoryList?.mediumCategories) {
      colorChild =
        statisticCategoryList?.largeCategories.find(
          (item) => item.categoryId === selectedLarge?.value,
        )?.categoryColor || '';
    }

    const finalTableData = Array.from(categoryTableMap.values()).map((cat) => {
      const totalDuration = sumDurationsChart(cat.durations);

      let percent = 0;

      if (
        !selectedLarge?.value &&
        statisticCategoryList?.largeCategories &&
        statisticCategoryList?.largeCategories?.length > 0
      ) {
        percent =
          statisticCategoryList.largeCategories.find(
            (category) => category.categoryName === cat.categoryName,
          )?.percent || 0;
      } else if (
        !selectedMedium?.value &&
        statisticCategoryList?.mediumCategories &&
        statisticCategoryList?.mediumCategories?.length > 0
      ) {
        percent =
          statisticCategoryList.mediumCategories.find(
            (category) => category.categoryName === cat.categoryName,
          )?.percent || 0;
      } else if (
        statisticCategoryList?.smallCategories &&
        statisticCategoryList?.smallCategories?.length > 0
      ) {
        percent =
          statisticCategoryList.smallCategories.find(
            (category) => category.categoryName === cat.categoryName,
          )?.percent || 0;
      }

      return {
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        categoryColor:
          cat.categoryColor !== null
            ? cat.categoryColor
            : colorChild !== ''
              ? lightenColor(colorChild, percent)
              : '',
        categoryDuration: totalDuration,
        categoryPercent: `${percent}`,
      };
    });

    setTableData(finalTableData);

    setColorList(
      finalTableData.map((color) => {
        return color.categoryColor;
      }),
    );
  }, [
    statisticPercentChartList,
    lineChartViewBy,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    selectedLarge,
    statisticCategoryList,
    selectedMedium,
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
      categoryId: number;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[],
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
  const sortByPercentDifference = (
    data: {
      categoryId: number;
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
    categoryId: number;
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
              style={{ backgroundColor: '#0068B6' }}
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
      enableSorting: true,
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
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium flex text-[14px] justify-center text-black">
            <p>{value.split(':')[0] || 0}時間</p>
            <p>{value.split(':')[1] || 0}分</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'categoryPercent',
      size: 20,
      enableSorting: true,
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
    initialState: {
      sorting: [
        {
          id: 'categoryDuration',
          desc: true,
        },
      ],
    },
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
            <div className="w-[240px] flex-shrink-0 relative">
              <MultiSelectDropdown
                isShowIconFilter
                options={tagsOptions}
                optionClassName="!top-6"
                labelOptionClass="break-words w-[190px]"
                placeholder="集計対象のタグを選択"
                className="!h-[14px] !py-0 text-sm font-normal !rounded-md"
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
              {selectedTags.length === 0 && (
                <span className="text-xs absolute text-[#77858F] top-[2px] right-[135px]">
                  タグの絞り込み
                </span>
              )}
            </div>
            <div className="relative flex-grow right-[224px] top-0">
              <div className="flex gap-2 w-full flex-shrink-0 flex-wrap ">
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
          {isLoadingStatisticPercentChartList ? (
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
                className={`w-full ${isLargerTime ? 'pl-[90px]' : 'pl-[45px]'}  pr-[51px] h-[320px] flex absolute top-0 left-0 bg-transparent`}>
                {timeRange.slice(1).map((item, idx) => {
                  const actualIndex = idx + 1;
                  const isHovered = hoveredIndex === actualIndex;

                  const dataDetail =
                    statisticPercentChartList && statisticPercentChartList[idx];
                  const dataDetailDate =
                    statisticPercentChartList && statisticPercentChartList[idx];

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
                      {statisticPercentChartList && (
                        <div
                          style={{
                            boxShadow: '0px 2px 8px 0px #0000001A',
                          }}
                          className={`bg-white absolute p-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-md w-[250px] ${isHovered && 'z-[50]'}`}>
                          <p className="text-sm font-normal text-[#77858F] mb-1 text-center w-full block">
                            {convertToJapaneseDateRange(
                              dataDetailDate?.startDate as string,
                              dataDetailDate?.endDate as string,
                            )}
                          </p>
                          {dataDetail?.categories.map((cate, cateIndex) => {
                            const colorDefault = tableData.find(
                              (itemFind) =>
                                itemFind.categoryId === cate.categoryId,
                            );
                            return (
                              <div
                                key={cateIndex}
                                className="flex items-center gap-1.5">
                                <div
                                  className="w-3 h-3 rounded-sm"
                                  style={{
                                    backgroundColor:
                                      cate.categoryColor ||
                                      colorDefault?.categoryColor ||
                                      '',
                                  }}
                                />
                                <div className="flex flex-grow items-center justify-between text-base font-medium">
                                  <div className=" text-black w-fit  max-w-[180px] line-clamp-3 break-words">
                                    {cate.categoryName}
                                  </div>
                                  <div>{cate.percent}%</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="px-[30px]">
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
        </div>
      )}
    </div>
  );
};
export default StackedAreaChart;
