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
import { StatisticsCategories } from '@interfaces/statistic';
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
} from '@utils/date';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { getRandomColor, lightenColor } from '@utils';
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
    listOptionsOrganization,
    largeOptions,
    mediumOptions,
    selectedLarge,
    selectedMedium,
    selectedOrganization,
    selectedTags,
    tagsOptions,
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
  const [tableData, setTableData] = useState<
    {
      categoryId: number;
      categoryName: string;
      categoryDuration: string;
      categoryPercent: string;
      categoryColor: string;
    }[]
  >([]);
  const [totalDuration, setTotalDuration] = useState<string>('00:00');
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

    const dataPoint = tooltipModel.dataPoints[0]?.raw;
    if (!dataPoint) {
      tooltipEl.style.opacity = '0';
      return;
    }

    // Extract dataset label safely
    const datasetLabel = dataset.label ?? 'Unknown';

    tooltipEl.innerHTML = `
      <div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0px 2px 8px 0px #0000001A;">
        <div style="color: #77858F; font-weight: 400; font-size: 14px; margin-bottom: 8px">
          ${convertToJapaneseDateRange(dataPoint.x, dataPoint.endDate)}
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <div style="background-color: ${dataset.borderColor}; margin-right: 4px; width: 12px; height: 12px; border-radius: 2px"></div>
          <p style="font-weight: 700; font-size: 16px">${datasetLabel}</p>
        </div>
        <p style="font-weight: 400; font-size: 16px">
          ${convertFromNumberToJapaneseTime(dataPoint.y).formattedHours}時間
          ${convertFromNumberToJapaneseTime(dataPoint.y).formattedMinutes}分
        </p>
      </div>
    `;

    const { offsetLeft, offsetTop } = context.chart.canvas;
    tooltipEl.style.left = `${offsetLeft + tooltipModel.caretX + 10}px`;
    tooltipEl.style.top = `${offsetTop + tooltipModel.caretY}px`;
    tooltipEl.style.opacity = '1';
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'end',
        labels: {
          usePointStyle: false,
          boxWidth: 30,
          boxHeight: 2,
          color: '#77858F',
          generateLabels: (chart: any) => {
            try {
              if (!chart || !chart.data || !chart.data.datasets) return [];
              return chart.data.datasets.map((dataset: any, index: any) => ({
                text: `${dataset.label}`,
                fillStyle: dataset.borderColor,
                strokeStyle: dataset.borderColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(index),
              }));
            } catch (error) {
              return [];
            }
          },
        },
        onClick: (_e: any, legendItem: any, legend: any) => {
          const chart = legend.chart;
          if (!chart) return;
          const index = legendItem.datasetIndex;
          if (index === undefined) return;
          chart.getDatasetMeta(index).hidden =
            !chart.getDatasetMeta(index).hidden;
          chart.update();
        },
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

            const isEdge = index === 0 || index === labels.length - 1;

            // Add extra spaces to reduce gap for first & last labels
            return isEdge
              ? `\xa0\xa0${convertToJapaneseMonthDate(labels[index], true)}\xa0\xa0`
              : convertToJapaneseMonthDate(labels[index], false);
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

  useEffect(() => {
    if (statisticTaskDurationsList) {
      const color =
        statisticCategoryList?.largeCategories?.find(
          (item) => item.categoryId === selectedLarge?.value,
        )?.categoryColor || '';

      let labelList: string[] = [];
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
                y: convertTimeToDecimal(duration.duration) ?? 0,
                endDate: duration.endDate,
              },
              ...(index === categoryDetail.durations.length - 1 &&
              String(duration.endDate) != String(duration.startDate)
                ? [
                    {
                      x: duration.endDate,
                      y: convertTimeToDecimal(duration.duration) ?? 0,
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
        if(selectedOrganization?.value && !selectedLarge?.value && !selectedMedium?.value){
          setTotalDuration(totalDurationLarge)
        } else if(selectedOrganization?.value && selectedLarge?.value && !selectedMedium?.value){
          setTotalDuration(totalDurationMedium)
        } else if(selectedOrganization?.value && selectedLarge?.value && selectedMedium?.value){
          setTotalDuration(totalDurationSmall)
        }
      } else {
        setLineChartData({
          labels: [],
          datasets: [],
        });
        setTableData([]);
        setTotalDuration('00:00');
      }
    }
  }, [statisticTaskDurationsList, statisticCategoryList, selectedOrganization, selectedLarge, selectedMedium, totalDurationLarge, totalDurationMedium, totalDurationSmall]);

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
      size: 30,
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
            className="flex gap-1 items-center justify-center"
            onClick={column.getToggleSortingHandler()}>
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
    getSortedRowModel: getSortedRowModel(),
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
                      className="min-w-[66px] w-fit max-w-[118px] h-6 px-[10px] bg-[#77858F] justify-between gap-[6px] text-xs text-white font-medium flex items-center truncate rounded-[20px] ">
                      <span className="min-w-[32px] max-w-[80px] truncate">
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
            <div className="flex gap-[35px] justify-center px-[30px] text-sm font-medium">
              {/* Column Chart 1 */}
              <div className="w-full flex flex-col items-center">
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
              <div className="w-full flex flex-col items-center">
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
              <div className="w-full flex flex-col items-center">
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
export default LineChart;
