import React, { useContext, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Chart from 'react-apexcharts';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import { Table, TableBody } from '@components/common/Table';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import StatisticLineChartTableSkeleton from '@components/common/SkeletonLoading/StatisticLineChartTableSkeleton';

import { DEFAULT_TIME_TEXT } from '@constants';
import {
  SortingType,
  StatisticViewLabels,
  StatisticViewOptions,
} from '@constants/enums';
import useStatisticTagPercentChart from '@hooks/useStatisticTagPercentChart';

import {
  StatisticCategoryInfo,
  StatisticsCategories,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import {
  convertDurationToTotalMinutes,
  convertToJapaneseDateRange,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
  sumDurationsChart,
} from '@utils/date';
import {
  getLineChartEnableViews,
  getRandomColor,
  getStatisticMilestones,
  lightenColor,
} from '@utils';

import { StatisticTagStateContext } from '@providers/StatisticProviderTag';

import FilterTag from './filter/FilterTag';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type Props = {
  startDate: Date;
  endDate: Date | null;
  statisticTagsList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

const StackedAreaChart = ({
  statisticTagsList,
  startDate,
  endDate,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
}: Props) => {
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
    selectedTags,
    lineChartViewBy,
    setLineChartViewBy,
  } = useContext(StatisticTagStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [tableData, setTableData] = useState<
    {
      tagId: number;
      tagName: string;
      tagDuration: string;
      tagPercent: string;
      tagColor: string;
    }[]
  >([]);
  const [totalDuration, setTotalDuration] = useState<string>(DEFAULT_TIME_TEXT);

  const [timeRange, setTimeRange] = useState<string[]>([]);

  const [colorList, setColorList] = useState<string[]>([]);
  const [dataChart, setDataChart] = useState<
    {
      name: string;
      data: number[];
    }[]
  >([]);

  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

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

  const {
    statisticTagPercentChartList,
    isLoadingStatisticTagPercentChartList,
  } = useStatisticTagPercentChart({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value || '',
      mediumCategoryId: selectedMedium?.value || '',
      smallCategoryId: selectedSmall?.value || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
    },
  });

  useEffect(() => {
    if (
      !statisticTagPercentChartList ||
      statisticTagPercentChartList.length === 0
    ) {
      const timeMilestones = getStatisticMilestones(
        `${formatDateToYMD(startDate)}`,
        `${formatDateToYMD(endDate || '')}`,
        lineChartViewBy?.value as StatisticViewOptions,
      );

      const uniqueSortedDates = [...timeMilestones].sort(
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

    // 1. Create timeRange
    const dates: string[] = statisticTagPercentChartList.map(
      (item) => item.startDate,
    );
    const lastItem = statisticTagPercentChartList.at(-1);
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
      const weekItem = statisticTagPercentChartList.find(
        (item) => item.startDate === date,
      );

      if (weekItem && weekItem.tags) {
        const tagsArray = Array.isArray(weekItem.tags)
          ? weekItem.tags
          : [weekItem.tags]; // convert object to array if needed

        for (const cat of tagsArray) {
          if (!categoryMap.has(cat.tagName)) {
            categoryMap.set(
              cat.tagName,
              Array(uniqueSortedDates.length - 1).fill(0),
            );
          }

          const dataArray = categoryMap.get(cat.tagName)!;
          dataArray[i] = cat.percent;
        }
      }
    }
    const isAddFirstValue =
      statisticTagPercentChartList[0]?.startDate !==
      statisticTagPercentChartList[0]?.endDate;

    let chartData: { name: string; data: number[] }[] = [];

    if (categoryMap.size === 0) {
      chartData = [
        {
          name: '',
          data: Array(transformedDates.length).fill(0),
        },
      ];
    } else {
      chartData = Array.from(categoryMap.entries()).map(([name, data]) => {
        const isEmpty = data.length === 0;
        const validData = isEmpty
          ? Array(transformedDates.length - 1).fill(0)
          : isAddFirstValue
            ? [data.at(0) ?? 0, ...data]
            : [...data];

        return {
          name,
          data: validData,
        };
      });
    }

    // 3. Collect tableData (duration + percent)
    const categoryTableMap = new Map<
      string, // use key combining tagId and tagName to distinguish
      {
        tagId: number;
        tagName: string;
        tagColor: string;
        tagDuration: string[];
        tagPercent: number[];
      }
    >();

    for (const item of statisticTagPercentChartList) {
      const tagsArray = Array.isArray(item.tags) ? item.tags : [item.tags];

      for (const cat of tagsArray) {
        const id = cat.tagId ?? -1;
        const name = cat.tagName ?? '';
        const mapKey = `${id}_${name}`;

        if (!categoryTableMap.has(mapKey)) {
          categoryTableMap.set(mapKey, {
            tagId: id,
            tagName: name,
            tagColor: getRandomColor(),
            tagDuration: [],
            tagPercent: [],
          });
        }

        const existing = categoryTableMap.get(mapKey)!;
        existing.tagDuration.push(cat.duration);
        existing.tagPercent.push(cat.percent);
      }
    }

    const finalTableData = Array.from(categoryTableMap.values())
      .map((cat) => {
        const totalDuration = sumDurationsChart(cat.tagDuration);

        let percent = 0;

        if (
          !selectedLarge?.value &&
          statisticTagsList?.largeCategories &&
          statisticTagsList?.largeCategories?.length > 0
        ) {
          percent =
            statisticTagsList.largeCategories.find(
              (category) => category.tagName === cat.tagName,
            )?.percent ?? 0;
        } else if (
          !selectedMedium?.value &&
          statisticTagsList?.mediumCategories &&
          statisticTagsList?.mediumCategories?.length > 0
        ) {
          percent =
            statisticTagsList.mediumCategories.find(
              (category) => category.tagName === cat.tagName,
            )?.percent ?? 0;
        } else if (
          !selectedSmall?.value &&
          statisticTagsList?.smallCategories &&
          statisticTagsList?.smallCategories?.length > 0
        ) {
          percent =
            statisticTagsList.smallCategories.find(
              (category) => category.tagName === cat.tagName,
            )?.percent ?? 0;
        } else {
          percent =
            statisticTagsList?.category?.find(
              (category) => category.tagName === cat.tagName,
            )?.percent ?? 0;
        }

        return {
          tagId: cat.tagId,
          tagName: cat.tagName,
          tagColor: cat.tagColor,
          tagDuration: totalDuration,
          tagPercent: `${percent}`,
        };
      })
      .filter((data) => data.tagId !== -1);

    let sortSource: StatisticCategoryInfo[] | undefined =
      statisticTagsList?.category;

    if (!selectedLarge?.value && statisticTagsList?.largeCategories?.length) {
      sortSource = statisticTagsList.largeCategories;
    } else if (
      !selectedMedium?.value &&
      statisticTagsList?.mediumCategories?.length
    ) {
      sortSource = statisticTagsList.mediumCategories;
    } else if (
      !selectedSmall?.value &&
      statisticTagsList?.smallCategories?.length
    ) {
      sortSource = statisticTagsList.smallCategories;
    }

    if (sortSource?.length) {
      const tagNameOrder = sortSource.map((item) => item.tagName);

      chartData.sort((a, b) => {
        const indexA = tagNameOrder.indexOf(a.name);
        const indexB = tagNameOrder.indexOf(b.name);
        return (
          (indexA === -1 ? Infinity : indexA) -
          (indexB === -1 ? Infinity : indexB)
        );
      });
      const tagIdOrder = sortSource.map((item) => item.tagId);

      finalTableData.sort(
        (a, b) => tagIdOrder?.indexOf(a.tagId) - tagIdOrder?.indexOf(b.tagId),
      );
    }

    setDataChart(chartData);

    setTableData(finalTableData);

    setColorList(
      finalTableData.map(
        (color) =>
          lightenColor('#2E9267' as string, Number(color.tagPercent)) ||
          getRandomColor(),
      ),
    );

    if (
      selectedOrganization?.value &&
      !selectedLarge?.value &&
      !selectedMedium?.value &&
      !selectedSmall?.value
    ) {
      setTotalDuration(totalDurationLarge);
    } else if (
      selectedOrganization?.value &&
      selectedLarge?.value &&
      !selectedMedium?.value &&
      !selectedSmall?.value
    ) {
      setTotalDuration(totalDurationMedium);
    } else if (
      selectedOrganization?.value &&
      selectedLarge?.value &&
      selectedMedium?.value &&
      !selectedSmall?.value
    ) {
      setTotalDuration(totalDurationSmall);
    } else if (
      selectedOrganization?.value &&
      selectedLarge?.value &&
      selectedMedium?.value &&
      selectedSmall?.value
    ) {
      setTotalDuration(totalDurationCategory);
    }
    if (
      selectedOrganization?.value &&
      !selectedLarge?.value &&
      !selectedMedium?.value &&
      !selectedSmall?.value
    ) {
      setTotalDuration(totalDurationLarge);
    } else if (
      selectedOrganization?.value &&
      selectedLarge?.value &&
      !selectedMedium?.value &&
      !selectedSmall?.value
    ) {
      setTotalDuration(totalDurationMedium);
    } else if (
      selectedOrganization?.value &&
      selectedLarge?.value &&
      selectedMedium?.value &&
      !selectedSmall?.value
    ) {
      setTotalDuration(totalDurationSmall);
    } else if (
      selectedOrganization?.value &&
      selectedLarge?.value &&
      selectedMedium?.value &&
      selectedSmall?.value
    ) {
      setTotalDuration(totalDurationCategory);
    }
  }, [
    statisticTagPercentChartList,
    lineChartViewBy,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    selectedLarge,
    statisticTagsList,
    selectedMedium,
    selectedSmall,
    selectedOrganization?.value,
    totalDurationCategory,
    startDate,
    endDate,
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

  const sortByPercentDifference = (
    data: {
      tagId: number;
      tagName: string;
      tagDuration: string;
      tagPercent: string;
      tagColor: string;
    }[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.tagPercent || 0);
      const rowBPercentage = Number(rowB.tagPercent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setTableData(sortedArr);
  };

  const sortByDurationDifference = (
    data: {
      tagId: number;
      tagName: string;
      tagDuration: string;
      tagPercent: string;
      tagColor: string;
    }[],
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
    setTableData(sortedArr);
  };

  const columns: ColumnDef<{
    tagId: number;
    tagName: string;
    tagDuration: string;
    tagPercent: string;
    tagColor: string;
  }>[] = [
    {
      accessorKey: 'tagName',
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
              タグ名
            </p>
          </div>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium px-[18px] text-[16px] break-all line-clamp-3 text-left text-black flex gap-2 items-center">
            <div
              style={{
                backgroundColor: info.row.original.tagColor
                  ? lightenColor(
                      '#2E9267' as string,
                      Number(info.row.original.tagPercent),
                    )
                  : '',
              }}
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
        return (
          <div className="font-medium flex text-[14px] whitespace-nowrap justify-center text-black">
            <p>{value.split(':')[0] || 0}時間</p>
            <p>{value.split(':')[1] || 0}分</p>
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
            className="flex gap-1 items-center justify-center"
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
                className={`cursor-pointer justify-self-end ${percentageSortingStatus == SortingType.ASC && 'rotate-180'} `}
              />
            </div>
          </div>
        );
      },
      enableSorting: false,
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium flex text-[14px] justify-center text-black">
            <p>{Math.round(Number(value))}%</p>
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

  const getDisableViews = () => {
    const allViews = [
      StatisticViewOptions.DAY,
      StatisticViewOptions.WEEK,
      StatisticViewOptions.MONTH,
    ];

    const enabledViews = getLineChartEnableViews(startDate, endDate as Date);

    return allViews.filter((view) => !enabledViews.includes(view));
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (chartRef.current) {
        const inner = chartRef.current.querySelector(
          '.apexcharts-inner',
        ) as HTMLElement;
        if (inner) {
          const { height } = inner.getBoundingClientRect();
          setChartHeight(height);
        }
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [dataChart]);

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
                    onChange={(data) => handleSelectOrganization(data)}
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
                    onChange={(data) => handleSelectLarge(data)}
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
                    onChange={(data) => handleSelectMedium(data)}
                    disabled={
                      !selectedLarge || isHasLoading || isDisableCalendar
                    }
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
                    onChange={(data) => handleSelectSmall(data)}
                    disabled={
                      !selectedMedium || isHasLoading || isDisableCalendar
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
                    {totalDuration?.split(':')[0]}
                  </p>
                  <p className="text-[25px] leading-none">時間</p>
                </div>
                <div className="flex gap-1 items-baseline">
                  <p className="text-[34px] leading-none">
                    {totalDuration?.split(':')[1]}
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
          {isLoadingStatisticTagPercentChartList ? (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[380px] w-[calc(100%_-_60px)] mx-auto`}
            />
          ) : (
            <div ref={chartRef} className="relative">
              <Chart
                options={options as any}
                series={dataChart}
                type="area"
                height={380}
              />
              <div
                style={{
                  height: dataChart.length > 1 ? chartHeight : chartHeight + 5,
                }}
                className={`w-full ${isLargerTime ? 'pl-[90px]' : 'pl-[45px]'} pr-[51px] h-[320px] flex absolute top-0 left-0 bg-transparent`}>
                {!(dataChart.length == 1 && !dataChart[0].name) &&
                  timeRange
                    .slice(timeRange.length > 1 ? 1 : 0)
                    .map((item, idx) => {
                      const actualIndex = idx + 1;
                      const isHovered = hoveredIndex === actualIndex;

                      const dataDetail =
                        statisticTagPercentChartList &&
                        statisticTagPercentChartList[idx];
                      const dataDetailDate =
                        statisticTagPercentChartList &&
                        statisticTagPercentChartList[idx];

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
                          {statisticTagPercentChartList && (
                            <div
                              style={{
                                boxShadow: '0px 2px 8px 0px #0000001A',
                              }}
                              className={`bg-white absolute py-5 top-1/2 ${isLargerTime ? 'left-[-100px]' : 'left-0'} hidden group-hover:!block  rounded-md w-[250px] ${isHovered && 'z-[50]'}`}>
                              <p className="text-sm px-5 font-normal text-[#77858F] mb-1 text-start w-full block">
                                {convertToJapaneseDateRange(
                                  dataDetailDate?.startDate as string,
                                  dataDetailDate?.endDate as string,
                                )}
                              </p>
                              <div className="max-h-[250px] overflow-y-auto px-5">
                                {dataDetail?.tags.map((tag, cateIndex) => {
                                  const tagItem = tableData.find(
                                    (itemFind) => itemFind.tagId === tag.tagId,
                                  );
                                  return (
                                    <div
                                      key={cateIndex}
                                      className="flex items-baseline gap-1.5">
                                      <div
                                        className="w-3 h-3 rounded-sm"
                                        style={{
                                          backgroundColor: lightenColor(
                                            '#2E9267' as string,
                                            Number(tagItem?.tagPercent || 0),
                                          ),
                                        }}
                                      />
                                      <div className="flex flex-grow items-baseline justify-between text-base font-medium w-full">
                                        <div className=" text-black w-[calc(100%_-_60px)] max-w-[calc(100%_-_60px)] line-clamp-3 break-all text-left">
                                          {tag.tagName}
                                        </div>
                                        <p className="w-[50px] text-right">
                                          {tag.percent}%
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
            {isLoadingStatisticTagPercentChartList ? (
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
        </>
      )}
    </div>
  );
};
export default StackedAreaChart;
