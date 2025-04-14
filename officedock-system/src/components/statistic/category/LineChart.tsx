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
  useReactTable,
} from '@tanstack/react-table';

import ImageRound from '@components/common/ImageRound';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Dropdown from '@components/common/Dropdown';

import { StatisticStateContext } from '@providers/StatisticProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import { StatisticsCategories } from '@interfaces/statistic';
import { OptionDropdownType } from '@interfaces/common';

import { StatisticViewLabels, StatisticViewOptions } from '@constants/enums';
import useStatisticTaskDurations from '@hooks/useStatisticTaskDurations';

import {
  convertFromNumberToJapaneseTime,
  convertTimeToDecimal,
  convertToJapaneseDateRange,
  convertToStatisticJapaneseLabels,
  formatDateToYMD,
} from '@utils/date';
import { getLineChartEnableViews, getRandomColor, lightenColor } from '@utils';
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
  removeTag: (selected: OptionDropdownType) => void;
  statisticCategoryList: StatisticsCategories | undefined;
  handleSelectOrganization: (data: OptionDropdownType) => void;
  handleSelectLarge: (data: OptionDropdownType) => void;
  handleSelectMedium: (data: OptionDropdownType) => void;
};

const LineChart = ({
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
  const [tableData, setTableData] = useState<
    {
      categoryId: number;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[]
  >([]);
  const [standardLabelsInfo, setStandardLabelsInfo] = useState<
    {
      color: string;
      name: string;
    }[]
  >([]);
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

    // Hide tooltip for the last data point
    if (dataIndex === dataset.data.length - 1) {
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

    // Extract dataset label safely
    const datasetLabel = dataset.label ?? 'Unknown';

    tooltipEl.innerHTML = `
      <div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0px 2px 8px 0px #0000001A; width: 220px">
        <div style="color: #77858F; font-weight: 400; font-size: 14px; margin-bottom: 8px">
          ${convertToJapaneseDateRange(dataPoint.x, dataPoint.endDate)}
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <div style="background-color: ${dataset.borderColor}; margin-right: 4px; width: 12px; height: 12px; border-radius: 2px; min-width: 12px;"></div>
          <p style="font-weight: 700; font-size: 16px; max-width: 200px;
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis;">${datasetLabel}</p>
        </div>
        <p style="font-weight: 400; font-size: 16px">
          ${convertFromNumberToJapaneseTime(dataPoint.y).formattedHours}時間
          ${convertFromNumberToJapaneseTime(dataPoint.y).formattedMinutes}分
        </p>
      </div>
    `;

    const { offsetLeft, offsetTop } = context.chart.canvas;
    tooltipEl.style.left = `${offsetLeft + tooltipModel.caretX - 60}px`;
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

  useEffect(() => {
    if (statisticTaskDurationsList) {
      const color =
        statisticCategoryList?.largeCategories?.find(
          (item) => item.categoryId === selectedLarge?.value,
        )?.categoryColor || '';

      let labelList: string[] = [];
      let standardLabels: { name: string; color: string }[] = [];
      const datasets: any[] = [];
      const tableDetail: {
        categoryId: number;
        categoryName: string;
        categoryDuration: string;
        categoryPercent: string;
        categoryColor: string;
      }[] = [];

      if (statisticTaskDurationsList.length > 0) {
        statisticTaskDurationsList.forEach((categoryDetail, index) => {
          labelList = categoryDetail.durations.map(
            (duration) => duration.startDate,
          );
          if (
            index === statisticTaskDurationsList.length - 1 &&
            String(categoryDetail.durations.at(-1)?.endDate) !=
              String(categoryDetail.durations.at(-1)?.startDate)
          ) {
            const endDate = categoryDetail.durations.at(-1)?.endDate;
            if (endDate) {
              labelList.push(endDate);
            }
          }

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

          standardLabels = [
            ...standardLabels,
            {
              color:
                categoryDetail.categoryColor ||
                (color && lightenColor(color, percent)) ||
                getRandomColor(),
              name: categoryDetail.categoryName,
            },
          ];

          tableDetail.push({
            categoryId: categoryDetail.categoryId,
            categoryName: categoryDetail.categoryName,
            categoryDuration: categoryDetail.duration,
            categoryPercent: String(percent),
            categoryColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, percent)) ||
              getRandomColor(),
          });
          datasets.push({
            label: categoryDetail.categoryName,
            data: categoryDetail.durations.flatMap((duration, index) => [
              {
                x: duration.startDate,
                y: duration.duration
                  ? convertTimeToDecimal(duration.duration)
                  : 0,
                endDate: duration.endDate,
              },
              ...(index === categoryDetail.durations.length - 1 &&
              String(duration.endDate) != String(duration.startDate)
                ? [
                    {
                      x: duration.endDate,
                      y: duration.duration
                        ? convertTimeToDecimal(duration.duration)
                        : 0,
                      endDate: duration.endDate,
                    },
                  ]
                : []),
            ]),
            borderColor:
              categoryDetail.categoryColor ||
              (color && lightenColor(color, percent)) ||
              getRandomColor(),
            backgroundColor: 'rgba(217, 83, 79, 0.04)',
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
        });

        setLineChartData({
          labels: labelList,
          datasets,
        });
        setTableData(tableDetail);
        setStandardLabelsInfo(standardLabels);
      } else {
        setLineChartData({
          labels: [],
          datasets: [],
        });
        setTableData([]);
        setStandardLabelsInfo([]);
      }
    }
  }, [
    statisticTaskDurationsList,
    statisticCategoryList,
    selectedOrganization,
    selectedLarge,
    selectedMedium,
    totalDurationLarge,
    totalDurationMedium,
    totalDurationSmall,
  ]);

  const numericSorting = (rowA: any, rowB: any, columnId: any) => {
    const a = Number(rowA.getValue(columnId)) || 0;
    const b = Number(rowB.getValue(columnId)) || 0;
    return a - b;
  };

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
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div
            className="flex gap-1 items-center justify-center cursor-pointer"
            onClick={column.getToggleSortingHandler()}>
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
      sortingFn: numericSorting,
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
    getSortedRowModel: getSortedRowModel(),
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
            <span className="text-black w-[210px] flex-shrink-0  font-semibold text-[18px] relative top-[2px]">
              期間における時間の推移
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
          {!isFetchedStatisticTaskDurationsList ? (
            <RowSkeleton
              numberOfRows={1}
              className={`!h-[395px] ${expanded && 'w-[calc(100%_-_60px)]'} mx-auto`}
            />
          ) : (
            <div
              style={{ position: 'relative' }}
              className={`h-[380px] ${expanded && 'w-[calc(100%_-_10px)]'}`}>
              <Line data={lineChartData} options={options} />
              <div
                ref={tooltipRef}
                style={{ position: 'absolute', opacity: 0 }}
              />
            </div>
          )}

          <div className="px-[30px]">
            {isFetchedStatisticTaskDurationsList && (
              <div className="flex gap-8 items-center justify-end flex-wrap">
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
            )}

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
export default LineChart;
