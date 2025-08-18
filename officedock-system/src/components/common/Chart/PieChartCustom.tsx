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
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';

import { OptionDropdownType } from '@interfaces/common';
import { StatisticCategoryInfo } from '@interfaces/statistic';
import ModalCustomTooltip from '@components/tooltip/ModalCustomTooltip';

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
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.7)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0.9)`);

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
            setTooltipData(null);
            return;
          }
          const dataIndex = tooltip.dataPoints[0]?.dataIndex;
          const tooltipX =
            tooltip.caretX + isLast ? tooltip.caretX - 90 : tooltip.caretX + 10;
          const tooltipY = tooltip.caretY - 20;
          if (!tooltipData || tooltipData?.value !== dataIndex) {
            setTooltipData({
              x: tooltipX,
              y: tooltipY,
              value: dataIndex as number,
            });
          }
        },
      },
      datalabels: {
        formatter: (value, context: Context) => {
          if (value < 20) return `${value}%`;
          const label = String(
            context.chart.data.labels?.[context.dataIndex] || '',
          );
          const maxLabelLength = 10;
          const truncatedLabel =
            label.length > maxLabelLength
              ? `${label.substring(0, maxLabelLength)}...`
              : label;
          return `${truncatedLabel}\n${value}%`;
        },
        color: '#fff',
        font: { weight: 'bold', size: 14 },
        align: 'center',
        anchor: 'center',
        textAlign: 'center',
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

  return (
    <div
      onMouseLeave={() => {
        setIsHovered(false);
        setTooltipData(null);
      }}
      onClick={(e: any) => {
        handleClick(e);
      }}
      className={`w-96 relative h-96 my-0 mx-auto ${className}`}>
      <Pie ref={chartRef} data={chartData} options={options} />
      {tooltipData && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setTooltipData(null);
          }}
          style={{
            position: 'absolute',
            top: tooltipData.y,
            left: tooltipData.x,
            backgroundColor: 'white',
            borderRadius: '14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            zIndex: 999,
          }}>
          <ModalCustomTooltip
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
