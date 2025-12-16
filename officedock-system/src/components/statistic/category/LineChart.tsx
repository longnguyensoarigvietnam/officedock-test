import React, { useContext, useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import Image from 'next/image';
import { Line } from 'react-chartjs-2';
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
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import ImageRound from '@components/common/ImageRound';
import Dropdown from '@components/common/Dropdown';
import { Table, TableBody } from '@components/common/Table';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { MyDockLineChartTooltip } from '@components/tooltip/MyDockLineChartTooltip';
import StatisticLineChartTableSkeleton from '@components/common/SkeletonLoading/StatisticLineChartTableSkeleton';

import { StatisticStateContext } from '@providers/StatisticProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import { TooltipDiv } from '@interfaces/tooltip';
import {
  MyDockLineChartTableItem,
  StatisticsAllTeamTaskDuration,
  StatisticsCategories,
  StatisticsTaskDuration,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { SortingType, StatisticViewOptions } from '@constants/enums';
import {
  ALL_TEAM_STATISTIC,
  DEFAULT_TIME_TEXT,
  STATISTIC_CHART_VIEW_OPTIONS,
} from '@constants';

import {
  convertDurationToTotalMinutes,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
  totalDurationsForStatistic,
} from '@utils/date';
import {
  getLineChartDataFromStatisticAllTeamTaskDurations,
  getLineChartDataFromStatisticTaskDurations,
  getLineChartEnableViews,
  getRandomColor,
  getStatisticMilestones,
  lightenColor,
  normalizeDurationsWithStatisticAllTeamCategoryTaskDurations,
  normalizeDurationsWithStatisticCategoryTaskDurations,
} from '@utils';

import FilterStatistic from './filter/FilterStatistic';

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

ChartJS.defaults.font.family = 'Noto Sans JP, sans-serif';
ChartJS.defaults.font.size = 14;
ChartJS.defaults.font.weight = 'bold';
ChartJS.defaults.color = '#77858F';

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

const LineChart = ({
  statisticCategoryList,
  startDate,
  endDate,
  statisticTaskDurationsList,
  statisticAllTeamTaskDurationsList,
  isFetchingStatisticTaskDurationsList,
  isFetchingStatisticAllTeamTaskDurationsList,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  const {
    isDisableCalendar,
    isHasLoading,
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    lineChartViewBy,
    setLineChartViewBy,
  } = useContext(StatisticStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [lineChartData, setLineChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: { x: any; y: number; endDate: any; color?: any; label: any }[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      tension: number;
      pointRadius: number;
      pointBorderColor: string;
      pointHoverRadius: number;
      pointHoverBackgroundColor: string;
      pointHoverBorderColor: string;
      pointHoverBorderWidth: number;
    }[];
  }>({
    labels: [],
    datasets: [],
  });
  const [tableData, setTableData] = useState<MyDockLineChartTableItem[]>([]);
  const [totalDuration, setTotalDuration] = useState<string>(DEFAULT_TIME_TEXT);

  const [standardLabelsInfo, setStandardLabelsInfo] = useState<
    {
      color: string;
      name: string;
    }[]
  >([]);
  const { expanded } = useContext(GlobalStateContext);

  // Sorting
  const [percentageSortingStatus, setPercentageSortingStatus] =
    useState<string>('');
  const [durationSortingStatus, setDurationSortingStatus] =
    useState<string>('');

  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Hide tooltip when mouse leave over 80px
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl || tooltipEl.style.opacity === '0') {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        return;
      }

      const rect = tooltipEl.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const distance = Math.max(
        rect.left - mouseX,
        mouseX - rect.right,
        rect.top - mouseY,
        mouseY - rect.bottom,
        0,
      );
      if (distance > 80) {
        if (!hideTimeout) {
          hideTimeout = setTimeout(() => {
            if (tooltipRef.current) {
              tooltipRef.current.style.display = 'none';
            }
            hideTimeout = null;
          }, 250); // delay before hiding tooltip
        }
      } else {
        // Mouse came back within 80px: cancel hide
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const externalTooltipHandler = (context: any) => {
    const tooltipModel = context.tooltip;
    const tooltipEl = tooltipRef.current as TooltipDiv;

    if (!tooltipEl || !tooltipModel) return;

    if (!tooltipModel.dataPoints || tooltipModel.dataPoints.length === 0) {
      tooltipEl.style.display = 'none';
      return;
    }

    // Extract necessary data safely
    const dataIndex = tooltipModel.dataPoints[0]?.dataIndex;
    const datasetIndex = tooltipModel.dataPoints[0]?.datasetIndex;
    const dataset = context.chart.data.datasets[datasetIndex];

    if (!dataset?.data || dataIndex === undefined) {
      tooltipEl.style.display = 'none';
      return;
    }

    // Hide tooltip for the last data point
    if (dataIndex === dataset.data.length - 1) {
      tooltipEl.style.display = 'none';
      return;
    }

    const dataPoint = tooltipModel.dataPoints[0]?.raw;
    if (!dataPoint) {
      tooltipEl.style.display = 'none';
      return;
    }

    // Extract dataset label safely
    const matchingDataPoints = Array.from(
      lineChartData.datasets
        .flatMap((d) => d.data)
        .filter(
          (point: any) => point.x === dataPoint.x && point.y === dataPoint.y,
        ),
    );

    if (!tooltipEl._reactRoot) {
      tooltipEl._reactRoot = ReactDOM.createRoot(tooltipEl);
    }
    tooltipEl._reactRoot.render(
      <MyDockLineChartTooltip data={matchingDataPoints} />,
    );

    const { offsetLeft, offsetTop } = context.chart.canvas;
    tooltipEl.style.left = `${offsetLeft + tooltipModel.caretX - 60}px`;
    tooltipEl.style.top = `${offsetTop + tooltipModel.caretY + 10}px`;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.display = 'block';
    tooltipEl.style.zIndex = '9999';
    tooltipEl.style.pointerEvents = 'auto';
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    chart: {
      fontFamily: 'Noto Sans JP, sans-serif',
    },
    plugins: {
      legend: {
        display: false, // Hides the legend
      },
      tooltip: {
        enabled: false, // Disable default tooltip
        position: 'nearest',
        external: externalTooltipHandler,
      },
      datalabels: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 4, // Adjust actual point size
        hitRadius: 20, // Increase hover detection area
        hoverRadius: 8, // Increase the highlight effect
      },
    },
    datasets: {
      line: {
        clip: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#77858F',
          font: {
            size: 14,
            weight: 500,
            family: 'Noto Sans JP, sans-serif',
          },
          padding: 15,
          callback: function (this: { chart: any }, index: number) {
            const chart = this.chart;
            const labels = chart.data.labels as string[];

            if (!labels || index >= labels.length) return '';

            const isEdge = index === 0 || index === labels.length - 1;
            const labelDate = new Date(labels[index]);
            const currentMonth = labelDate.getMonth();

            // Add extra spaces to reduce gap for first & last labels
            if (lineChartViewBy?.value != StatisticViewOptions.MONTH)
              return convertToStatisticJapaneseLabels(
                labels[index],
                lineChartViewBy?.value as string,
                isEdge,
              );
            // Logic for MONTH view
            let sameMonthAsNeighbor = false;

            if (index === 0 && labels.length > 1) {
              const nextMonth = new Date(labels[1]).getMonth();
              sameMonthAsNeighbor = currentMonth === nextMonth;
            } else if (index === labels.length - 1 && labels.length > 1) {
              const prevMonth = new Date(labels[labels.length - 2]).getMonth();
              sameMonthAsNeighbor = currentMonth === prevMonth;
            }

            return convertToStatisticJapaneseLabels(
              labels[index],
              lineChartViewBy?.value as string,
              isEdge && sameMonthAsNeighbor,
            );
          },
        },
      },
      y: {
        position: 'right',
        min: 0,
        ticks: {
          color: '#77858F',
          font: {
            size: 14,
            weight: 500,
            family: 'Noto Sans JP, sans-serif',
          },
          padding: 15,
          stepSize: 10,
        },
      },
    },
  };

  useEffect(() => {
    if (
      statisticTaskDurationsList &&
      selectedOrganization?.value != ALL_TEAM_STATISTIC
    ) {
      const color =
        statisticCategoryList?.largeCategories?.find(
          (item) => item.categoryId === selectedLarge?.value,
        )?.categoryColor || '';

      const standardLabels: { name: string; color: string }[] = [];
      const tableDetail: MyDockLineChartTableItem[] = [];
      const totalDurationList: string[] = [];

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
            id: data.categoryId as number,
            name: data.categoryName,
            duration: data.duration,
            percent: String(data?.percent || 0),
            color:
              data.categoryColor ||
              (color && lightenColor(color, data?.percent || 0)) ||
              getRandomColor(),
          });

          standardLabels.push({
            color:
              data.categoryColor ||
              (color && lightenColor(color, data?.percent || 0)) ||
              getRandomColor(),
            name: data.categoryName,
          });

          totalDurationList.push(data.duration);
        });

        setTableData(tableDetail);
        setStandardLabelsInfo(standardLabels);
        setTotalDuration(totalDurationsForStatistic(totalDurationList));
      } else {
        setTableData([]);
        setStandardLabelsInfo([]);
        setTotalDuration(DEFAULT_TIME_TEXT);
      }

      if (
        normalizeDataObject.durations &&
        normalizeDataObject.durations?.length > 0
      ) {
        const { labelList, datasetMap } =
          getLineChartDataFromStatisticTaskDurations({
            normalizeDataObject,
            color,
          });

        setLineChartData({
          labels: labelList,
          datasets: Array.from(datasetMap.values()),
        });
      } else {
        setLineChartData({
          labels: [],
          datasets: [],
        });
      }
    }
  }, [
    statisticTaskDurationsList,
    statisticCategoryList,
    selectedOrganization,
    selectedLarge,
  ]);

  useEffect(() => {
    if (
      statisticAllTeamTaskDurationsList &&
      selectedOrganization?.value == ALL_TEAM_STATISTIC
    ) {
      const color =
        statisticCategoryList?.largeCategories?.find(
          (item) => item.categoryId === selectedLarge?.value,
        )?.categoryColor || '';

      const standardLabels: { name: string; color: string }[] = [];
      const tableDetail: MyDockLineChartTableItem[] = [];
      const totalDurationList: string[] = [];

      const normalizeDataObject: StatisticsAllTeamTaskDuration = {
        data: statisticAllTeamTaskDurationsList?.data || [],
        durations: normalizeDurationsWithStatisticAllTeamCategoryTaskDurations({
          durations: statisticAllTeamTaskDurationsList?.durations || [],
          data: statisticAllTeamTaskDurationsList?.data || [],
        }),
      };

      if (normalizeDataObject?.data && normalizeDataObject?.data?.length > 0) {
        normalizeDataObject.data.forEach((data) => {
          tableDetail.push({
            id: data.organizationId,
            name: data.organizationName,
            duration: data.duration,
            percent: String(data?.percent || 0),
            color:
              data.color ||
              (color && lightenColor(color, data?.percent || 0)) ||
              getRandomColor(),
          });

          standardLabels.push({
            color:
              data.color ||
              (color && lightenColor(color, data?.percent || 0)) ||
              getRandomColor(),
            name: data.organizationName,
          });

          totalDurationList.push(data.duration);
        });

        setTableData(tableDetail);
        setStandardLabelsInfo(standardLabels);
        setTotalDuration(totalDurationsForStatistic(totalDurationList));
      } else {
        setTableData([]);
        setStandardLabelsInfo([]);
        setTotalDuration(DEFAULT_TIME_TEXT);
      }

      if (
        normalizeDataObject.durations &&
        normalizeDataObject.durations?.length > 0
      ) {
        const { labelList, datasetMap } =
          getLineChartDataFromStatisticAllTeamTaskDurations({
            normalizeDataObject,
            color,
          });
        setLineChartData({
          labels: labelList,
          datasets: Array.from(datasetMap.values()),
        });
      } else {
        setLineChartData({
          labels: [],
          datasets: [],
        });
      }
    }
  }, [
    statisticAllTeamTaskDurationsList,
    statisticCategoryList,
    selectedOrganization,
    selectedLarge,
  ]);

  const sortByPercentDifference = (
    data: MyDockLineChartTableItem[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAPercentage = Number(rowA.percent || 0);
      const rowBPercentage = Number(rowB.percent || 0);

      return sortingType == SortingType.ASC
        ? rowAPercentage - rowBPercentage
        : rowBPercentage - rowAPercentage;
    });
    setTableData(sortedArr);
  };

  const sortByDurationDifference = (
    data: MyDockLineChartTableItem[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowADuration = convertDurationToTotalMinutes(
        rowA.duration || DEFAULT_TIME_TEXT,
      );
      const rowBDuration = convertDurationToTotalMinutes(
        rowB.duration || DEFAULT_TIME_TEXT,
      );

      return sortingType == SortingType.ASC
        ? rowADuration - rowBDuration
        : rowBDuration - rowADuration;
    });
    setTableData(sortedArr);
  };

  const columns: ColumnDef<MyDockLineChartTableItem>[] = [
    {
      accessorKey: 'name',
      header: () => {
        return (
          <div className="font-medium px-[18px] text-[16px] break-all line-clamp-3 text-left text-black flex gap-2 items-center">
            <div
              style={{ backgroundColor: '#228CDB' }}
              className={`w-4 h-4 rounded-[3px] flex items-center justify-center`}>
              <ImageRound
                name="Check task"
                src={'/icons/check-task.svg'}
                className="w-[10px] h-2 cursor-default"
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
              style={{ backgroundColor: info.row.original.color }}
              className={`w-4 h-4 min-w-[16px] rounded-[3px] flex items-center justify-center`}>
              <ImageRound
                name="Check task"
                src={'/icons/check-task.svg'}
                className="w-[10px] h-2 cursor-default"
              />
            </div>{' '}
            <p className="break-words max-w-[calc(100%_-_20px)]">{value}</p>{' '}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'duration',
      size: 43,
      header: () => {
        return (
          <div
            className="flex gap-6 items-center justify-between px-[14px] cursor-pointer"
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
          <div className="font-medium flex text-[14px] justify-center text-black">
            <p>{value.split(':')[0] || 0}時間</p>
            <p>{value.split(':')[1] || 0}分</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'percent',
      size: 27,
      header: () => {
        return (
          <div
            className="flex gap-2 items-center justify-between px-[14px] cursor-pointer"
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

  const getDisableViews = () => {
    const allViews = [
      StatisticViewOptions.DAY,
      StatisticViewOptions.WEEK,
      StatisticViewOptions.MONTH,
    ];

    const enabledViews = getLineChartEnableViews(startDate, endDate as Date);

    return allViews.filter((view) => !enabledViews.includes(view));
  };

  return (
    <div
      style={{
        boxShadow: '0px 4px 10px 0px #0000000D',
      }}
      className="p-[30px] bg-[#F8FAFC] mt-5 rounded-[30px]">
      {/* Header & sort */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-x-5">
          <div className="flex items-center gap-[10px] w-fit flex-shrink-0">
            <ImageRound
              className={`w-fit h-fit hover:cursor-pointer relative`}
              name="statistic line chart icon"
              src={`/icons/statistic-line-chart.svg`}
            />
            <span className="text-black w-fit flex-shrink-0 font-semibold text-[18px]">
              期間における時間の推移
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
        <div>
          {/* Line */}
          <div className="w-full border-t border-[#D2DBE1] my-[30px]"></div>
          <div>
            <div className="flex  justify-between px-[30px] text-sm font-medium">
              {/* Column Chart 1 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value == '' && selectedMedium?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value != '' && selectedMedium?.value == '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
                    disabled={selectedOrganization?.value == '' || isHasLoading}
                  />
                </div>
              </div>
              {/* Column Chart 3 */}
              <div className="w-[300px] flex flex-col items-center">
                <div
                  className={`${selectedOrganization?.value != '' && selectedLarge?.value != '' && selectedMedium?.value != '' ? 'text-white bg-[#3CABF3]' : 'text-[#77858F] bg-[#fff] border-[#77858F] border-[1px]'} rounded-[100px] w-[112px] h-[34px] text-sm flex justify-center items-center`}>
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
          {(isFetchingStatisticTaskDurationsList &&
            selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
          (isFetchingStatisticAllTeamTaskDurationsList &&
            selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[395px] w-[calc(100%_-_60px)] mx-auto`}
            />
          ) : (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line
                data={{
                  datasets: lineChartData?.datasets || [],
                  labels: lineChartData?.labels.length
                    ? lineChartData?.labels
                    : getStatisticMilestones(
                        `${formatDateToYMD(startDate)}`,
                        `${formatDateToYMD(endDate || '')}`,
                        lineChartViewBy?.value as StatisticViewOptions,
                      ),
                }}
                options={options}
              />
              <div
                ref={tooltipRef}
                style={{ position: 'absolute', opacity: 0 }}
              />
            </div>
          )}

          <div className="px-[30px]">
            {(!isFetchingStatisticTaskDurationsList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (!isFetchingStatisticAllTeamTaskDurationsList &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <div className="flex gap-8 items-center justify-end flex-wrap">
                {standardLabelsInfo.map((label, index) => {
                  return (
                    <div key={index} className="flex gap-1 items-center">
                      <div
                        className="w-6 h-1"
                        style={{ backgroundColor: label.color }}></div>
                      <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
                        {label.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <></>
            )}

            {(isFetchingStatisticTaskDurationsList &&
              selectedOrganization?.value != ALL_TEAM_STATISTIC) ||
            (isFetchingStatisticAllTeamTaskDurationsList &&
              selectedOrganization?.value == ALL_TEAM_STATISTIC) ? (
              <StatisticLineChartTableSkeleton />
            ) : (
              <Table
                className={`border border-[#D2DBE1] !ring-0 bg-white !pt-0 py-0 mt-5 rounded-[10px] ${tableData.length && 'max-h-[500px] overflow-y-auto'}`}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="sticky top-0 z-10 text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
                      {headerGroup.headers.map((header, index) => (
                        <th
                          key={header.id}
                          className={`py-2.5  ${index !== 0 ? 'border-l' : ''}`}
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
export default LineChart;
