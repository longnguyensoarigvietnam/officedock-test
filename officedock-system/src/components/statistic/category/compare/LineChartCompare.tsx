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
import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import { StatisticStateContext } from '@providers/StatisticProvider';
import {
  StatisticsCategories,
  StatisticsTaskDuration,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import Dropdown from '@components/common/Dropdown';
import { CalendarViewOptions } from '@constants/enums';
import useStatisticTaskDurations from '@hooks/useStatisticTaskDurations';
import {
  convertFromNumberToJapaneseTime,
  convertTimeToDecimal,
  convertToJapaneseDateRange,
  convertToJapaneseMonthDate,
  formatDateToYMD,
  formatShowStatisticTask,
  getCategoryFormattedDate,
  getJapaneseDayName,
  subtractDurations,
} from '@utils/date';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { getRandomColor, lightenColor } from '@utils';
import useStatisticTaskDurationsCompare from '@hooks/useStatisticTaskDurationsCompare';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

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
    setSelectedTags,
  } = useContext(StatisticStateContext);

  const [isExtendData, setIsExtendData] = useState(true);
  const [viewBy, setViewBy] = useState<OptionDropdownType>({
    value: CalendarViewOptions.VIEW_BY_WEEK,
    label: '週',
  });
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
  const [totalStandardDuration, setTotalStandardDuration] =
    useState<string>('00:00');
  const [totalCompareDuration, setTotalCompareDuration] =
    useState<string>('00:00');
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
  const { expanded } = useContext(GlobalStateContext);

  const viewOptions = [
    {
      value: CalendarViewOptions.VIEW_BY_DAY,
      label: '日',
    },
    {
      value: CalendarViewOptions.VIEW_BY_WEEK,
      label: '週',
    },
    {
      value: CalendarViewOptions.VIEW_BY_MONTH,
      label: '月',
    },
    {
      value: CalendarViewOptions.VIEW_BY_YEAR,
      label: '年',
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

    // Hide tooltip for the last data point
    if (dataIndex === dataset.data.length - 1) {
      tooltipEl.style.opacity = '0';
      return;
    }

    if (tooltipModel.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    // Extract dataset label safely
    const datasetLabel = dataset.label ?? 'Unknown';

    const dataPoint = tooltipModel.dataPoints[0]?.raw;
    if (!dataPoint) {
      tooltipEl.style.opacity = '0';
      return;
    }

    tooltipEl.innerHTML = `
      <div style="
        padding: 13px; 
        background: white; 
        border-radius: 8px; 
        box-shadow: 0px 2px 8px 0px #0000001A;
      ">
        <div style="
          display: flex; 
          align-items: center; 
          margin-bottom: 8px; 
          border-bottom: 1px solid #D2DBE1;
        ">
          <div style="
            background-color: ${dataset.borderColor}; 
            margin-right: 4px; 
            width: 12px; 
            height: 12px; 
            border-radius: 2px;
          "></div>
          <p style="font-weight: 700; font-size: 16px;">${datasetLabel}</p>
        </div>  
  
        <div style="
          display: flex; 
          justify-content: space-between; 
          align-items: center;
        ">
          <p style="
            background-color: ${dataPoint.type === 'standard' ? '#EBF1F7' : '#F9EAEA'};
            color: ${dataPoint.type === 'standard' ? '#0068B6' : '#C32E2E'};
            height: 18px; 
            width: 57px; 
            border-radius: 3px; 
            font-size: 12px; 
            font-weight: 500; 
            display: flex; 
            align-items: center; 
            justify-content: center;
          ">
            ${dataPoint.type === 'standard' ? '基準期間' : '比較期間'}
          </p>
  
          <div style="
            color: #77858F; 
            font-weight: 400; 
            font-size: 12px; 
          ">
            ${convertToJapaneseDateRange(dataPoint.x, dataPoint.endDate)}
          </div>
        </div>
  
        <p style="font-weight: 400; font-size: 15px;">
          ${convertFromNumberToJapaneseTime(dataPoint.y).formattedHours}時間
          ${convertFromNumberToJapaneseTime(dataPoint.y).formattedMinutes}分
        </p>
      </div>
    `;

    const { offsetLeft, offsetTop } = context.chart.canvas;
    tooltipEl.style.left = `${offsetLeft + tooltipModel.caretX - 30}px`;
    tooltipEl.style.top = `${offsetTop + tooltipModel.caretY + 10}px`;
    tooltipEl.style.opacity = '1';
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hides the legend
      },
      tooltip: {
        enabled: false, // Disable default tooltip
        external: externalTooltipHandler,
      },
      interaction: {
        mode: 'nearest', // Ensures tooltip appears for the closest point
        intersect: false, // Allows hovering even if not directly on the point
        axis: 'x', // Expands hover detection across the x-axis
      },
      elements: {
        point: {
          radius: 4, // Adjust actual point size
          hitRadius: 20, // Increase hover detection area
          hoverRadius: 8, // Increase the highlight effect
        },
      },
      datalabels: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 5,
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

            return convertToJapaneseMonthDate(labels[index], true);
          },
        },
      },
      y: {
        position: 'right',
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

  const { statisticTaskDurationsList } = useStatisticTaskDurations({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      tagIds: selectedTags,
    },
  });

  const { statisticTaskDurationsCompareList } =
    useStatisticTaskDurationsCompare({
      filter: {
        fromDate: formatDateToYMD(startDateCompare) || '',
        endDate: formatDateToYMD(`${endDateCompare}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId: Number(selectedLarge?.value),
        mediumCategoryId: Number(selectedMedium?.value),
        tagIds: selectedTags,
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

      const finalLabelList: string[] = Array.from(
        new Set([
          ...statisticTaskDurationsList.flatMap((category) =>
            category.durations.map((duration) => duration.startDate),
          ),
          ...statisticTaskDurationsCompareList.flatMap((category) =>
            category.durations.map((duration) => duration.startDate),
          ),
        ]),
      ).sort((a, b) => a.localeCompare(b));

      const generateDataWithAlignment = (durations: any[], type: string) => {
        return finalLabelList
          .map((label) => {
            const foundDuration = durations.find(
              (duration) => duration.startDate === label,
            );
            return foundDuration
              ? {
                  x: foundDuration.startDate,
                  y: convertTimeToDecimal(foundDuration.duration) ?? 0,
                  endDate: foundDuration.endDate,
                  type: type,
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
            if (!selectedLarge?.value) {
              percent =
                statisticCategoryList?.largeCategories.find(
                  (category) =>
                    category.categoryName == categoryDetail.categoryName,
                )?.percent || 0;
            } else if (!selectedMedium?.value) {
              percent = statisticCategoryList?.mediumCategories
                ? statisticCategoryList?.mediumCategories.find(
                    (category) =>
                      category.categoryName == categoryDetail.categoryName,
                  )?.percent || 0
                : 0;
            } else {
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
            datasets = [
              ...datasets,
              {
                label: categoryDetail.categoryName,
                data: generateDataWithAlignment(
                  categoryDetail.durations,
                  'standard',
                ),
                borderColor:
                  categoryDetail.categoryColor ||
                  (color && lightenColor(color, percent)) ||
                  getRandomColor(),
                backgroundColor: 'transparent',
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
            if (!selectedLarge?.value) {
              percent =
                statisticCategoryCompareList?.largeCategories.find(
                  (category) =>
                    category.categoryName == categoryDetail.categoryName,
                )?.percent || 0;
            } else if (!selectedMedium?.value) {
              percent = statisticCategoryCompareList?.mediumCategories
                ? statisticCategoryCompareList?.mediumCategories.find(
                    (category) =>
                      category.categoryName == categoryDetail.categoryName,
                  )?.percent || 0
                : 0;
            } else {
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
            datasets.push({
              label: categoryDetail.categoryName,
              data: generateDataWithAlignment(
                categoryDetail.durations,
                'compare',
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
      setLineChartData({
        labels: finalLabelList,
        datasets: datasets || [],
      });

      setTableData(mergeCategories(tableDetail) || []);
      if (
        selectedOrganization?.value &&
        !selectedLarge?.value &&
        !selectedMedium?.value
      ) {
        setTotalStandardDuration(totalDurationLarge);
        setTotalCompareDuration(totalDurationLargeCompare);
      } else if (
        selectedOrganization?.value &&
        selectedLarge?.value &&
        !selectedMedium?.value
      ) {
        setTotalStandardDuration(totalDurationMedium);
        setTotalCompareDuration(totalDurationMediumCompare);
      } else if (
        selectedOrganization?.value &&
        selectedLarge?.value &&
        selectedMedium?.value
      ) {
        setTotalStandardDuration(totalDurationSmall);
        setTotalCompareDuration(totalDurationSmallCompare);
      }
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
              className={`w-[18px] h-4 min-w-[18px] rounded-[3px] flex items-center justify-center mt-1`}>
              <ImageRound
                name="Check task"
                src={'/icons/check-task.svg'}
                className="w-[10px] h-2"
              />
            </div>
            <div className="flex flex-col gap-2 w-[calc(100%_-20px)]">
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
            onClick={column.getToggleSortingHandler()}>
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
      cell: (info) => {
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="h-[22px]"></div>
            <div className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              <p>
                {info.row.original.standardInfo?.categoryDuration.split(
                  ':',
                )[0] || 0}
                時間
              </p>
              <p>
                {info.row.original.standardInfo?.categoryDuration.split(
                  ':',
                )[1] || 0}
                分
              </p>
            </div>
            <div className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              <p>
                {info.row.original.compareInfo?.categoryDuration.split(
                  ':',
                )[0] || 0}
                時間
              </p>
              <p>
                {info.row.original.compareInfo?.categoryDuration.split(
                  ':',
                )[1] || 0}
                分
              </p>
            </div>
            <div className="font-medium flex text-[14px] justify-center text-black">
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
          <div className="flex flex-col gap-2 w-full">
            <div className="h-[22px]"></div>
            <p className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              {standardPercent}%
            </p>
            <p className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              {comparePercent}%
            </p>
            <p className="font-medium flex text-[14px] justify-center text-black">
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
            <span className="text-black font-semibold text-[18px] relative top-[2px]">
              期間における時間の推移
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[240px]  relative">
              <MultiSelectDropdown
                isShowIconFilter
                options={tagsOptions}
                labelOptionClass="break-all"
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
            <div className="relative right-[224px] top-0">
              <div className="flex gap-2 ">
                {selectedTags.map((item) => {
                  return (
                    <div
                      key={item.value}
                      className="min-w-[66px] w-fit  h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                      <span className="min-w-[32px]  truncate">
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
          <div className="mt-5">
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
                      合計 {totalStandardDuration?.split(':')[0]}時間
                      {totalStandardDuration?.split(':')[1]}分
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
                      合計 {totalCompareDuration?.split(':')[0]}時間
                      {totalCompareDuration?.split(':')[1]}分
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Dropdown
                  options={viewOptions}
                  selectedOption={viewOptions.find(
                    (element) => element.value === viewBy?.value,
                  )}
                  className="h-[34px] !w-[54px] !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                  classNameTextData="!text-xs"
                  classActive="!text-sm"
                  classNameOption="!text-sm !w-[54px] !border-[#77858F] !ring-[#77858F] !ring-opacity-100"
                  labelOptionClass="!text-sm font-medium !pl-0.5 !border-b-[1px] !border-[#EBF1F7]"
                  onChange={(e) => {
                    setViewBy({
                      label: e.label,
                      value: e.value,
                    });
                  }}
                  disabled={true}
                />
              </div>
            </div>
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line data={lineChartData} options={options} />
              <div
                ref={tooltipRef}
                style={{ position: 'absolute', opacity: 0 }}
              />
            </div>
            <div className="flex gap-8 items-center justify-end mb-3">
              <p className="bg-[#EBF1F7] w-[30px] h-[18px] text-[#0068B6] rounded-sm text-xs font-medium flex items-center justify-center">
                基準
              </p>
              {standardLabelsInfo.map((label, index) => {
                return (
                  <div key={index} className="flex gap-1 items-center">
                    <div
                      className="w-8 h-1"
                      style={{ backgroundColor: label.color }}></div>
                    <p className="font-medium text-[#77858F] text-xs">
                      {label.name}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-8 items-center justify-end">
              <p className="bg-[#F9EAEA] w-[30px] h-[18px] text-[#C32E2E] rounded-sm text-xs font-medium flex items-center justify-center">
                比較
              </p>
              {comparedLabelsInfo.map((label, index) => {
                return (
                  <div key={index} className="flex gap-1 items-center">
                    <div
                      className="w-8 h-1 border-t-2 border-dashed"
                      style={{ borderColor: label.color }}></div>
                    <p className="font-medium text-[#77858F] text-xs">
                      {label.name}
                    </p>
                  </div>
                );
              })}
            </div>
            <table className="w-full border border-gray-300 mt-3 rounded-md">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="text-[#77858F] bg-[#F8FAFC] font-medium text-xs text-left">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-2 py-2.5 cursor-pointer border"
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
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          maxWidth: cell.column.getSize(),
                        }}
                        className="px-2 py-3 border">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
export default LineChartCompare;
