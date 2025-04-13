import React, { useContext, useEffect, useRef, useState } from 'react';
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
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Dropdown from '@components/common/Dropdown';

import { StatisticStateContext } from '@providers/StatisticProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import {
  StatisticsCategories,
  StatisticsTaskDuration,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { StatisticViewLabels, StatisticViewOptions } from '@constants/enums';

import useStatisticTaskDurationsCompare from '@hooks/useStatisticTaskDurationsCompare';
import useStatisticTaskDurations from '@hooks/useStatisticTaskDurations';

import {
  convertTimeToDecimal,
  convertToJapaneseDateRange,
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
  lightenColor,
} from '@utils';
import { Table, TableBody } from '@components/common/Table';
import RowSkeleton from '@components/skeleton/RowSkeleton';

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
  removeTag: (selected: OptionDropdownType) => void;
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
  type: 'standard' | 'compare';
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
  removeTag,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
}: Props) => {
  const {
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    tagsOptions,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationTaskCompare,
    totalDurationTask,
    lineChartViewBy,
    setSelectedTags,
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

  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    tooltipEl.style.opacity = '0'; // Initially hide
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.transition = 'opacity 0.2s ease-in-out';
  }, []);

  const externalTooltipHandler = (context: any) => {
    const tooltipModel = context.tooltip;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl || !tooltipModel) return;

    if (!tooltipModel.dataPoints || tooltipModel.dataPoints.length === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    // Extract necessary data safely
    const dataIndex = tooltipModel.dataPoints[0]?.dataIndex;
    const datasetIndex = tooltipModel.dataPoints[0]?.datasetIndex;
    const dataset = context.chart.data.datasets[datasetIndex];

    if (!dataset?.data || dataIndex === undefined) {
      tooltipEl.style.opacity = '0';
      return;
    }

    if (tooltipModel.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    const dataPoint = tooltipModel.dataPoints[0]?.raw;
    if (!dataPoint) {
      tooltipEl.style.opacity = '0';
      return;
    }

    // Hide tooltip for the last data point
    if (tooltipModel.dataPoints[0]?.raw.x === lineChartData.labels.at(-1)) {
      tooltipEl.style.opacity = '0';
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
            `${point.label}-${point.type == 'compare' ? `${point.startDate} - ${point.endDate}` : `${point.anotherStartDate} - ${point.anotherEndDate}`}`,
            point,
          ]),
      ).values(),
    );

    const tooltipContent = matchingDataPoints
      .map((point: any) => {
        const standardDuration =
          point.type == 'compare'
            ? point.anotherDuration ?? '00:00:00'
            : point.duration ?? '00:00:00';
        const compareDuration =
          point.type == 'compare'
            ? point.duration ?? '00:00:00'
            : point.anotherDuration ?? '00:00:00';
        const diffDuration = subtractDurations(
          standardDuration || '00:00:00',
          compareDuration || '00:00:00',
        );

        const displayIcon = (diffDuration: string) => {
          if (diffDuration.startsWith('-')) {
            return `<img src="/icons/decrease-icon.svg" alt="Decrease" style="width: 12px; height: 12px;" />`;
          } else if (diffDuration != '00時間00分') {
            return `<img src="/icons/increase-icon.svg" alt="Increase" style="width: 12px; height: 12px;" />`;
          } else {
            return `<img src="/icons/equal-icon.svg" alt="Equal" style="width: 12px; height: 12px;" />`;
          }
        };

        return `
          <div style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #D2DBE1;">
            <div style="
              background-color: ${point.color}; 
              margin-right: 4px; 
              width: 12px; 
              height: 12px; 
              border-radius: 2px;
              min-width: 12px;
            "></div>
            <p style="
              font-weight: 700; 
              font-size: 16px; 
              max-width: 200px;
              white-space: nowrap; 
              overflow: hidden; 
              text-overflow: ellipsis;
            ">
              ${point.label}
            </p>
          </div>  
    
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <p style="
                background-color: #EBF1F7;
                color: #0068B6;
                height: 18px; 
                width: 57px; 
                border-radius: 3px; 
                font-size: 12px; 
                font-weight: 500; 
                display: flex; 
                align-items: center; 
                justify-content: center;
              ">
                基準期間
              </p>
              <div style="color: #77858F; font-weight: 400; font-size: 12px;">
                ${
                  point.type == 'compare'
                    ? point.anotherStartDate
                      ? convertToJapaneseDateRange(
                          point.anotherStartDate as string,
                          point.anotherEndDate as string,
                        )
                      : ''
                    : point.startDate
                      ? convertToJapaneseDateRange(
                          point.startDate as string,
                          point.endDate as string,
                        )
                      : ''
                }
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: end">
            <p style="font-weight: 400; font-size: 16px">
              ${standardDuration.split(':')[0]}時間 
              ${standardDuration.split(':')[1]}分
            </p>
            <div style="display: flex; align-items: center; font-weight: 400; font-size: 14px; color: #77858F; gap: 4px;">
              ${displayIcon(diffDuration)} 
              <span>${diffDuration != '00時間00分' ? diffDuration.replace('-', '') : ''}</span>
            </div>

            </div>
            
    
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <p style="
                background-color: #F9EAEA;
                color: #C32E2E;
                height: 18px; 
                width: 57px; 
                border-radius: 3px; 
                font-size: 12px; 
                font-weight: 500; 
                display: flex; 
                align-items: center; 
                justify-content: center;
              ">
                基準期間
              </p>
              <div style="color: #77858F; font-weight: 400; font-size: 12px;">
                ${
                  point.type == 'compare'
                    ? point.startDate
                      ? convertToJapaneseDateRange(
                          point.startDate as string,
                          point.endDate as string,
                        )
                      : ''
                    : point.anotherStartDate
                      ? convertToJapaneseDateRange(
                          point.anotherStartDate as string,
                          point.anotherEndDate as string,
                        )
                      : ''
                }
              </div>
            </div>
            <p style="font-weight: 400; font-size: 16px; margin-bottom: 8px;">
              ${compareDuration.split(':')[0]}時間 
              ${compareDuration.split(':')[1]}分
            </p>
          </div>
        `;
      })
      .join('');

    tooltipEl.innerHTML = `
      <div style="
        padding: 13px; 
        background: white; 
        border-radius: 8px; 
        box-shadow: 0px 2px 8px 0px #0000001A;
        width: 240px
      ">
        ${tooltipContent}
      </div>
    `;

    const { offsetLeft, offsetTop } = context.chart.canvas;
    tooltipEl.style.left = `${offsetLeft + tooltipModel.caretX - 115}px`;
    tooltipEl.style.top = `${offsetTop + tooltipModel.caretY + 10}px`;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.zIndex = '9999';
    tooltipEl.style.pointerEvents = 'none';
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
        largeCategoryId: Number(selectedLarge?.value),
        mediumCategoryId: Number(selectedMedium?.value),
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
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
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

      if (item.type === 'standard') {
        grouped[key].standardInfo = {
          categoryDuration: item.categoryDuration,
          categoryPercent: item.categoryPercent,
        };
      } else if (item.type === 'compare') {
        grouped[key].compareInfo = {
          categoryDuration: item.categoryDuration,
          categoryPercent: item.categoryPercent,
        };
      }
    });

    return Object.values(grouped);
  };

  useEffect(() => {
    if (statisticTaskDurationsList && statisticTaskDurationsCompareList) {
      const color =
        statisticCategoryList && statisticCategoryList.largeCategories
          ? statisticCategoryList?.largeCategories.find(
              (item) => item.categoryId === selectedLarge?.value,
            )?.categoryColor
          : '';

      let datasets: any[] = [];
      let sumStandardDurations: number = 0;
      let sumCompareDurations: number = 0;
      let standardLabels: { name: string; color: string }[] = [];
      let comparedLabels: { name: string; color: string }[] = [];
      let tableDetail: TableCategoryItem[] = [];

      const standardDateLabels = Array.from(
        new Set([
          ...statisticTaskDurationsList.flatMap((category) =>
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
          ...statisticTaskDurationsCompareList.flatMap((category) =>
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
        alignmentLabels?: string[], // <- optional param
      ) => {
        const shownLabels = [...standardDateLabels];
        if (standardDateLabels.length < compareDateLabels.length) {
          const numOfHiddenLabels =
            compareDateLabels.length - standardDateLabels.length;
          for (let i = 0; i < numOfHiddenLabels; i++) {
            shownLabels.push(`${i}`);
          }
        }
        return shownLabels
          .map((label, index) => {
            const refLabel = alignmentLabels?.[index] || label; // <- map compare's label to standard index
            let foundDuration;
            let anotherDuration;
            if (type == 'compare') {
              foundDuration = compareDurations.find(
                (duration) => duration.startDate == refLabel,
              );
              anotherDuration = durations[index];
            } else {
              foundDuration = durations.find(
                (duration) => duration.startDate == refLabel,
              );
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
      };

      if (statisticTaskDurationsList.length > 0) {
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

            let percent = 0;
            if (
              !selectedLarge?.value &&
              statisticCategoryList?.largeCategories &&
              statisticCategoryList?.largeCategories.length > 0
            ) {
              percent =
                statisticCategoryList?.largeCategories.find(
                  (category) =>
                    category.categoryName == categoryDetail.categoryName,
                )?.percent || 0;
            } else if (
              !selectedMedium?.value &&
              statisticCategoryList?.mediumCategories &&
              statisticCategoryList?.mediumCategories.length > 0
            ) {
              percent = statisticCategoryList?.mediumCategories
                ? statisticCategoryList?.mediumCategories.find(
                    (category) =>
                      category.categoryName == categoryDetail.categoryName,
                  )?.percent || 0
                : 0;
            } else if (
              statisticCategoryList?.smallCategories &&
              statisticCategoryList?.smallCategories.length > 0
            ) {
              percent = statisticCategoryList?.smallCategories
                ? statisticCategoryList?.smallCategories.find(
                    (category) =>
                      category.categoryName == categoryDetail.categoryName,
                  )?.percent || 0
                : 0;
            }

            tableDetail = [
              ...tableDetail,
              {
                categoryId: categoryDetail.categoryId,
                categoryName: categoryDetail.categoryName,
                categoryDuration: categoryDetail.duration,
                categoryPercent: String(percent),
                categoryColor:
                  categoryDetail.categoryColor ||
                  (color && lightenColor(color, percent)) ||
                  getRandomColor(),
                type: 'standard',
              },
            ];

            const compareCategory = statisticTaskDurationsCompareList.find(
              (c) => c.categoryName === categoryDetail.categoryName,
            );

            datasets = [
              ...datasets,
              {
                label: categoryDetail.categoryName,
                data: generateDataWithAlignment(
                  categoryDetail.durations,
                  compareCategory?.durations ?? [],
                  'standard',
                  categoryDetail.categoryName,
                  categoryDetail.categoryColor ||
                    (color && lightenColor(color, percent)) ||
                    getRandomColor(),
                  [],
                ),
                borderColor:
                  categoryDetail.categoryColor ||
                  (color && lightenColor(color, percent)) ||
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
              },
            ];
          },
        );
      }
      if (statisticTaskDurationsCompareList.length > 0) {
        statisticTaskDurationsCompareList.map(
          (categoryDetail: StatisticsTaskDuration) => {
            sumCompareDurations =
              sumCompareDurations +
              convertTimeToDecimal(categoryDetail.duration);
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
            let percent = 0;
            if (
              !selectedLarge?.value &&
              statisticCategoryCompareList?.largeCategories &&
              statisticCategoryCompareList?.largeCategories.length > 0
            ) {
              percent =
                statisticCategoryCompareList?.largeCategories.find(
                  (category) =>
                    category.categoryName == categoryDetail.categoryName,
                )?.percent || 0;
            } else if (
              !selectedMedium?.value &&
              statisticCategoryCompareList?.mediumCategories &&
              statisticCategoryCompareList?.mediumCategories.length > 0
            ) {
              percent = statisticCategoryCompareList?.mediumCategories
                ? statisticCategoryCompareList?.mediumCategories.find(
                    (category) =>
                      category.categoryName == categoryDetail.categoryName,
                  )?.percent || 0
                : 0;
            } else if (
              statisticCategoryCompareList?.smallCategories &&
              statisticCategoryCompareList?.smallCategories.length > 0
            ) {
              percent = statisticCategoryCompareList?.smallCategories
                ? statisticCategoryCompareList?.smallCategories.find(
                    (category) =>
                      category.categoryName == categoryDetail.categoryName,
                  )?.percent || 0
                : 0;
            }

            tableDetail.push({
              categoryId: categoryDetail.categoryId,
              categoryName: categoryDetail.categoryName,
              categoryDuration: categoryDetail.duration,
              categoryPercent: String(percent),
              categoryColor:
                categoryDetail.categoryColor ||
                (color && lightenColor(color, percent)) ||
                getRandomColor(),
              type: 'compare',
            });

            const standardCategory = statisticTaskDurationsList.find(
              (c) => c.categoryName === categoryDetail.categoryName,
            );

            datasets.push({
              label: categoryDetail.categoryName,
              data: generateDataWithAlignment(
                standardCategory?.durations ?? [],
                categoryDetail.durations,
                'compare',
                categoryDetail.categoryName,
                categoryDetail.categoryColor ||
                  (color && lightenColor(color, percent)) ||
                  getRandomColor(),
                compareDateLabels,
              ),
              borderColor:
                categoryDetail.categoryColor ||
                (color && lightenColor(color, percent)) ||
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
                (color && lightenColor(color, percent)) ||
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
    }
  }, [
    statisticTaskDurationsList,
    statisticTaskDurationsCompareList,
    statisticCategoryList,
    statisticCategoryCompareList,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
  ]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'categoryPercent', desc: true },
  ]);

  const handleSortingChange = (updater: any) => {
    setSorting((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next.length === 0 ? [{ id: 'categoryPercent', desc: true }] : next;
    });
  };

  const differenceSorting = (rowA: any, rowB: any) => {
    const standardA = Number(rowA.original.standardInfo?.categoryPercent) || 0;
    const compareA = Number(rowA.original.compareInfo?.categoryPercent) || 0;
    const differenceA = standardA - compareA;

    const standardB = Number(rowB.original.standardInfo?.categoryPercent) || 0;
    const compareB = Number(rowB.original.compareInfo?.categoryPercent) || 0;
    const differenceB = standardB - compareB;

    return differenceA - differenceB;
  };

  const durationSorting = (rowA: any, rowB: any) => {
    const parseDuration = (duration: string) => {
      const [hours, minutes, seconds] = duration.split(':').map(Number);
      return hours * 60 + minutes + seconds / 60; // Convert to total minutes
    };

    const standardA = parseDuration(
      rowA.original.standardInfo?.categoryDuration || '00:00:00',
    );
    const compareA = parseDuration(
      rowA.original.compareInfo?.categoryDuration || '00:00:00',
    );
    const differenceA = standardA - compareA;

    const standardB = parseDuration(
      rowB.original.standardInfo?.categoryDuration || '00:00:00',
    );
    const compareB = parseDuration(
      rowB.original.compareInfo?.categoryDuration || '00:00:00',
    );
    const differenceB = standardB - compareB;

    return differenceA - differenceB;
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
      size: 40,
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div
            className="flex gap-1 items-center justify-center"
            onClick={() => column.toggleSorting(isSorted === 'asc')}>
            <p className="!text-xs font-medium !text-[#77858F]">計測時間</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end ${isSorted == 'asc' && 'rotate-180'} `}
              />
            </div>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: durationSorting,
      cell: (info) => {
        return (
          <div className="flex flex-col pl-2 gap-2 w-full">
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
                    '00:00:00',
                  info.row.original.compareInfo?.categoryDuration || '00:00:00',
                )}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'categoryPercent',
      size: 25,
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={() => column.toggleSorting(isSorted === 'asc')}>
            <p className="!text-xs font-medium !text-[#77858F]">割合</p>
            <div>
              <Image
                src="/icons/sort-down.svg"
                alt="Sort down"
                width={9}
                height={10}
                className={`cursor-pointer justify-self-end ${
                  isSorted === 'asc' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: differenceSorting,
      cell: (info) => {
        const standardPercent =
          Number(info.row.original.standardInfo?.categoryPercent) || 0;
        const comparePercent =
          Number(info.row.original.compareInfo?.categoryPercent) || 0;
        const difference = standardPercent - comparePercent;

        return (
          <div className="flex flex-col pl-2 gap-2 w-full">
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
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    sortingFns: { differenceSorting },
    onSortingChange: handleSortingChange,
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
          <div className="flex items-center gap-2">
            <div className="w-[240px] flex-shrink-0  relative">
              <MultiSelectDropdown
                isShowIconFilter
                options={tagsOptions}
                labelOptionClass="break-all"
                optionClassName="!top-6"
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
          {isFetchedStatisticTaskDurationsList &&
          isFetchedStatisticTaskDurationsCompareList ? (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line
                key={standardDateLabels.join('-') + compareDateLabels.join('-')}
                data={lineChartData}
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
              className={`!h-[395px] ${expanded && 'w-[calc(100%_-_60px)]'} mx-auto`}
            />
          )}

          <div className="px-[30px]">
            {isFetchedStatisticTaskDurationsList &&
              isFetchedStatisticTaskDurationsCompareList && (
                <>
                  <div className="flex gap-8 items-center justify-end flex-wrap">
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

            <Table className="w-full border border-gray-300 mt-5 rounded-md">
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
        </>
      )}
    </div>
  );
};
export default LineChartCompare;
