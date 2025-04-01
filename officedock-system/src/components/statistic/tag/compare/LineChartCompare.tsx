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
import {
  StatisticsCategories,
  StatisticsTagTaskDuration,
} from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';
import Dropdown from '@components/common/Dropdown';
import { CalendarViewOptions } from '@constants/enums';
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
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { StatisticTagStateContext } from '@providers/StatisticProviderTag';
import useStatisticTagTaskDurations from '@hooks/useStatisticTagTaskDurations';
import useStatisticTagTaskDurationsCompare from '@hooks/useStatisticTagTaskDurationsCompare';

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
  statisticTagsList: StatisticsCategories | undefined;
  statisticTagsCompareList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
  handleSelectSmall: (data: OptionDropdownType) => void;
};

type TableCategoryItem = {
  tagId: number | null;
  tagName: string;
  tagDuration: string;
  tagPercent: string;
  tagColor: string;
  type: 'standard' | 'compare';
};

type MergedTableCategory = {
  tagId: number | null;
  tagName: string;
  tagColor: string;
  standardInfo?: {
    tagDuration: string;
    tagPercent: string;
  };
  compareInfo?: {
    tagDuration: string;
    tagPercent: string;
  };
};

const LineChartCompare = ({
  statisticTagsList,
  statisticTagsCompareList,
  startDate,
  endDate,
  startDateCompare,
  endDateCompare,
  removeTag,
  handleSelectOrganization,
  handleSelectLarge,
  handleSelectMedium,
  handleSelectSmall,
}: Props) => {
  const {
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    smallOptions,
    selectedLarge,
    selectedMedium,
    selectedSmall,
    selectedOrganization,
    selectedTags,
    tagsOptions,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationCategory,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationCategoryCompare,
    setSelectedTags,
  } = useContext(StatisticTagStateContext);

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

    const matchingDataPoints = lineChartData.datasets
      .flatMap((d) => d.data)
      .filter(
        (point: any) => point.x === dataPoint.x && point.y === dataPoint.y,
      )
      .reduce((acc: Record<string, any[]>, point: any) => {
        if (!acc[point.label]) {
          acc[point.label] = [];
        }
        acc[point.label].push(point); // Store both 'standard' and 'compare' types
        return acc;
      }, {});

    const uniqueDataPoints = Object.values(matchingDataPoints).flat(); // Flatten the grouped values

    const groupedData = uniqueDataPoints.reduce(
      (acc: Record<string, any[]>, point: any) => {
        if (!acc[point.label]) {
          acc[point.label] = [];
        }
        acc[point.label].push(point);
        return acc;
      },
      {},
    );

    const tooltipContent = Object.entries(groupedData)
      .map(([label, points]) => {
        const firstPoint = points[0]; // Get the first point to display color and label only once
        return `
            <div style="
              display: flex; 
              align-items: center; 
              margin-bottom: 8px; 
              border-bottom: 1px solid #D2DBE1;
            ">
              <div style="
                background-color: ${firstPoint.color}; 
                margin-right: 4px; 
                width: 12px; 
                height: 12px; 
                border-radius: 2px;
              "></div>
              <p style="font-weight: 700; font-size: 16px; max-width: 200px;
                white-space: nowrap; 
                overflow: hidden; 
                text-overflow: ellipsis;">${label}</p>
            </div>  
      
            ${points
              .map(
                (point) => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <p style="
                  background-color: ${point.type === 'standard' ? '#EBF1F7' : '#F9EAEA'};
                  color: ${point.type === 'standard' ? '#0068B6' : '#C32E2E'};
                  height: 18px; 
                  width: 57px; 
                  border-radius: 3px; 
                  font-size: 12px; 
                  font-weight: 500; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center;
                ">
                  ${point.type === 'standard' ? '基準期間' : '比較期間'}
                </p>
                <div style="color: #77858F; font-weight: 400; font-size: 12px;">
                  ${convertToJapaneseDateRange(point.x, point.endDate)}
                </div>
              </div>
              <p style="font-weight: 400; font-size: 15px; margin-bottom: 8px;">
                ${convertFromNumberToJapaneseTime(point.y).formattedHours}時間
                ${convertFromNumberToJapaneseTime(point.y).formattedMinutes}分
              </p>
            `,
              )
              .join('')}
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
    tooltipEl.style.left = `${offsetLeft + tooltipModel.caretX - 70}px`;
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

  const { statisticTagTaskDurationsList } = useStatisticTagTaskDurations({
    filter: {
      fromDate: formatDateToYMD(startDate) || '',
      endDate: formatDateToYMD(`${endDate}`) || '',
      organizationIds: String(selectedOrganization?.value || ''),
      largeCategoryId: Number(selectedLarge?.value),
      mediumCategoryId: Number(selectedMedium?.value),
      smallCategoryId: Number(selectedSmall?.value),
      tagIds: selectedTags,
    },
  });

  const { statisticTagTaskDurationsCompareList } =
    useStatisticTagTaskDurationsCompare({
      filter: {
        fromDate: formatDateToYMD(startDateCompare) || '',
        endDate: formatDateToYMD(`${endDateCompare}`) || '',
        organizationIds: String(selectedOrganization?.value || ''),
        largeCategoryId: Number(selectedLarge?.value),
        mediumCategoryId: Number(selectedMedium?.value),
        smallCategoryId: Number(selectedSmall?.value),
        tagIds: selectedTags,
      },
    });

  const mergeCategories = (
    data: TableCategoryItem[],
  ): MergedTableCategory[] => {
    const grouped: Record<string, MergedTableCategory> = {};

    data.forEach((item) => {
      const key = item.tagId ?? 'null'; // Ensure `null` is treated as a string key

      if (!grouped[key]) {
        grouped[key] = {
          tagId: item.tagId,
          tagName: item.tagName,
          tagColor: item.tagColor,
        };
      }

      if (item.type === 'standard') {
        grouped[key].standardInfo = {
          tagDuration: item.tagDuration,
          tagPercent: item.tagPercent,
        };
      } else if (item.type === 'compare') {
        grouped[key].compareInfo = {
          tagDuration: item.tagDuration,
          tagPercent: item.tagPercent,
        };
      }
    });

    return Object.values(grouped);
  };

  useEffect(() => {
    if (statisticTagTaskDurationsList && statisticTagTaskDurationsCompareList) {
      let datasets: any[] = [];
      let standardLabels: { name: string; color: string }[] = [];
      let comparedLabels: { name: string; color: string }[] = [];
      let tableDetail: TableCategoryItem[] = [];

      const finalLabelList: string[] = Array.from(
        new Set([
          ...statisticTagTaskDurationsList.flatMap((category) =>
            category.durations.flatMap((duration, index) =>
              index === category.durations.length - 1 &&
              String(category.durations.at(-1)?.endDate) !==
                String(category.durations.at(-1)?.startDate)
                ? [duration.startDate, duration.endDate]
                : duration.startDate,
            ),
          ),
          ...statisticTagTaskDurationsCompareList.flatMap((category) =>
            category.durations.flatMap((duration, index) =>
              index === category.durations.length - 1 &&
              String(category.durations.at(-1)?.endDate) !==
                String(category.durations.at(-1)?.startDate)
                ? [duration.startDate, duration.endDate]
                : duration.startDate,
            ),
          ),
        ]),
      ).sort((a, b) => a.localeCompare(b));

      const generateDataWithAlignment = (
        durations: any[],
        type: string,
        name: string,
        color: string,
      ) => {
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
                  label: name,
                  color: color,
                }
              : null;
          })
          .filter((dataPoint) => dataPoint !== null);
      };

      if (statisticTagTaskDurationsList.length > 0) {
        statisticTagTaskDurationsList.map(
          (categoryDetail: StatisticsTagTaskDuration) => {
            standardLabels = [
              ...standardLabels,
              {
                color: lightenColor('#2E9267', 50) || getRandomColor(),
                name: categoryDetail.tagName,
              },
            ];

            let percent = 0;
            if (!selectedLarge?.value) {
              percent =
                statisticTagsList?.largeCategories.find(
                  (category) => category.tagName == categoryDetail.tagName,
                )?.percent || 0;
            } else if (!selectedMedium?.value) {
              percent = statisticTagsList?.mediumCategories
                ? statisticTagsList?.mediumCategories.find(
                    (category) => category.tagName == categoryDetail.tagName,
                  )?.percent || 0
                : 0;
            } else {
              percent = statisticTagsList?.smallCategories
                ? statisticTagsList?.smallCategories.find(
                    (category) => category.tagName == categoryDetail.tagName,
                  )?.percent || 0
                : 0;
            }

            tableDetail = [
              ...tableDetail,
              {
                tagId: categoryDetail.tagId,
                tagName: categoryDetail.tagName,
                tagDuration: categoryDetail.duration,
                tagPercent: String(percent),
                tagColor:
                  lightenColor('#2E9267' as string, percent) ||
                  getRandomColor(),
                type: 'standard',
              },
            ];
            datasets = [
              ...datasets,
              {
                label: categoryDetail.tagName,
                data: generateDataWithAlignment(
                  categoryDetail.durations,
                  'standard',
                  categoryDetail.tagName,
                  lightenColor('#2E9267' as string, percent) ||
                    getRandomColor(),
                ),
                borderColor:
                  lightenColor('#2E9267' as string, percent) ||
                  getRandomColor(),
                backgroundColor: 'transparent',
                fill: true,
                tension: 0,
                pointRadius: 4,
                pointBorderColor: 'transparent',
                pointHoverRadius: 6,
                pointHoverBackgroundColor:
                  lightenColor('#2E9267' as string, percent) ||
                  getRandomColor(),
                pointHoverBorderColor: 'transparent',
                pointHoverBorderWidth: 2,
              },
            ];
          },
        );
      }
      if (statisticTagTaskDurationsCompareList.length > 0) {
        statisticTagTaskDurationsCompareList.map(
          (categoryDetail: StatisticsTagTaskDuration) => {
            let percent = 0;
            if (!selectedLarge?.value) {
              percent =
                statisticTagsCompareList?.largeCategories.find(
                  (category) => category.tagName == categoryDetail.tagName,
                )?.percent || 0;
            } else if (!selectedMedium?.value) {
              percent = statisticTagsCompareList?.mediumCategories
                ? statisticTagsCompareList?.mediumCategories.find(
                    (category) => category.tagName == categoryDetail.tagName,
                  )?.percent || 0
                : 0;
            } else {
              percent = statisticTagsCompareList?.smallCategories
                ? statisticTagsCompareList?.smallCategories.find(
                    (category) => category.tagName == categoryDetail.tagName,
                  )?.percent || 0
                : 0;
            }

            comparedLabels = [
              ...comparedLabels,
              {
                color:
                  lightenColor('#2E9267' as string, percent) ||
                  getRandomColor(),
                name: categoryDetail.tagName,
              },
            ];

            tableDetail.push({
              tagId: categoryDetail.tagId,
              tagName: categoryDetail.tagName,
              tagDuration: categoryDetail.duration,
              tagPercent: String(percent),
              tagColor:
                lightenColor('#2E9267' as string, percent) || getRandomColor(),
              type: 'compare',
            });
            datasets.push({
              label: categoryDetail.tagName,
              data: generateDataWithAlignment(
                categoryDetail.durations,
                'compare',
                categoryDetail.tagName,
                lightenColor('#2E9267' as string, percent) || getRandomColor(),
              ),
              borderColor:
                lightenColor('#2E9267' as string, percent) || getRandomColor(),
              backgroundColor: 'transparent',
              borderDash: [3, 3],
              fill: true,
              tension: 0,
              pointRadius: 4,
              pointBorderColor: 'transparent',
              pointHoverRadius: 6,
              pointHoverBackgroundColor:
                lightenColor('#2E9267' as string, percent) || getRandomColor(),
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
        !selectedMedium?.value &&
        !selectedSmall?.value
      ) {
        setTotalStandardDuration(totalDurationLarge || '00:00');
        setTotalCompareDuration(totalDurationLargeCompare || '00:00');
      } else if (
        selectedOrganization?.value &&
        selectedLarge?.value &&
        !selectedMedium?.value &&
        !selectedSmall?.value
      ) {
        setTotalStandardDuration(totalDurationMedium || '00:00');
        setTotalCompareDuration(totalDurationMediumCompare || '00:00');
      } else if (
        selectedOrganization?.value &&
        selectedLarge?.value &&
        selectedMedium?.value &&
        !selectedSmall?.value
      ) {
        setTotalStandardDuration(totalDurationSmall || '00:00');
        setTotalCompareDuration(totalDurationSmallCompare || '00:00');
      } else if (
        selectedOrganization?.value &&
        selectedLarge?.value &&
        selectedMedium?.value &&
        selectedSmall?.value
      ) {
        setTotalStandardDuration(totalDurationCategory || '00:00');
        setTotalCompareDuration(totalDurationCategoryCompare || '00:00');
      }
    }
  }, [
    statisticTagTaskDurationsList,
    statisticTagTaskDurationsCompareList,
    statisticTagsList,
    statisticTagsCompareList,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
    selectedSmall,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
    totalDurationCategory,
    totalDurationLargeCompare,
    totalDurationMediumCompare,
    totalDurationSmallCompare,
    totalDurationCategoryCompare,
  ]);

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'tagPercent', desc: true },
  ]);

  const handleSortingChange = (updater: any) => {
    setSorting((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next.length === 0 ? [{ id: 'tagPercent', desc: true }] : next;
    });
  };
  const differenceSorting = (rowA: any, rowB: any) => {
    const standardA = Number(rowA.original.standardInfo?.tagPercent) || 0;
    const compareA = Number(rowA.original.compareInfo?.tagPercent) || 0;
    const differenceA = standardA - compareA;

    const standardB = Number(rowB.original.standardInfo?.tagPercent) || 0;
    const compareB = Number(rowB.original.compareInfo?.tagPercent) || 0;
    const differenceB = standardB - compareB;

    return differenceA - differenceB;
  };

  const durationSorting = (rowA: any, rowB: any) => {
    const parseDuration = (duration: string) => {
      const [hours, minutes, seconds] = duration.split(':').map(Number);
      return hours * 60 + minutes + seconds / 60; // Convert to total minutes
    };

    const standardA = parseDuration(
      rowA.original.standardInfo?.tagDuration || '00:00:00',
    );
    const compareA = parseDuration(
      rowA.original.compareInfo?.tagDuration || '00:00:00',
    );
    const differenceA = standardA - compareA;

    const standardB = parseDuration(
      rowB.original.standardInfo?.tagDuration || '00:00:00',
    );
    const compareB = parseDuration(
      rowB.original.compareInfo?.tagDuration || '00:00:00',
    );
    const differenceB = standardB - compareB;

    return differenceA - differenceB;
  };

  const columns: ColumnDef<MergedTableCategory>[] = [
    {
      accessorKey: 'tagName',
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
              タグ名
            </p>
          </div>
        );
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="flex gap-2 px-3 items-start">
            <div
              style={{ backgroundColor: info.row.original.tagColor }}
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
      accessorKey: 'tagDuration',
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
      sortingFn: durationSorting,
      enableSorting: true,
      cell: (info) => {
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="h-[22px]"></div>
            <div className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              <p>
                {info.row.original.standardInfo?.tagDuration.split(':')[0] || 0}
                時間
              </p>
              <p>
                {info.row.original.standardInfo?.tagDuration.split(':')[1] || 0}
                分
              </p>
            </div>
            <div className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              <p>
                {info.row.original.compareInfo?.tagDuration.split(':')[0] || 0}
                時間
              </p>
              <p>
                {info.row.original.compareInfo?.tagDuration.split(':')[1] || 0}
                分
              </p>
            </div>
            <div className="font-medium flex text-[14px] justify-center text-black">
              <p>
                {subtractDurations(
                  info.row.original.standardInfo?.tagDuration || '00:00:00',
                  info.row.original.compareInfo?.tagDuration || '00:00:00',
                )}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'tagPercent',
      size: 25,
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div
            className="flex gap-1 items-center justify-center"
            onClick={() => column.toggleSorting(isSorted === 'asc')}>
            <p className="!text-xs font-medium !text-[#77858F]">割合</p>
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
      sortingFn: differenceSorting,
      cell: (info) => {
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="h-[22px]"></div>
            <p className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              {info.row.original.standardInfo?.tagPercent || 0}%
            </p>
            <p className="font-medium flex text-[14px] justify-center text-black w-full border-b-[1px] border-[#D2DBE1] pb-1">
              {info.row.original.compareInfo?.tagPercent || 0}%
            </p>
            <p className="font-medium flex text-[14px] justify-center text-black">
              {(Number(info.row.original.standardInfo?.tagPercent) || 0) -
                (Number(info.row.original.compareInfo?.tagPercent) || 0)}
              %
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
              カテゴリーごとのタグの期間における時間の推移
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
                <div className="flex items-center gap-2">
                  <div className="w-[240px]">
                    <MultiSelectDropdown
                      options={tagsOptions}
                      placeholder="集計対象のタグを選択"
                      className="!h-[34px] !py-0 text-sm font-normal !rounded-md"
                      labelOptionClass="break-words w-[190px]"
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
                  </div>
                  <div>
                    <div className="flex gap-2 flex-wrap ">
                      {selectedTags.map((item) => {
                        return (
                          <div
                            key={item.value}
                            className="w-[66px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                            <span className="w-[32px] truncate">
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
                    disabled={!selectedOrganization}
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
                    disabled={!selectedLarge}
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
                    disabled={!selectedMedium}
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
                    <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
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
                    <p className="font-medium text-[#77858F] text-xs truncate max-w-[200px]">
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
