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

import { StatisticStateContext } from '@providers/StatisticProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import {
  StatisticsCategories,
  StatisticsTaskDuration,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import {
  SortingType,
  StatisticChartType,
  StatisticViewOptions,
} from '@constants/enums';
import { DEFAULT_TIME_TEXT, STATISTIC_CHART_VIEW_OPTIONS } from '@constants';

import useStatisticTaskDurationsCompare from '@hooks/useStatisticTaskDurationsCompare';
import useStatisticTaskDurations from '@hooks/useStatisticTaskDurations';

import {
  convertDurationToTotalMinutes,
  convertTimeToDecimal,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
  formatShowStatisticTask,
  getCategoryFormattedDate,
  getJapaneseDayName,
  subtractDurations,
} from '@utils/date';
import {
  getCompareLineChartEnableViews,
  getRandomColor,
  getSafeTooltipLeft,
  getStatisticMilestones,
  lightenColor,
} from '@utils';
import { TooltipDiv } from '@interfaces/tooltip';
import { MyDockCompareLineChartTooltip } from '@components/tooltip/MyDockCompareLineChartTooltip';
import FilterStatistic from '../filter/FilterStatistic';

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
  startDateCompare: Date;
  endDateCompare: Date | null;
  statisticCategoryList: StatisticsCategories | undefined;
  statisticCategoryCompareList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

type TableCategoryItem = {
  categoryId: number | null;
  categoryName: string;
  categoryDuration: string;
  categoryPercent: string;
  categoryColor: string;
  type: StatisticChartType.STANDARD | StatisticChartType.COMPARE;
};

type MergedTableCategory = {
  categoryId: number | null;
  categoryName: string;
  categoryColor: string;
  standardInfo?: {
    categoryDuration: string;
    categoryPercent: string;
  };
  compareInfo?: {
    categoryDuration: string;
    categoryPercent: string;
  };
};

const LineChartCompare = ({
  statisticCategoryList,
  statisticCategoryCompareList,
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  const {
    isHasLoading,
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    totalDurationTaskCompare,
    totalDurationTask,
    lineChartViewBy,
    setLineChartViewBy,
  } = useContext(StatisticStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [lineChartData, setLineChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      tension: number;
      borderDash: any;
    }[];
  }>({
    labels: [],
    datasets: [],
  });
  const [tableData, setTableData] = useState<MergedTableCategory[]>([]);
  const [standardLabelsInfo, setStandardLabelsInfo] = useState<
    {
      color: string;
      name: string;
    }[]
  >([]);
  const [comparedLabelsInfo, setComparedLabelsInfo] = useState<
    {
      color: string;
      name: string;
    }[]
  >([]);
  const [standardDateLabels, setStandardDateLabels] = useState<string[]>([]);
  const [compareDateLabels, setCompareDateLabels] = useState<string[]>([]);
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

    const dataPoint = tooltipModel.dataPoints[0]?.raw;
    if (!dataPoint) {
      tooltipEl.style.display = 'none';
      return;
    }

    // Hide tooltip for the last data point
    if (tooltipModel.dataPoints[0]?.raw.x === lineChartData.labels.at(-1)) {
      tooltipEl.style.display = 'none';
      return;
    }

    const matchingDataPoints = Array.from(
      new Map(
        lineChartData.datasets
          .flatMap((d) => d.data)
          .filter(
            (point: any) => point.x === dataPoint.x && point.y === dataPoint.y,
          )
          .map((point: any) => [
            `${point.label}-${point.type == StatisticChartType.COMPARE ? `${point.startDate} - ${point.endDate}` : `${point.anotherStartDate} - ${point.anotherEndDate}`}`,
            point,
          ]),
      ).values(),
    );

    if (!tooltipEl._reactRoot) {
      tooltipEl._reactRoot = ReactDOM.createRoot(tooltipEl);
    }
    tooltipEl._reactRoot.render(
      <MyDockCompareLineChartTooltip data={matchingDataPoints} />,
    );

    const { offsetLeft, offsetTop } = context.chart.canvas;

    const left = getSafeTooltipLeft({
      offsetLeft,
      caretX: tooltipModel.caretX,
      tooltipWidth: 250,
    });

    tooltipEl.style.left = `${left - 30}px`;
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
          },
          padding: 15,
          callback: function (this: { chart: any }, index: number) {
            const chart = this.chart;
            const labels = chart.data.labels as string[];

            if (!labels || index >= labels.length) return '';

            return isNaN(labels[index] as any)
              ? convertToStatisticJapaneseLabels(
                  labels[index],
                  lineChartViewBy?.value as string,
                  false,
                )
              : '';
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
          },
          padding: 15,
          stepSize: 10,
        },
      },
    },
  };

  const { statisticTaskDurationsList, isFetchedStatisticTaskDurationsList } =
    useStatisticTaskDurations({
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

  const {
    statisticTaskDurationsCompareList,
    isFetchedStatisticTaskDurationsCompareList,
  } = useStatisticTaskDurationsCompare({
    filter: {
      fromDate: formatDateToYMD(startDateCompare) || '',
      endDate: formatDateToYMD(`${endDateCompare}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: selectedLarge?.value || '',
      mediumCategoryId: selectedMedium?.value || '',
      tagIds: selectedTags,
      statisticBy: lineChartViewBy ? String(lineChartViewBy.value) : '',
    },
  });

  const mergeCategories = (
    data: TableCategoryItem[],
  ): MergedTableCategory[] => {
    const grouped: Record<string, MergedTableCategory> = {};

    data.forEach((item) => {
      const key = item.categoryId ?? 'null'; // Ensure `null` is treated as a string key

      if (!grouped[key]) {
        grouped[key] = {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryColor: item.categoryColor,
        };
      }

      if (item.type === StatisticChartType.STANDARD) {
        grouped[key].standardInfo = {
          categoryDuration: item.categoryDuration,
          categoryPercent: item.categoryPercent,
        };
      } else if (item.type === StatisticChartType.COMPARE) {
        grouped[key].compareInfo = {
          categoryDuration: item.categoryDuration,
          categoryPercent: item.categoryPercent,
        };
      }
    });

    return Object.values(grouped);
  };

  useEffect(() => {
    const color =
      statisticCategoryList && statisticCategoryList.largeCategories
        ? statisticCategoryList?.largeCategories.find(
            (item) => item.categoryId === selectedLarge?.value,
          )?.categoryColor
        : '';

    const datasets: any[] = [];
    let sumStandardDurations: number = 0;
    let sumCompareDurations: number = 0;
    let standardLabels: { name: string; color: string }[] = [];
    let comparedLabels: { name: string; color: string }[] = [];
    let tableDetail: TableCategoryItem[] = [];

    const standardDateLabels = Array.from(
      new Set([
        ...(statisticTaskDurationsList || []).flatMap((category) =>
          category.durations.flatMap((duration, index) =>
            index === category.durations.length - 1 &&
            String(category.durations.at(-1)?.endDate) !==
              String(category.durations.at(-1)?.startDate)
              ? [duration.startDate, duration.endDate]
              : duration.startDate,
          ),
        ),
      ]),
    );
    const compareDateLabels = Array.from(
      new Set([
        ...(statisticTaskDurationsCompareList || []).flatMap((category) =>
          category.durations.flatMap((duration, index) =>
            index === category.durations.length - 1 &&
            String(category.durations.at(-1)?.endDate) !==
              String(category.durations.at(-1)?.startDate)
              ? [duration.startDate, duration.endDate]
              : duration.startDate,
          ),
        ),
      ]),
    );

    const generateDataWithAlignment = (
      durations: any[],
      compareDurations: any[],
      type: string,
      name: string,
      color: string,
    ) => {
      const shownLabels = [...standardDateLabels];
      if (standardDateLabels.length < compareDateLabels.length) {
        const numOfHiddenLabels =
          compareDateLabels.length - standardDateLabels.length;
        for (let i = 0; i < numOfHiddenLabels; i++) {
          shownLabels.push(`${i}`);
        }
      }
      const data = shownLabels
        .map((label, index) => {
          let foundDuration;
          let anotherDuration;
          if (type == StatisticChartType.COMPARE) {
            foundDuration = compareDurations[index];
            anotherDuration = durations[index];
          } else {
            foundDuration = durations[index];
            anotherDuration = compareDurations[index];
          }

          return foundDuration
            ? {
                x: label,
                y: foundDuration.duration
                  ? convertTimeToDecimal(foundDuration.duration)
                  : 0,
                startDate: foundDuration.startDate,
                endDate: foundDuration.endDate,
                duration: foundDuration.duration,
                anotherStartDate: anotherDuration
                  ? anotherDuration.startDate
                  : null,
                anotherEndDate: anotherDuration
                  ? anotherDuration.endDate
                  : null,
                anotherDuration: anotherDuration
                  ? anotherDuration.duration
                  : null,
                type,
                label: name,
                color,
              }
            : null;
        })
        .filter((dataPoint) => dataPoint !== null);

      // Add one more item with the same data as the last one
      if (durations.length > 0 && shownLabels.length > 0) {
        const lastItem = data[data.length - 1];
        if (
          String(durations.at(-1).startDate) != String(durations.at(-1).endDate)
        ) {
          const clonedItem = {
            ...lastItem,
            x: shownLabels.at(-1)!,
          };
          data.push(clonedItem);
        }
      }
      return data;
    };

    if (statisticTaskDurationsList && statisticTaskDurationsList.length > 0) {
      statisticTaskDurationsList.map(
        (categoryDetail: StatisticsTaskDuration) => {
          sumStandardDurations =
            sumStandardDurations +
            convertTimeToDecimal(categoryDetail.duration);
          standardLabels = [
            ...standardLabels,
            {
              color:
                categoryDetail.categoryColor ||
                (color && lightenColor(color, 50)) ||
                getRandomColor(),
              name: categoryDetail.categoryName,
            },
          ];

          tableDetail = [
            ...tableDetail,
            {
              categoryId: categoryDetail.categoryId,
              categoryName: categoryDetail.categoryName,
              categoryDuration: categoryDetail.duration,
              categoryPercent: String(categoryDetail?.percent || 0),
              categoryColor:
                categoryDetail.categoryColor ||
                (color && lightenColor(color, categoryDetail?.percent || 0)) ||
                getRandomColor(),
              type: StatisticChartType.STANDARD,
            },
          ];

          const compareCategory = statisticTaskDurationsCompareList?.find(
            (c) => c.categoryName === categoryDetail.categoryName,
          );

          datasets.push({
            label: categoryDetail.categoryName,
            data: generateDataWithAlignment(
              categoryDetail.durations,
              compareCategory?.durations ?? [],
              StatisticChartType.STANDARD,
              categoryDetail.categoryName,
              categoryDetail.categoryColor ||
                (color && lightenColor(color, categoryDetail?.percent || 0)) ||
                getRandomColor(),
            ),
            borderColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, categoryDetail?.percent || 0)) ||
              getRandomColor(),
            backgroundColor: 'transparent',
            borderDash: [],
            fill: true,
            tension: 0,
            pointRadius: 4,
            pointBorderColor: 'transparent',
            pointHoverRadius: 6,
            pointHoverBackgroundColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, 50)) ||
              getRandomColor(),
            pointHoverBorderColor: 'transparent',
            pointHoverBorderWidth: 2,
          });
        },
      );
    }
    if (
      statisticTaskDurationsCompareList &&
      statisticTaskDurationsCompareList.length > 0
    ) {
      statisticTaskDurationsCompareList.map(
        (categoryDetail: StatisticsTaskDuration) => {
          sumCompareDurations =
            sumCompareDurations + convertTimeToDecimal(categoryDetail.duration);
          comparedLabels = [
            ...comparedLabels,
            {
              color:
                categoryDetail.categoryColor ||
                (color && lightenColor(color, 50)) ||
                getRandomColor(),
              name: categoryDetail.categoryName,
            },
          ];

          tableDetail.push({
            categoryId: categoryDetail.categoryId,
            categoryName: categoryDetail.categoryName,
            categoryDuration: categoryDetail.duration,
            categoryPercent: String(categoryDetail?.percent || 0),
            categoryColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, categoryDetail?.percent || 0)) ||
              getRandomColor(),
            type: StatisticChartType.COMPARE,
          });

          const standardCategory = statisticTaskDurationsList?.find(
            (c) => c.categoryName === categoryDetail.categoryName,
          );

          datasets.push({
            label: categoryDetail.categoryName,
            data: generateDataWithAlignment(
              standardCategory?.durations ?? [],
              categoryDetail.durations,
              StatisticChartType.COMPARE,
              categoryDetail.categoryName,
              categoryDetail.categoryColor ||
                (color && lightenColor(color, categoryDetail?.percent || 0)) ||
                getRandomColor(),
            ),
            borderColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, categoryDetail?.percent || 0)) ||
              getRandomColor(),
            backgroundColor: 'transparent',
            borderDash: [3, 3],
            fill: true,
            tension: 0,
            pointRadius: 4,
            pointBorderColor: 'transparent',
            pointHoverRadius: 6,
            pointHoverBackgroundColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, categoryDetail?.percent || 0)) ||
              getRandomColor(),
            pointHoverBorderColor: 'transparent',
            pointHoverBorderWidth: 2,
          });
        },
      );
    }
    setStandardLabelsInfo(standardLabels);
    setComparedLabelsInfo(comparedLabels);
    setStandardDateLabels(standardDateLabels);
    setCompareDateLabels(compareDateLabels);
    setLineChartData({
      labels: standardDateLabels,
      datasets: datasets || [],
    });

    setTableData(mergeCategories(tableDetail) || []);
  }, [
    statisticTaskDurationsList,
    statisticTaskDurationsCompareList,
    statisticCategoryList,
    statisticCategoryCompareList,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
  ]);

  const sortByPercentDifference = (
    data: MergedTableCategory[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAStandard = Number(rowA.standardInfo?.categoryPercent || 0);
      const rowACompare = Number(rowA.compareInfo?.categoryPercent || 0);
      const rowBStandard = Number(rowB.standardInfo?.categoryPercent || 0);
      const rowBCompare = Number(rowB.compareInfo?.categoryPercent || 0);

      const rowADiff = rowAStandard - rowACompare;
      const rowBDiff = rowBStandard - rowBCompare;

      return sortingType == SortingType.ASC
        ? rowADiff - rowBDiff
        : rowBDiff - rowADiff;
    });
    setTableData(sortedArr);
  };

  const sortByDurationDifference = (
    data: MergedTableCategory[],
    sortingType: string,
  ) => {
    const sortedArr = data.slice().sort((rowA, rowB) => {
      const rowAStandard = convertDurationToTotalMinutes(
        rowA.standardInfo?.categoryDuration || DEFAULT_TIME_TEXT,
      );
      const rowACompare = convertDurationToTotalMinutes(
        rowA.compareInfo?.categoryDuration || DEFAULT_TIME_TEXT,
      );
      const rowADiff = rowAStandard - rowACompare;

      const rowBStandard = convertDurationToTotalMinutes(
        rowB.standardInfo?.categoryDuration || DEFAULT_TIME_TEXT,
      );
      const rowBCompare = convertDurationToTotalMinutes(
        rowB.compareInfo?.categoryDuration || DEFAULT_TIME_TEXT,
      );
      const rowBDiff = rowBStandard - rowBCompare;

      return sortingType == SortingType.ASC
        ? rowADiff - rowBDiff
        : rowBDiff - rowADiff;
    });
    setTableData(sortedArr);
  };

  const columns: ColumnDef<MergedTableCategory>[] = [
    {
      accessorKey: 'categoryName',
      header: () => {
        return (
          <div className="font-medium px-3 text-[16px] break-all line-clamp-3 text-left text-black flex gap-2 items-center">
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
          <div className="flex gap-2 !px-3 items-start">
            <div
              style={{ backgroundColor: info.row.original.categoryColor }}
              className={`w-4 h-4 min-w-4 rounded-[3px] flex items-center justify-center mt-1`}>
              <ImageRound
                name="Check task"
                src={'/icons/check-task.svg'}
                className="w-[10px] h-2"
              />
            </div>
            <div className="flex flex-col items-start gap-2 w-[calc(100%_-20px)]">
              <p className="font-medium text-[16px] truncate text-black !max-w-[calc(100%_-_40px)]">
                {' '}
                {value}{' '}
              </p>
              <div className="font-normal text-sm text-[#000000] flex items-center gap-[1px] w-full border-b-[1px] border-[#D2DBE1] pb-1">
                <p>
                  {startDate && getCategoryFormattedDate(startDate)}(
                  {getJapaneseDayName(String(startDate))})
                </p>
                ~
                <p>
                  {endDate && getCategoryFormattedDate(endDate)}(
                  {getJapaneseDayName(String(endDate))})
                </p>
              </div>
              <div className="font-normal text-sm text-[#000000] flex items-center gap-[1px] w-full border-b-[1px] border-[#D2DBE1] pb-1">
                <p>
                  {startDateCompare &&
                    getCategoryFormattedDate(startDateCompare)}
                  ({getJapaneseDayName(String(startDateCompare))})
                </p>
                ~
                <p>
                  {endDateCompare && getCategoryFormattedDate(endDateCompare)}(
                  {getJapaneseDayName(String(endDateCompare))})
                </p>
              </div>
              <p className="font-normal text-sm text-[#000000]">比較</p>
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
        return (
          <div className="flex flex-col px-3 gap-2 w-full">
            <div className="h-[22px]"></div>
            <div className="font-medium flex text-[14px] justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              <p>
                {info.row.original.standardInfo?.categoryDuration.split(
                  ':',
                )[0] || '00'}
                時間
              </p>
              <p>
                {info.row.original.standardInfo?.categoryDuration.split(
                  ':',
                )[1] || '00'}
                分
              </p>
            </div>
            <div className="font-medium flex text-[14px] justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              <p>
                {info.row.original.compareInfo?.categoryDuration.split(
                  ':',
                )[0] || '00'}
                時間
              </p>
              <p>
                {info.row.original.compareInfo?.categoryDuration.split(
                  ':',
                )[1] || '00'}
                分
              </p>
            </div>
            <div className="font-medium flex text-[14px] justify-end text-black">
              <p>
                {subtractDurations(
                  info.row.original.standardInfo?.categoryDuration ||
                    DEFAULT_TIME_TEXT,
                  info.row.original.compareInfo?.categoryDuration ||
                    DEFAULT_TIME_TEXT,
                )}
              </p>
            </div>
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
        const standardPercent =
          Number(info.row.original.standardInfo?.categoryPercent) || 0;
        const comparePercent =
          Number(info.row.original.compareInfo?.categoryPercent) || 0;
        const difference = standardPercent - comparePercent;

        return (
          <div className="flex flex-col px-3 gap-2 w-full">
            <div className="h-[22px]"></div>
            <p className="font-medium flex text-[14px] justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              {standardPercent}%
            </p>
            <p className="font-medium flex text-[14px] justify-end text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              {comparePercent}%
            </p>
            <p className="font-medium flex text-[14px] justify-end text-black">
              {difference}%
            </p>
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

    const enabledViews = getCompareLineChartEnableViews(
      startDate,
      endDate as Date,
      startDateCompare,
      endDateCompare as Date,
    );

    return allViews.filter((view) => !enabledViews.includes(view));
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
            <span className="text-black w-[210px] flex-shrink-0 font-semibold text-[18px] relative top-[2px]">
              期間における時間の推移
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
        <>
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
                    disabled={!selectedOrganization || isHasLoading}
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
                    disabled={!selectedLarge || isHasLoading}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 px-[30px]">
            <div className="flex justify-between w-full mb-4">
              <div>
                {startDate && endDate && (
                  <div className="flex items-center mb-3 gap-2">
                    <p className="bg-[#EBF1F7] w-[57px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                      基準期間
                    </p>
                    <div className="text-black text-xs font-normal flex items-center gap-[1px]">
                      <p>
                        {startDate && formatShowStatisticTask(startDate)}(
                        {getJapaneseDayName(String(startDate))})
                      </p>
                      ~
                      <p>
                        {endDate && formatShowStatisticTask(endDate)}(
                        {getJapaneseDayName(String(endDate))})
                      </p>
                    </div>
                    <p className="font-medium text-[16px]">
                      合計 {totalDurationTask?.split(':')[0] || '00'}時間
                      {totalDurationTask?.split(':')[1] || '00'}分
                    </p>
                  </div>
                )}
                {startDateCompare && endDateCompare && (
                  <div className="flex items-center mb-3 gap-2">
                    <p className="bg-[#F9EAEA] w-[57px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                      比較期間
                    </p>
                    <div className="text-black text-xs font-normal flex items-center gap-[1px]">
                      <p>
                        {startDateCompare &&
                          formatShowStatisticTask(startDateCompare)}
                        ({getJapaneseDayName(String(startDateCompare))})
                      </p>
                      ~
                      <p>
                        {endDateCompare &&
                          formatShowStatisticTask(endDateCompare)}
                        ({getJapaneseDayName(String(endDateCompare))})
                      </p>
                    </div>
                    <p className="font-medium text-[16px]">
                      合計 {totalDurationTaskCompare?.split(':')[0] || '00'}時間
                      {totalDurationTaskCompare?.split(':')[1] || '00'}分
                    </p>
                  </div>
                )}
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
          {isFetchedStatisticTaskDurationsList &&
          isFetchedStatisticTaskDurationsCompareList ? (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line
                key={standardDateLabels.join('-') + compareDateLabels.join('-')}
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
          ) : (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[395px] w-[calc(100%_-_60px)] mx-auto`}
            />
          )}

          <div className="px-[30px]">
            {isFetchedStatisticTaskDurationsList &&
              isFetchedStatisticTaskDurationsCompareList && (
                <>
                  <div className="flex gap-8 items-center justify-end flex-wrap mb-3">
                    <p className="bg-[#EBF1F7] w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                      基準
                    </p>
                    {standardLabelsInfo.map((label, index) => {
                      return (
                        <div key={index} className="flex gap-1 items-center">
                          <div
                            className="w-8 h-1"
                            style={{ backgroundColor: label.color }}></div>
                          <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
                            {label.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-8 items-center justify-end flex-wrap">
                    <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                      比較
                    </p>
                    {comparedLabelsInfo.map((label, index) => {
                      return (
                        <div key={index} className="flex gap-1 items-center">
                          <div
                            className="w-8 h-1 border-t-2 border-dashed"
                            style={{ borderColor: label.color }}></div>
                          <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
                            {label.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

            {isFetchedStatisticTaskDurationsList &&
            isFetchedStatisticTaskDurationsCompareList ? (
              <Table
                className={`w-full border border-gray-300 mt-5 rounded-md ${tableData.length && 'max-h-[500px] overflow-y-auto'}`}>
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
            ) : (
              <RowSkeleton
                numberOfRows={1}
                className={`!h-[200px] mt-5 w-full mx-auto`}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default LineChartCompare;
