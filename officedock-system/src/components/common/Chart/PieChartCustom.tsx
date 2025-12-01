'use client';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { useEffect, useRef, useState } from 'react';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { OptionDropdownType } from '@interfaces/common';
import { StatisticCategoryInfo } from '@interfaces/statistic';
import ModalCustomTooltip from '@components/tooltip/ModalCustomTooltip';
// Custom plugin draws 2 lines of text (label + %)
const TwoLineLabelPlugin = {
  id: 'twoLineLabelPlugin',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;

    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;

    const labels = chart.data?.labels || [];
    const dataset = chart.data?.datasets?.[0];
    if (!dataset || !dataset.data) return;

    const values = dataset.data as number[];

    ctx.save();

    meta.data.forEach((arc: any, index: number) => {
      const value = values[index];
      if (!value && value !== 0) return;

      const rawLabel = labels?.[index] || '';
      const maxLength = 10;
      const label =
        rawLabel.length > maxLength
          ? rawLabel.substring(0, maxLength) + '...'
          : rawLabel;

      if (!arc || !arc.tooltipPosition) return;
      const pos = arc.tooltipPosition();
      if (!pos) return;

      const x = pos.x;
      const y = pos.y;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';

      // ✦ 1) ONLY SHOW LABEL IF value >= 20
      if (value >= 20) {
        ctx.font = '14px "Noto Sans JP", sans-serif';
        ctx.fillText(label, x, y - 16);
      }

      // ✦ 2) Value 24px
      ctx.font = '400 24px "Noto Sans JP", sans-serif';
      const valueText = `${value}`;
      const valueWidth = ctx.measureText(valueText).width;

      // ✦ 3) Percent symbol % (14px)
      ctx.font = '14px "Noto Sans JP", sans-serif';
      const percentWidth = ctx.measureText('%').width;

      const totalWidth = valueWidth + percentWidth;
      const startX = x - totalWidth / 2;

      // Value (big)
      ctx.font = '400 24px "Noto Sans JP", sans-serif';
      ctx.fillText(valueText, startX + valueWidth / 2, y + 8);

      // Percent symbol (small)
      ctx.font = '14px "Noto Sans JP", sans-serif';
      ctx.fillText('%', startX + valueWidth + percentWidth / 2, y + 10);
    });

    ctx.restore();
  },
};

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface PieChartProps {
  isTeam?: boolean;
  data: number[];
  isClickTooltip?: boolean;
  labels: string[];
  colors?: string[];
  actualValues: string[];
  className?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  isLast?: boolean;
  hasHover?: boolean;
  optionsData?: {
    label: string;
    percent?: number;
    avatarColor?: string;
    mergedItems?: StatisticCategoryInfo[];
  }[][];
  isAllTeamOption?: boolean;
  listIdData?: (string | number)[];
  mergedItems: StatisticCategoryInfo[];
  dataOrganization?: string[];
  onActionHover?: () => void;
  handleClickTooltip?: (id: number | null, organizationId?: string) => void;
  handleClickChart?: (data: OptionDropdownType) => void;
  isGradient?: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  value: number;
}

const PieChartCustom = ({
  data,
  labels,
  colors,
  mergedItems,
  className,
  actualValues,
  isClickTooltip = false,
  showLegend = false,
  isTeam = false,
  isLast = false,
  optionsData,
  listIdData,
  dataOrganization,
  isAllTeamOption = false,
  hasHover,
  onActionHover,
  handleClickChart,
  handleClickTooltip,
  isGradient = true,
}: PieChartProps) => {
  const defaultColors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
  ];
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const filteredData = data.reduce<
    { value: number; label: string; color?: string }[]
  >((acc, value, index) => {
    if (value > 0) {
      acc.push({
        value,
        label: labels[index],
        color: colors?.[index],
      });
    }
    return acc;
  }, []);
  const chartRef = useRef<any>(null);

  const makeGradientColor = (
    ctx: CanvasRenderingContext2D,
    color: string,
  ): CanvasGradient => {
    const { width, height } = ctx.canvas;
    const r0 = 0; // inner radius
    const r1 = Math.max(width, height) / 2; // outer radius
    const [cx, cy] = [width / 2, height / 2];

    const baseMatch = color.match(/#([0-9a-f]{6})/i);
    let r = 0,
      g = 0,
      b = 0;
    if (baseMatch) {
      const hex = baseMatch[1];
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }

    const gradient = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},1)`);

    return gradient;
  };

  const ctx = chartRef.current?.ctx;

  const chartData: ChartData<'pie', number[], string> = {
    labels: filteredData.map((item) => item.label),
    datasets: [
      {
        data,
        backgroundColor:
          isGradient && ctx
            ? (colors || defaultColors).map((c) => makeGradientColor(ctx, c))
            : colors || defaultColors,
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  };

  useEffect(() => {
    if (!chartRef.current) return;
    if (!isGradient) return;

    const chartInstance = chartRef.current;
    const ctx = chartInstance.ctx;

    if (ctx) {
      chartInstance.data.datasets[0].backgroundColor = (
        colors || defaultColors
      ).map((c) => makeGradientColor(ctx, c));
      chartInstance.update();
    }
  }, [chartRef.current, isGradient]);

  const options: ChartOptions<'pie'> = {
    plugins: {
      legend: {
        display: showLegend,
      },
      tooltip: {
        enabled: false,
        external: (context: any) => {
          const { tooltip } = context;
          if (tooltip.opacity === 0 && !isHovered) {
            return;
          }
          const dataIndex = tooltip.dataPoints[0]?.dataIndex;
          const tooltipX =
            tooltip.caretX + isLast ? tooltip.caretX - 90 : tooltip.caretX + 10;
          const tooltipY = tooltip.caretY - 20;
          if (!tooltipData || tooltipData?.value !== dataIndex) {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setIsHovered(false);
            setTooltipData(null);

            setTimeout(() => {
              setIsHovered(true);
              setTooltipData({
                x: tooltipX,
                y: tooltipY,
                value: dataIndex as number,
              });
            }, 0);
          }
        },
      },
      datalabels: {
        display: false,
      },
    },
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current || !isClickTooltip) return;
    const chart = chartRef.current;
    const points = chart.getElementsAtEventForMode(
      event.nativeEvent,
      'nearest',
      { intersect: true },
      true,
    );
    if (points.length) {
      const firstPoint = points[0];
      const dataIndex = firstPoint.index;
      const label = chartData.labels?.[dataIndex] || 'Unknown';
      const optionsId =
        listIdData && listIdData.length > 0 ? listIdData[dataIndex] : '';
      if (optionsId !== -1) {
        handleClickChart?.({
          label: label,
          value: optionsId || '',
        });
      }
    }
  };

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (hasHover) {
      setTooltipData(null);
    }
  }, [hasHover]);

  return (
    <div
      onClick={(e: any) => {
        handleClick(e);
      }}
      className={`w-96 relative rounded-full h-96 my-0 mx-auto ${className}`}>
      <Pie
        ref={chartRef}
        onMouseLeave={() => {
          hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
            setTooltipData(null);
          }, 1000);
        }}
        onMouseEnter={() => {
          onActionHover && onActionHover();

          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        }}
        data={chartData}
        options={options}
        plugins={[TwoLineLabelPlugin]}
      />
      {tooltipData && (
        <div
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            setIsHovered(true);
          }}
          style={{
            position: 'absolute',
            top: 10,
            backgroundColor: 'white',
            borderRadius: '14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            zIndex: 20,
            ...(isLast ? { right: `100%` } : { left: `100%` }),
          }}>
          <ModalCustomTooltip
            onMouseEnter={() => {
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={(e) => {
              const nextEl = e.relatedTarget as HTMLElement | null;
              const chart = chartRef.current;
              if (!chart) return;

              const canvas = chart.canvas as HTMLCanvasElement;
              const rect = canvas.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;

              // Get the actual center and radius of the chart
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const outerRadius =
                chart._metasets?.[0]?.data?.[0]?.outerRadius ||
                Math.min(centerX, centerY);

              // Calculate the distance from the center to the cursor
              const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2),
              );

              // If the mouse is still in the circle → DO NOT hide
              if (distance <= outerRadius) {
                return;
              }

              // If the mouse is still in the tooltip or chart → DO NOT hide
              if (
                nextEl &&
                (canvas.contains(nextEl) || nextEl.closest('.tooltip-wrapper'))
              ) {
                return;
              }

              // Exit the entire area → Hide tooltip
              hoverTimeoutRef.current = setTimeout(() => {
                setIsHovered(false);
                setTooltipData(null);
              }, 1000);
            }}
            isTeam={isTeam && !isAllTeamOption}
            tooltipData={tooltipData}
            colors={colors || []}
            actualValues={actualValues}
            labels={labels}
            optionsData={optionsData || []}
            data={data}
            mergedItems={mergedItems}
            listIdData={listIdData || []}
            isAllTeamOption={isAllTeamOption}
            dataOrganization={dataOrganization}
            handleClickTooltip={handleClickTooltip}
          />
        </div>
      )}
    </div>
  );
};

export default PieChartCustom;
